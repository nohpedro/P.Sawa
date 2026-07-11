from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from inventario.models import InventoryProductSale, InventoryPurchaseBatch

from .models import (
    BalanceHandling,
    BusinessFixedExpense,
    BusinessGoal,
    BusinessGoalConnection,
    BusinessGoalCycle,
    BusinessGoalMovement,
    BusinessGoalNode,
    GoalStatus,
    GoalType,
    MovementType,
    NodeType,
    RenewalFrequency,
)


def current_cycle(goal: BusinessGoal) -> BusinessGoalCycle:
    cycle = goal.cycles.order_by("-numero").first()
    if cycle:
        return cycle

    return BusinessGoalCycle.objects.create(
        goal=goal,
        numero=1,
        fecha_inicio=goal.fecha_inicio,
        fecha_fin=goal.fecha_fin,
        monto_objetivo=goal.monto_objetivo,
        saldo_inicial=goal.recursos_reservados,
        monto_acumulado=goal.recursos_reservados,
        estado=goal.estado,
    )


def sync_cycle_with_goal(goal: BusinessGoal) -> BusinessGoalCycle:
    cycle = current_cycle(goal)
    changed_fields = []

    if cycle.monto_objetivo != goal.monto_objetivo:
        cycle.monto_objetivo = goal.monto_objetivo
        changed_fields.append("monto_objetivo")
    if cycle.fecha_inicio != goal.fecha_inicio:
        cycle.fecha_inicio = goal.fecha_inicio
        changed_fields.append("fecha_inicio")
    if cycle.fecha_fin != goal.fecha_fin:
        cycle.fecha_fin = goal.fecha_fin
        changed_fields.append("fecha_fin")
    if cycle.estado != goal.estado:
        cycle.estado = goal.estado
        changed_fields.append("estado")

    # El saldo inicial solo representa recursos reservados de forma explicita.
    # Una meta nueva debe comenzar en cero cuando no se activa esa opcion avanzada.
    if cycle.numero == 1 and cycle.saldo_inicial != goal.recursos_reservados:
        cycle.saldo_inicial = goal.recursos_reservados
        changed_fields.append("saldo_inicial")

    if changed_fields:
        cycle.save(update_fields=[*changed_fields, "updated_at"])

    return cycle


def next_cycle_date(start_date, frequency: str, days: int):
    if frequency == RenewalFrequency.WEEKLY:
        return start_date + timedelta(days=7)
    if frequency == RenewalFrequency.MONTHLY:
        return start_date + timedelta(days=30)
    return start_date + timedelta(days=max(days or 1, 1))


def renew_goal_if_due(goal: BusinessGoal):
    if goal.tipo != GoalType.RENEWABLE or not goal.proximo_ciclo:
        return current_cycle(goal)

    today = timezone.localdate()
    if goal.proximo_ciclo > today:
        return current_cycle(goal)

    previous = current_cycle(goal)
    previous.estado = GoalStatus.COMPLETED
    previous.save(update_fields=["estado", "updated_at"])

    if goal.manejo_saldo == BalanceHandling.CARRY_OVER:
        saldo = previous.monto_acumulado
    elif goal.manejo_saldo == BalanceHandling.RESERVE_ONLY:
        saldo = goal.recursos_reservados
    else:
        saldo = Decimal("0.00")

    start = goal.proximo_ciclo
    end = next_cycle_date(start, goal.frecuencia_renovacion, goal.frecuencia_dias) - timedelta(days=1)
    cycle = BusinessGoalCycle.objects.create(
        goal=goal,
        numero=previous.numero + 1,
        fecha_inicio=start,
        fecha_fin=end,
        monto_objetivo=goal.monto_objetivo,
        saldo_inicial=saldo,
        monto_acumulado=saldo,
        estado=GoalStatus.ACTIVE,
    )

    if goal.conservar_nodos:
        node_map = {}
        for node in goal.nodes.filter(cycle=previous):
            clone = BusinessGoalNode.objects.create(
                goal=goal,
                cycle=cycle,
                tipo=node.tipo,
                etiqueta=node.etiqueta,
                valor=node.valor,
                porcentaje=node.porcentaje,
                periodo_inicio=cycle.fecha_inicio,
                periodo_fin=cycle.fecha_fin,
                posicion_x=node.posicion_x,
                posicion_y=node.posicion_y,
                config=node.config,
            )
            node_map[node.id] = clone
        for connection in goal.connections.filter(cycle=previous):
            if connection.source_id in node_map and connection.target_id in node_map:
                BusinessGoalConnection.objects.create(
                    goal=goal,
                    cycle=cycle,
                    source=node_map[connection.source_id],
                    target=node_map[connection.target_id],
                    operador=connection.operador,
                    peso=connection.peso,
                )

    goal.proximo_ciclo = next_cycle_date(start, goal.frecuencia_renovacion, goal.frecuencia_dias)
    goal.save(update_fields=["proximo_ciclo", "updated_at"])
    return cycle


def node_value(node: BusinessGoalNode) -> Decimal:
    start = node.periodo_inicio
    end = node.periodo_fin
    value = node.valor or Decimal("0.00")

    if node.tipo == NodeType.SALES:
        qs = InventoryProductSale.objects.all()
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)
        return qs.aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    if node.tipo == NodeType.RESERVATIONS:
        from common_vap.enums import ReservaEstado
        from espacios.models import Reserva
        from espacios.serializers.reserva import calcular_monto_reserva

        qs = Reserva.objects.exclude(estado_reserva__in=[ReservaEstado.CANCELADA, ReservaEstado.NO_SHOW])
        if start:
            qs = qs.filter(inicio__date__gte=start)
        if end:
            qs = qs.filter(inicio__date__lte=end)

        total = Decimal("0.00")
        for reserva in qs.select_related("espacio", "actividad", "descuento_promocion"):
            total += calcular_monto_reserva(reserva)
        return total.quantize(Decimal("0.01"))

    if node.tipo in {NodeType.SALARIES, NodeType.SERVICES, NodeType.RENT, NodeType.FIXED_EXPENSE, NodeType.PENDING_INVOICES}:
        fixed_expense_id = (node.config or {}).get("fixed_expense_id")
        if fixed_expense_id:
            expense = BusinessFixedExpense.objects.filter(pk=fixed_expense_id).first()
            return (expense.monto * Decimal("-1")) if expense else Decimal("0.00")

        qs = BusinessFixedExpense.objects.filter(estado__in=["activo", "vencido"])
        if node.tipo == NodeType.SALARIES:
            qs = qs.filter(categoria__icontains="salario")
        elif node.tipo == NodeType.SERVICES:
            qs = qs.filter(categoria__in=["luz", "agua", "internet", "servicios"])
        elif node.tipo == NodeType.RENT:
            qs = qs.filter(categoria__icontains="alquiler")
        elif node.tipo == NodeType.PENDING_INVOICES:
            qs = qs.filter(estado="vencido")
        total = qs.aggregate(total=Sum("monto"))["total"] or Decimal("0.00")
        return total * Decimal("-1")

    if node.tipo == NodeType.RESERVED_PERCENT:
        base = Decimal(str(node.config.get("base", "0") or "0"))
        return (base * (node.porcentaje or Decimal("0.00")) / Decimal("100.00")).quantize(Decimal("0.01"))

    return value


def connected_nodes_total(goal: BusinessGoal, cycle: BusinessGoalCycle) -> Decimal:
    connections = BusinessGoalConnection.objects.filter(goal=goal, cycle=cycle).select_related("source")
    if not connections.exists():
        return sum((node_value(node) for node in goal.nodes.filter(cycle=cycle)), Decimal("0.00"))

    total = Decimal("0.00")
    for connection in connections:
        value = node_value(connection.source) * connection.peso
        if connection.operador == "-":
            total -= value
        elif connection.operador == "*":
            total *= value
        else:
            total += value
    return total


def cycle_financial_summary(cycle: BusinessGoalCycle) -> dict:
    """Return the cash-flow values used to evaluate a goal.

    ``monto_objetivo`` is the profit the user wants to obtain. Income first
    covers every expense in the cycle; only the remaining amount is profit.
    Automatic income comes from reservations and product sales, while
    inventory batches are variable expenses.
    """
    start = cycle.fecha_inicio
    end = cycle.fecha_fin
    # El periodo puede comenzar antes de que se cree la meta. Los ingresos
    # historicos no deben heredarse: se cuenta desde la creacion del ciclo.
    created_at = cycle.created_at

    product_sales = InventoryProductSale.objects.filter(
        created_at__gte=created_at,
        created_at__date__lte=end,
    )
    product_income = product_sales.aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    from common_vap.enums import ReservaEstado
    from espacios.models import Reserva
    from espacios.serializers.reserva import calcular_monto_reserva

    reservations = Reserva.objects.exclude(estado_reserva__in=[ReservaEstado.CANCELADA, ReservaEstado.NO_SHOW])
    reservations = reservations.filter(
        created_at__gte=created_at,
        inicio__date__gte=start,
        inicio__date__lte=end,
    )
    reservation_income = Decimal("0.00")
    for reserva in reservations.select_related("espacio", "actividad", "descuento_promocion"):
        reservation_income += calcular_monto_reserva(reserva)

    movement_income = cycle.movements.filter(
        tipo__in=[MovementType.INCOME, MovementType.RESERVE, MovementType.ADJUSTMENT]
    ).aggregate(total=Sum("monto"))["total"] or Decimal("0.00")
    movement_expenses = cycle.movements.filter(tipo=MovementType.EXPENSE).aggregate(total=Sum("monto"))["total"] or Decimal("0.00")

    fixed_expenses = BusinessFixedExpense.objects.filter(
        fecha_pago__gte=start,
        fecha_pago__lte=end,
        estado__in=["activo", "pagado", "vencido"],
    ).aggregate(total=Sum("monto"))["total"] or Decimal("0.00")
    assigned_batch_ids = []
    for config in cycle.nodes.filter(tipo=NodeType.VARIABLE_EXPENSES).values_list("config", flat=True):
        if isinstance(config, dict) and config.get("batch_id"):
            assigned_batch_ids.append(config["batch_id"])
    variable_expenses = InventoryPurchaseBatch.objects.filter(
        id__in=assigned_batch_ids,
        fecha_compra__gte=start,
        fecha_compra__lte=end,
    ).aggregate(total=Sum("costo_total"))["total"] or Decimal("0.00")

    income = (product_income + reservation_income + movement_income).quantize(Decimal("0.01"))
    expenses = (fixed_expenses + variable_expenses + movement_expenses).quantize(Decimal("0.01"))
    available = (cycle.saldo_inicial + income).quantize(Decimal("0.01"))
    expenses_pending = max(Decimal("0.00"), expenses - available).quantize(Decimal("0.01"))
    profit = max(Decimal("0.00"), available - expenses).quantize(Decimal("0.01"))
    target = cycle.monto_objetivo or Decimal("0.00")
    income_required = (expenses + target).quantize(Decimal("0.01"))
    income_missing = max(Decimal("0.00"), income_required - available).quantize(Decimal("0.01"))
    profit_missing = max(Decimal("0.00"), target - profit).quantize(Decimal("0.01"))

    return {
        "product_income": product_income.quantize(Decimal("0.01")),
        "reservation_income": reservation_income.quantize(Decimal("0.01")),
        "income": income,
        "fixed_expenses": fixed_expenses.quantize(Decimal("0.01")),
        "variable_expenses": variable_expenses.quantize(Decimal("0.01")),
        "movement_expenses": movement_expenses.quantize(Decimal("0.01")),
        "expenses": expenses,
        "available": available,
        "expenses_pending": expenses_pending,
        "profit": profit,
        "income_required": income_required,
        "income_missing": income_missing,
        "profit_missing": profit_missing,
    }


def recalculate_cycle(cycle: BusinessGoalCycle):
    summary = cycle_financial_summary(cycle)
    cycle.monto_acumulado = summary["profit"]
    cycle.save(update_fields=["monto_acumulado", "updated_at"])
    return cycle


def goal_progress(goal: BusinessGoal) -> dict:
    sync_cycle_with_goal(goal)
    cycle = renew_goal_if_due(goal)
    cycle = recalculate_cycle(cycle)
    summary = cycle_financial_summary(cycle)
    today = timezone.localdate()
    target = cycle.monto_objetivo or Decimal("0.01")
    missing = summary["profit_missing"]
    percent = min(Decimal("100.00"), (summary["profit"] / target * Decimal("100.00")).quantize(Decimal("0.01")))
    total_days = max((cycle.fecha_fin - cycle.fecha_inicio).days + 1, 1)
    elapsed_days = max((today - cycle.fecha_inicio).days + 1, 1)
    remaining_days = max((cycle.fecha_fin - today).days, 0)
    daily_rate = summary["available"] / Decimal(elapsed_days)
    projected_income = (daily_rate * Decimal(total_days)).quantize(Decimal("0.01"))
    projected_profit = max(Decimal("0.00"), projected_income - summary["expenses"]).quantize(Decimal("0.01"))
    related_expenses = BusinessFixedExpense.objects.filter(estado__in=["activo", "vencido"]).order_by("-prioridad", "fecha_pago")[:8]

    return {
        "cycle_id": str(cycle.id),
        "cycle_number": cycle.numero,
        "monto_acumulado": cycle.monto_acumulado,
        "monto_faltante": missing,
        "porcentaje_avance": percent,
        "ingreso_acumulado": summary["available"],
        "ingreso_necesario": summary["income_required"],
        "ingreso_faltante": summary["income_missing"],
        "ingresos_reservas": summary["reservation_income"],
        "ingresos_ventas": summary["product_income"],
        "gastos_totales": summary["expenses"],
        "gastos_fijos": summary["fixed_expenses"],
        "gastos_variables": summary["variable_expenses"],
        "gastos_movimientos": summary["movement_expenses"],
        "gastos_pendientes": summary["expenses_pending"],
        "ganancia_acumulada": summary["profit"],
        "ganancia_faltante": summary["profit_missing"],
        "dias_restantes": remaining_days,
        "proyeccion_cumplimiento": projected_profit,
        "cumplimiento_estimado": projected_profit >= target,
        "gastos_relacionados": [expense.nombre for expense in related_expenses],
        "proxima_renovacion": goal.proximo_ciclo,
    }
