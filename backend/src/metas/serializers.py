from rest_framework import serializers

from .models import (
    BusinessFixedExpense,
    BusinessGoal,
    BusinessGoalConnection,
    BusinessGoalCycle,
    BusinessGoalMovement,
    BusinessGoalNode,
    GoalType,
    RenewalFrequency,
)
from .services import current_cycle, goal_progress, next_cycle_date


def default_days_for_frequency(frequency: str) -> int:
    if frequency == RenewalFrequency.WEEKLY:
        return 7
    return 30


def normalize_goal_frequency(frequency: str) -> str:
    return RenewalFrequency.WEEKLY if frequency == RenewalFrequency.WEEKLY else RenewalFrequency.MONTHLY


class BusinessFixedExpenseSerializer(serializers.ModelSerializer):
    prioridad_label = serializers.CharField(source="get_prioridad_display", read_only=True)
    estado_label = serializers.CharField(source="get_estado_display", read_only=True)
    frecuencia_label = serializers.CharField(source="get_frecuencia_display", read_only=True)

    class Meta:
        model = BusinessFixedExpense
        fields = "__all__"


class BusinessGoalCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessGoalCycle
        fields = "__all__"


class BusinessGoalMovementSerializer(serializers.ModelSerializer):
    creado_por_username = serializers.ReadOnlyField(source="creado_por.username")

    class Meta:
        model = BusinessGoalMovement
        fields = "__all__"
        read_only_fields = ("creado_por",)


class BusinessGoalNodeSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = BusinessGoalNode
        fields = "__all__"

    def validate(self, attrs):
        goal = attrs.get("goal", getattr(self.instance, "goal", None))
        if goal and not attrs.get("cycle") and not getattr(self.instance, "cycle_id", None):
            attrs["cycle"] = current_cycle(goal)
        return attrs


class BusinessGoalConnectionSerializer(serializers.ModelSerializer):
    source_label = serializers.ReadOnlyField(source="source.etiqueta")
    target_label = serializers.ReadOnlyField(source="target.etiqueta")

    class Meta:
        model = BusinessGoalConnection
        fields = "__all__"

    def validate(self, attrs):
        goal = attrs.get("goal", getattr(self.instance, "goal", None))
        if goal and not attrs.get("cycle") and not getattr(self.instance, "cycle_id", None):
            attrs["cycle"] = current_cycle(goal)
        return attrs


class BusinessGoalSerializer(serializers.ModelSerializer):
    prioridad_label = serializers.CharField(source="get_prioridad_display", read_only=True)
    estado_label = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    progress = serializers.SerializerMethodField()
    current_cycle = serializers.SerializerMethodField()

    class Meta:
        model = BusinessGoal
        fields = "__all__"
        read_only_fields = ("creado_por",)

    def validate(self, attrs):
        goal_type = attrs.get("tipo", getattr(self.instance, "tipo", GoalType.NON_RENEWABLE))
        if goal_type != GoalType.RENEWABLE:
            attrs["frecuencia_renovacion"] = ""
            attrs["proximo_ciclo"] = None
            return attrs

        frequency = normalize_goal_frequency(attrs.get("frecuencia_renovacion") or getattr(self.instance, "frecuencia_renovacion", "") or RenewalFrequency.MONTHLY)
        days = default_days_for_frequency(frequency)
        start_date = attrs.get("fecha_inicio", getattr(self.instance, "fecha_inicio", None))
        should_recalculate_next = (
            not attrs.get("proximo_ciclo")
            and (
                not getattr(self.instance, "proximo_ciclo", None)
                or "tipo" in attrs
                or "frecuencia_renovacion" in attrs
                or "frecuencia_dias" in attrs
                or "fecha_inicio" in attrs
            )
        )

        attrs["frecuencia_renovacion"] = frequency
        attrs["frecuencia_dias"] = days
        if start_date and should_recalculate_next:
            attrs["proximo_ciclo"] = next_cycle_date(start_date, frequency, days)
        return attrs

    def get_progress(self, obj):
        return goal_progress(obj)

    def get_current_cycle(self, obj):
        return BusinessGoalCycleSerializer(current_cycle(obj)).data
