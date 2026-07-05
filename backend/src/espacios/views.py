# src/espacios/views.py
from datetime import datetime, time as dtime
from decimal import Decimal, ROUND_HALF_UP

from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from auth_vap.authentication import AccessTokenAuthentication
from audit.utils import AuditLogMixin
from common_vap.permissions import HasModuleAccess, IsAdminOrReadOnly
from .models import (
    TipoActividad,
    Espacio,
    EspacioActividad,
    Calendario,
    Regla,
    ReglaGlobal,
    Promocion,
    Reserva,
    ReservaPromotionCredit,
)
from .serializers import (
    TipoActividadSerializer,
    EspacioSerializer,
    EspacioActividadSerializer,
    CalendarioSerializer,
    ReglaSerializer,
    ReglaGlobalSerializer,
    PromocionSerializer,
    ReservaPromotionCreditSerializer,
    ReservaSerializer,
)
from .serializers.reserva import calcular_monto_reserva


AUTH = (AccessTokenAuthentication,)
PERMS = (HasModuleAccess, IsAdminOrReadOnly)
BACKENDS = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)


@extend_schema(
    tags=["Espacios - Tipos de Actividad"],
    description=(
        "CRUD de tipos de actividad/deporte. "
        "Permite listar, crear (solo admin), obtener, actualizar y eliminar."
    ),
)
class TipoActividadViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "activities"
    required_module = "activities"
    read_modules = ("activities", "reservations", "history", "space_activities")
    queryset = TipoActividad.objects.all()
    serializer_class = TipoActividadSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion")
    ordering_fields = ("nombre", "created_at")
    filterset_fields = ("activo",)

    def get_audit_summary(self, instance):
        return f"actividad {instance.nombre}"

    def get_audit_field_labels(self):
        return {
            "nombre": "Nombre",
            "descripcion": "Descripcion",
            "activo": "Estado",
        }


@extend_schema(
    tags=["Espacios"],
    description=(
        "CRUD de espacios físicos (canchas/salas). "
        "Incluye actividades vinculadas en lectura, y expone `estado_actual` (LIBRE/OCUPADO/NO_DISPONIBLE) "
        "calculado según el estado operativo y reservas vigentes."
    ),
)
class EspacioViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "spaces"
    required_module = "spaces"
    read_modules = ("spaces", "availability", "reservations", "history", "space_activities")
    queryset = (
        Espacio.objects
        .all()
        .prefetch_related("actividades", "espacio_actividades__tipo")
    )
    serializer_class = EspacioSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "ubicacion", "tags", "descripcion")
    ordering_fields = ("nombre", "capacidad", "created_at")
    filterset_fields = ("estado_operativo", "capacidad")

    def get_audit_summary(self, instance):
        return f"espacio {instance.nombre}"

    def get_audit_field_labels(self):
        return {
            "nombre": "Nombre",
            "descripcion": "Descripcion",
            "capacidad": "Capacidad",
            "estado_operativo": "Estado operativo",
            "ubicacion": "Ubicacion",
            "tags": "Etiquetas",
        }


@extend_schema(
    tags=["Espacios - Actividades por Espacio"],
    description="CRUD de relaciones Espacio-Actividad (duración y precio base por actividad en un espacio).",
)
class EspacioActividadViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "space_activities"
    required_module = "space_activities"
    read_modules = ("space_activities", "reservations", "history")
    queryset = EspacioActividad.objects.select_related("espacio", "tipo")
    serializer_class = EspacioActividadSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("espacio__nombre", "tipo__nombre")
    ordering_fields = ("duracion_minutos", "precio_base", "created_at")
    filterset_fields = ("activo", "espacio", "tipo")

    def get_audit_summary(self, instance):
        return (
            f"{instance.espacio} con actividad {instance.tipo} "
            f"({instance.duracion_minutos} min / precio base Bs {instance.precio_base})"
        )

    def get_audit_field_labels(self):
        return {
            "espacio": "Espacio",
            "tipo": "Actividad",
            "duracion_minutos": "Duracion",
            "precio_base": "Precio base",
            "activo": "Estado",
        }


@extend_schema(
    tags=["Espacios - Calendarios"],
    description=(
        "CRUD de disponibilidades puntuales (rangos de fecha/hora) para un espacio. "
        "Permite filtrar por rango de fechas usando parámetros `desde` y/o `hasta` (YYYY-MM-DD)."
    ),
    parameters=[
        OpenApiParameter(
            name="desde",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Fecha mínima (YYYY-MM-DD). Devuelve calendarios con `fecha_fin` >= desde (00:00).",
        ),
        OpenApiParameter(
            name="hasta",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Fecha máxima (YYYY-MM-DD). Devuelve calendarios con `fecha_inicio` <= hasta (23:59:59).",
        ),
    ],
)
class CalendarioViewSet(viewsets.ModelViewSet):
    required_module = "availability"
    queryset = Calendario.objects.select_related("espacio")
    serializer_class = CalendarioSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("titulo", "notas", "espacio__nombre")
    ordering_fields = ("fecha_inicio", "fecha_fin", "created_at")
    filterset_fields = ("espacio",)

    def get_queryset(self):
        qs = super().get_queryset()
        desde_str = self.request.query_params.get("desde")
        hasta_str = self.request.query_params.get("hasta")

        tz = timezone.get_current_timezone()

        if desde_str:
            d = parse_date(desde_str)
            if d:
                start_dt = timezone.make_aware(datetime.combine(d, dtime.min), tz)
                qs = qs.filter(fecha_fin__gte=start_dt)

        if hasta_str:
            h = parse_date(hasta_str)
            if h:
                end_dt = timezone.make_aware(datetime.combine(h, dtime.max), tz)
                qs = qs.filter(fecha_inicio__lte=end_dt)

        return qs


@extend_schema(
    tags=["Espacios - Reglas"],
    description=(
        "CRUD de reglas recurrentes de disponibilidad por espacio. "
        "Valida coherencia de horas/fechas y `weekday_mask` para frecuencia semanal."
    ),
)
class ReglaViewSet(viewsets.ModelViewSet):
    required_module = "availability"
    queryset = Regla.objects.select_related("espacio")
    serializer_class = ReglaSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("espacio__nombre", "weekday_mask")
    ordering_fields = ("fecha_desde", "fecha_hasta", "hora_inicio", "created_at")
    filterset_fields = ("espacio", "frecuencia", "activo")


@extend_schema(
    tags=["Espacios - Reglas Globales"],
    description=(
        "CRUD de reglas globales de disponibilidad (afectan a todos o a ciertos espacios). "
        "Si `aplica_todos` es False, se deben indicar espacios específicos."
    ),
)
class ReglaGlobalViewSet(viewsets.ModelViewSet):
    required_module = "availability"
    queryset = ReglaGlobal.objects.prefetch_related("espacios")
    serializer_class = ReglaGlobalSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion")
    ordering_fields = ("fecha_desde", "fecha_hasta", "hora_inicio", "created_at")
    filterset_fields = ("frecuencia", "activo", "aplica_todos", "espacios")


@extend_schema(
    tags=["Espacios - Promociones"],
    description=(
        "CRUD de promociones/descuentos. "
        "Pueden aplicar a todos los espacios o a un subconjunto."
    ),
)
class PromocionViewSet(viewsets.ModelViewSet):
    required_module = "availability"
    queryset = Promocion.objects.prefetch_related("espacios")
    serializer_class = PromocionSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion")
    ordering_fields = ("fecha_inicio", "fecha_fin", "created_at", "descuento_porcentaje")
    filterset_fields = ("activo", "aplica_todos", "espacios")


@extend_schema(
    tags=["Espacios - Reservas"],
    description=(
        "CRUD de reservas/usos: registra qué usuario usa qué espacio y en qué rango.\n\n"
        "- Admin (is_staff): puede crear reservas para cualquier usuario enviando `usuario` en el body; "
        "se crea en estado CONFIRMADA.\n"
        "- No admin: siempre crea/edita reservas para sí mismo; se crea en estado PENDIENTE.\n\n"
        "Incluye filtro por `desde`/`hasta` (YYYY-MM-DD) para traer reservas que intersecten el rango."
    ),
    parameters=[
        OpenApiParameter(
            name="desde",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Fecha mínima (YYYY-MM-DD). Devuelve reservas con `fin` >= desde (00:00).",
        ),
        OpenApiParameter(
            name="hasta",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Fecha máxima (YYYY-MM-DD). Devuelve reservas con `inicio` <= hasta (23:59:59).",
        ),
    ],
)
class ReservaViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "reservations"
    required_module = "reservations"
    read_modules = ("reservations", "history")
    queryset = Reserva.objects.select_related(
        "espacio",
        "usuario",
        "cliente",
        "actividad",
        "descuento_promocion",
        "credito_promocion_canjeado__promocion",
    )
    serializer_class = ReservaSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS

    search_fields = ("espacio__nombre", "notas", "usuario__username")
    ordering_fields = ("inicio", "fin", "created_at")
    filterset_fields = ("espacio", "estado_reserva", "actividad", "cliente", "usuario")

    def _get_reserva_monto(self, instance):
        if not instance.inicio or not instance.fin or instance.fin <= instance.inicio:
            return Decimal("0.00")

        relacion = (
            EspacioActividad.objects
            .filter(espacio=instance.espacio, tipo=instance.actividad, activo=True)
            .first()
        )
        if not relacion or relacion.duracion_minutos <= 0:
            return Decimal("0.00")

        minutos = Decimal(str((instance.fin - instance.inicio).total_seconds())) / Decimal(60)
        bloques = minutos / Decimal(relacion.duracion_minutos)
        total = bloques * relacion.precio_base
        return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def get_audit_summary(self, instance):
        cliente = getattr(instance.cliente, "__str__", None)
        cliente_label = str(instance.cliente) if cliente else instance.usuario.get_username()
        inicio = timezone.localtime(instance.inicio).strftime("%d/%m/%Y %H:%M") if instance.inicio else ""
        monto = calcular_monto_reserva(instance)
        return (
            f"reserva de {cliente_label} en {instance.espacio} para {instance.actividad} "
            f"({inicio}) por Bs {monto}"
        )

    def get_audit_field_labels(self):
        return {
            "espacio": "Espacio",
            "usuario": "Usuario",
            "cliente": "Cliente",
            "actividad": "Actividad",
            "inicio": "Inicio",
            "fin": "Fin",
            "estado_reserva": "Estado de reserva",
            "notas": "Notas",
        }

    def get_queryset(self):
        qs = super().get_queryset()

        # Cliente ve solo sus reservas; admin ve todas
        if not self.request.user.is_staff:
            qs = qs.filter(usuario=self.request.user)

        # filtros por rango de fechas (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD)
        desde_str = self.request.query_params.get("desde")
        hasta_str = self.request.query_params.get("hasta")

        tz = timezone.get_current_timezone()

        if desde_str:
            d = parse_date(desde_str)
            if d:
                start_dt = timezone.make_aware(datetime.combine(d, dtime.min), tz)
                qs = qs.filter(fin__gte=start_dt)

        if hasta_str:
            h = parse_date(hasta_str)
            if h:
                end_dt = timezone.make_aware(datetime.combine(h, dtime.max), tz)
                qs = qs.filter(inicio__lte=end_dt)

        return qs

    @action(detail=False, methods=["get"], url_path="creditos-promocion")
    def creditos_promocion(self, request):
        qs = ReservaPromotionCredit.objects.select_related("cliente", "promocion", "reserva_origen", "reserva_canje").filter(
            estado__in=("PENDIENTE", "PARCIAL"),
            minutos_disponibles__gt=0,
        )

        cliente = request.query_params.get("cliente")
        if cliente:
            qs = qs.filter(cliente_id=cliente)

        if not request.user.is_staff:
            qs = qs.filter(cliente__user=request.user)

        serializer = ReservaPromotionCreditSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)
