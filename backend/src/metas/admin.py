from django.contrib import admin

from .models import (
    BusinessFixedExpense,
    BusinessGoal,
    BusinessGoalConnection,
    BusinessGoalCycle,
    BusinessGoalMovement,
    BusinessGoalNode,
)


@admin.register(BusinessFixedExpense)
class BusinessFixedExpenseAdmin(admin.ModelAdmin):
    list_display = ("nombre", "categoria", "monto", "frecuencia", "fecha_pago", "prioridad", "estado")
    list_filter = ("categoria", "frecuencia", "prioridad", "estado")
    search_fields = ("nombre", "proveedor", "notas")


@admin.register(BusinessGoal)
class BusinessGoalAdmin(admin.ModelAdmin):
    list_display = ("nombre", "monto_objetivo", "tipo", "estado", "prioridad", "fecha_inicio", "fecha_fin", "proximo_ciclo")
    list_filter = ("tipo", "estado", "prioridad", "frecuencia_renovacion")
    search_fields = ("nombre", "descripcion")


@admin.register(BusinessGoalCycle)
class BusinessGoalCycleAdmin(admin.ModelAdmin):
    list_display = ("goal", "numero", "fecha_inicio", "fecha_fin", "monto_objetivo", "monto_acumulado", "estado")
    list_filter = ("estado",)


@admin.register(BusinessGoalMovement)
class BusinessGoalMovementAdmin(admin.ModelAdmin):
    list_display = ("goal", "cycle", "tipo", "concepto", "monto", "fecha", "categoria")
    list_filter = ("tipo", "categoria", "fecha")
    search_fields = ("concepto", "notas")


@admin.register(BusinessGoalNode)
class BusinessGoalNodeAdmin(admin.ModelAdmin):
    list_display = ("goal", "cycle", "tipo", "etiqueta", "valor", "porcentaje")
    list_filter = ("tipo",)
    search_fields = ("etiqueta",)


@admin.register(BusinessGoalConnection)
class BusinessGoalConnectionAdmin(admin.ModelAdmin):
    list_display = ("goal", "cycle", "source", "target", "operador", "peso")
    list_filter = ("operador",)
