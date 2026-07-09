from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from common_vap.models import BaseModel


class ExpenseFrequency(models.TextChoices):
    ONCE = "once", "Una vez"
    WEEKLY = "weekly", "Semanal"
    MONTHLY = "monthly", "Mensual"
    CUSTOM_DAYS = "custom_days", "Cada cierta cantidad de dias"


class ExpensePriority(models.TextChoices):
    LOW = "baja", "Baja"
    MEDIUM = "media", "Media"
    HIGH = "alta", "Alta"
    CRITICAL = "critica", "Critica"


class ExpenseStatus(models.TextChoices):
    ACTIVE = "activo", "Activo"
    PAUSED = "pausado", "Pausado"
    PAID = "pagado", "Pagado"
    OVERDUE = "vencido", "Vencido"
    CANCELLED = "cancelado", "Cancelado"


class GoalType(models.TextChoices):
    NON_RENEWABLE = "no_renovable", "No renovable"
    RENEWABLE = "renovable", "Renovable"


class GoalStatus(models.TextChoices):
    DRAFT = "borrador", "Borrador"
    ACTIVE = "activa", "Activa"
    PAUSED = "pausada", "Pausada"
    COMPLETED = "cumplida", "Cumplida"
    CANCELLED = "cancelada", "Cancelada"


class RenewalFrequency(models.TextChoices):
    WEEKLY = "weekly", "Semanal"
    MONTHLY = "monthly", "Mensual"
    CUSTOM_DAYS = "custom_days", "Cada cierta cantidad de dias"


class BalanceHandling(models.TextChoices):
    RESET = "reset", "Reiniciar saldo"
    CARRY_OVER = "carry_over", "Arrastrar saldo acumulado"
    RESERVE_ONLY = "reserve_only", "Conservar solo recursos reservados"


class MovementType(models.TextChoices):
    INCOME = "ingreso", "Ingreso"
    EXPENSE = "gasto", "Gasto"
    RESERVE = "reserva", "Reserva"
    ADJUSTMENT = "ajuste", "Ajuste"


class NodeType(models.TextChoices):
    SALES = "ventas", "Ventas"
    RESERVATIONS = "reservas", "Reservas"
    SALARIES = "salarios", "Salarios"
    SERVICES = "servicios", "Servicios"
    RENT = "alquiler", "Alquiler"
    VARIABLE_EXPENSES = "gastos_variables", "Gastos variables"
    PENDING_INVOICES = "facturas_pendientes", "Facturas pendientes"
    MANUAL_INCOME = "ingreso_manual", "Ingreso manual"
    RESERVED_PERCENT = "porcentaje_reservado", "Porcentaje reservado"
    CALC_PERIOD = "periodo_calculo", "Periodo de calculo"
    FIXED_EXPENSE = "gasto_fijo", "Gasto fijo"


class BusinessFixedExpense(BaseModel):
    nombre = models.CharField(max_length=160)
    categoria = models.CharField(max_length=80)
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    frecuencia = models.CharField(max_length=20, choices=ExpenseFrequency.choices, default=ExpenseFrequency.MONTHLY)
    frecuencia_dias = models.PositiveIntegerField(default=30)
    fecha_pago = models.DateField()
    prioridad = models.CharField(max_length=20, choices=ExpensePriority.choices, default=ExpensePriority.MEDIUM)
    estado = models.CharField(max_length=20, choices=ExpenseStatus.choices, default=ExpenseStatus.ACTIVE)
    proveedor = models.CharField(max_length=160, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "metas_gasto_fijo"
        ordering = ["fecha_pago", "-prioridad", "nombre"]

    def __str__(self):
        return self.nombre


class BusinessGoal(BaseModel):
    nombre = models.CharField(max_length=160)
    descripcion = models.TextField(blank=True)
    monto_objetivo = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    prioridad = models.CharField(max_length=20, choices=ExpensePriority.choices, default=ExpensePriority.MEDIUM)
    estado = models.CharField(max_length=20, choices=GoalStatus.choices, default=GoalStatus.ACTIVE)
    recursos_reservados = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    variables_calculo = models.JSONField(default=dict, blank=True)
    tipo = models.CharField(max_length=20, choices=GoalType.choices, default=GoalType.NON_RENEWABLE)
    frecuencia_renovacion = models.CharField(max_length=20, choices=RenewalFrequency.choices, blank=True)
    frecuencia_dias = models.PositiveIntegerField(default=30)
    proximo_ciclo = models.DateField(null=True, blank=True)
    manejo_saldo = models.CharField(max_length=20, choices=BalanceHandling.choices, default=BalanceHandling.RESET)
    conservar_nodos = models.BooleanField(default=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="metas_empresariales_creadas",
    )

    class Meta:
        db_table = "metas_empresarial"
        ordering = ["-created_at"]

    def __str__(self):
        return self.nombre


class BusinessGoalCycle(BaseModel):
    goal = models.ForeignKey(BusinessGoal, on_delete=models.CASCADE, related_name="cycles")
    numero = models.PositiveIntegerField(default=1)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    monto_objetivo = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    saldo_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monto_acumulado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=GoalStatus.choices, default=GoalStatus.ACTIVE)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "metas_ciclo"
        ordering = ["-numero"]
        unique_together = ("goal", "numero")

    def __str__(self):
        return f"{self.goal.nombre} ciclo {self.numero}"


class BusinessGoalMovement(BaseModel):
    goal = models.ForeignKey(BusinessGoal, on_delete=models.CASCADE, related_name="movements")
    cycle = models.ForeignKey(BusinessGoalCycle, on_delete=models.CASCADE, related_name="movements")
    tipo = models.CharField(max_length=20, choices=MovementType.choices)
    concepto = models.CharField(max_length=180)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateField(default=timezone.localdate)
    categoria = models.CharField(max_length=80, blank=True)
    notas = models.TextField(blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="metas_movimientos_creados",
    )

    class Meta:
        db_table = "metas_movimiento"
        ordering = ["-fecha", "-created_at"]

    def __str__(self):
        return f"{self.concepto}: {self.monto}"


class BusinessGoalNode(BaseModel):
    goal = models.ForeignKey(BusinessGoal, on_delete=models.CASCADE, related_name="nodes")
    cycle = models.ForeignKey(BusinessGoalCycle, null=True, blank=True, on_delete=models.CASCADE, related_name="nodes")
    tipo = models.CharField(max_length=30, choices=NodeType.choices)
    etiqueta = models.CharField(max_length=140)
    valor = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    periodo_inicio = models.DateField(null=True, blank=True)
    periodo_fin = models.DateField(null=True, blank=True)
    posicion_x = models.IntegerField(default=120)
    posicion_y = models.IntegerField(default=120)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "metas_nodo"
        ordering = ["created_at"]

    def __str__(self):
        return self.etiqueta


class BusinessGoalConnection(BaseModel):
    goal = models.ForeignKey(BusinessGoal, on_delete=models.CASCADE, related_name="connections")
    cycle = models.ForeignKey(BusinessGoalCycle, null=True, blank=True, on_delete=models.CASCADE, related_name="connections")
    source = models.ForeignKey(BusinessGoalNode, on_delete=models.CASCADE, related_name="outgoing_connections")
    target = models.ForeignKey(BusinessGoalNode, on_delete=models.CASCADE, related_name="incoming_connections")
    operador = models.CharField(max_length=10, default="+")
    peso = models.DecimalField(max_digits=8, decimal_places=2, default=1)

    class Meta:
        db_table = "metas_conexion"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.source} -> {self.target}"
