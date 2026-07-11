from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from audit.models import AuditLog
from audit.utils import AuditLogMixin
from auth_vap.authentication import AccessTokenAuthentication
from common_vap.permissions import HasModuleAccess, IsAdminOrReadOnly

from .models import (
    BusinessFixedExpense,
    BusinessGoal,
    BusinessGoalConnection,
    BusinessGoalCycle,
    BusinessGoalMovement,
    BusinessGoalNode,
    GoalStatus,
)
from .serializers import (
    BusinessFixedExpenseSerializer,
    BusinessGoalConnectionSerializer,
    BusinessGoalCycleSerializer,
    BusinessGoalMovementSerializer,
    BusinessGoalNodeSerializer,
    BusinessGoalSerializer,
)
from .services import current_cycle, goal_progress, recalculate_cycle, renew_goal_if_due, sync_cycle_with_goal


AUTH = (AccessTokenAuthentication,)
PERMS = (HasModuleAccess, IsAdminOrReadOnly)
BACKENDS = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)


@extend_schema(tags=["Metas empresariales"], description="CRUD de gastos fijos y recurrentes.")
class BusinessFixedExpenseViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "business_goals"
    required_module = "business_goals"
    queryset = BusinessFixedExpense.objects.all()
    serializer_class = BusinessFixedExpenseSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "categoria", "proveedor", "notas")
    ordering_fields = ("fecha_pago", "monto", "prioridad", "estado", "created_at")
    filterset_fields = ("categoria", "frecuencia", "prioridad", "estado")

    def get_audit_summary(self, instance):
        return f"gasto fijo {instance.nombre}"


@extend_schema(tags=["Metas empresariales"], description="CRUD y evaluacion de metas financieras.")
class BusinessGoalViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "business_goals"
    required_module = "business_goals"
    queryset = BusinessGoal.objects.select_related("creado_por")
    serializer_class = BusinessGoalSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion")
    ordering_fields = ("fecha_inicio", "fecha_fin", "monto_objetivo", "prioridad", "estado", "created_at")
    filterset_fields = ("tipo", "prioridad", "estado")

    def get_queryset(self):
        queryset = super().get_queryset()
        periodo = self.request.query_params.get("periodo")
        today = timezone.localdate()
        past_filter = Q(fecha_fin__lt=today) | Q(estado__in=[GoalStatus.COMPLETED, GoalStatus.CANCELLED])

        if periodo == "pasadas":
            return queryset.filter(past_filter)
        if periodo == "vigentes":
            return queryset.exclude(past_filter)

        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(creado_por=self.request.user)
        current_cycle(instance)
        self._write_audit(AuditLog.Action.CREATE, instance)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        sync_cycle_with_goal(serializer.instance)

    def get_audit_summary(self, instance):
        return f"meta empresarial {instance.nombre}"

    @action(detail=True, methods=["post"])
    def renovar(self, request, pk=None):
        goal = self.get_object()
        cycle = renew_goal_if_due(goal)
        return Response(BusinessGoalCycleSerializer(cycle).data)

    @action(detail=True, methods=["get"])
    def progreso(self, request, pk=None):
        goal = self.get_object()
        return Response(goal_progress(goal))

    @action(detail=True, methods=["post"])
    def aporte(self, request, pk=None):
        goal = self.get_object()
        cycle = current_cycle(goal)
        serializer = BusinessGoalMovementSerializer(
            data={
                **request.data,
                "goal": str(goal.id),
                "cycle": str(cycle.id),
                "tipo": request.data.get("tipo") or "ingreso",
            }
        )
        serializer.is_valid(raise_exception=True)
        movement = serializer.save(creado_por=request.user)
        recalculate_cycle(cycle)
        return Response(BusinessGoalMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Metas empresariales"], description="Ciclos historicos de metas.")
class BusinessGoalCycleViewSet(viewsets.ReadOnlyModelViewSet):
    required_module = "business_goals"
    queryset = BusinessGoalCycle.objects.select_related("goal")
    serializer_class = BusinessGoalCycleSerializer
    authentication_classes = AUTH
    permission_classes = (HasModuleAccess,)
    filter_backends = BACKENDS
    ordering_fields = ("numero", "fecha_inicio", "fecha_fin", "estado")
    filterset_fields = ("goal", "estado")


@extend_schema(tags=["Metas empresariales"], description="Movimientos de ciclos de metas.")
class BusinessGoalMovementViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "business_goals"
    required_module = "business_goals"
    queryset = BusinessGoalMovement.objects.select_related("goal", "cycle", "creado_por")
    serializer_class = BusinessGoalMovementSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("concepto", "categoria", "notas")
    ordering_fields = ("fecha", "monto", "tipo", "created_at")
    filterset_fields = ("goal", "cycle", "tipo", "categoria")

    def perform_create(self, serializer):
        instance = serializer.save(creado_por=self.request.user)
        recalculate_cycle(instance.cycle)
        self._write_audit(AuditLog.Action.CREATE, instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        recalculate_cycle(instance.cycle)
        self._write_audit(AuditLog.Action.UPDATE, instance)

    def get_audit_summary(self, instance):
        return f"movimiento de meta {instance.concepto}"


@extend_schema(tags=["Metas empresariales"], description="Nodos visuales para calculos de metas.")
class BusinessGoalNodeViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "business_goals"
    required_module = "business_goals"
    queryset = BusinessGoalNode.objects.select_related("goal", "cycle")
    serializer_class = BusinessGoalNodeSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    filterset_fields = ("goal", "cycle", "tipo")

    def get_audit_summary(self, instance):
        return f"nodo de meta {instance.etiqueta}"


@extend_schema(tags=["Metas empresariales"], description="Conexiones entre nodos de metas.")
class BusinessGoalConnectionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "business_goals"
    required_module = "business_goals"
    queryset = BusinessGoalConnection.objects.select_related("goal", "cycle", "source", "target")
    serializer_class = BusinessGoalConnectionSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    filterset_fields = ("goal", "cycle", "source", "target")

    def get_audit_summary(self, instance):
        return f"conexion de meta {instance.source} a {instance.target}"
