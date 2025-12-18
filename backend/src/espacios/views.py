# src/espacios/views.py
from datetime import datetime, time as dtime

from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from auth_vap.authentication import AccessTokenAuthentication
from common_vap.permissions import IsAdminOrReadOnly
from .models import (
    TipoActividad,
    Espacio,
    EspacioActividad,
    Calendario,
    Regla,
    ReglaGlobal,
    Promocion,
    Reserva,
)
from .serializers import (
    TipoActividadSerializer,
    EspacioSerializer,
    EspacioActividadSerializer,
    CalendarioSerializer,
    ReglaSerializer,
    ReglaGlobalSerializer,
    PromocionSerializer,
    ReservaSerializer,
)

AUTH = (AccessTokenAuthentication,)
PERMS = (IsAdminOrReadOnly,)
BACKENDS = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)


@extend_schema(
    tags=["Espacios - Tipos de Actividad"],
    description=(
        "CRUD de tipos de actividad/deporte. "
        "Permite listar, crear (solo admin), obtener, actualizar y eliminar."
    ),
)
class TipoActividadViewSet(viewsets.ModelViewSet):
    queryset = TipoActividad.objects.all()
    serializer_class = TipoActividadSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion")
    ordering_fields = ("nombre", "created_at")
    filterset_fields = ("activo",)


@extend_schema(
    tags=["Espacios"],
    description=(
        "CRUD de espacios físicos (canchas/salas). "
        "Incluye actividades vinculadas en lectura, y expone `estado_actual` (LIBRE/OCUPADO/NO_DISPONIBLE) "
        "calculado según el estado operativo y reservas vigentes."
    ),
)
class EspacioViewSet(viewsets.ModelViewSet):
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


@extend_schema(
    tags=["Espacios - Actividades por Espacio"],
    description="CRUD de relaciones Espacio-Actividad (duración y precio base por actividad en un espacio).",
)
class EspacioActividadViewSet(viewsets.ModelViewSet):
    queryset = EspacioActividad.objects.select_related("espacio", "tipo")
    serializer_class = EspacioActividadSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("espacio__nombre", "tipo__nombre")
    ordering_fields = ("duracion_minutos", "precio_base", "created_at")
    filterset_fields = ("activo", "espacio", "tipo")


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
class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.select_related("espacio", "usuario", "cliente", "actividad")
    serializer_class = ReservaSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS

    search_fields = ("espacio__nombre", "notas", "usuario__username")
    ordering_fields = ("inicio", "fin", "created_at")
    filterset_fields = ("espacio", "estado_reserva")

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
