from django.db.models import Count, F
from rest_framework import filters, viewsets
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema

from audit.models import AuditLog
from audit.utils import AuditLogMixin
from auth_vap.authentication import AccessTokenAuthentication
from common_vap.permissions import HasModuleAccess, IsAdminOrReadOnly

from .models import InventoryItem, InventoryPromotion, InventoryPurchaseBatch
from .serializers import InventoryItemSerializer, InventoryPromotionSerializer, InventoryPurchaseBatchSerializer


AUTH = (AccessTokenAuthentication,)
PERMS = (HasModuleAccess, IsAdminOrReadOnly)
BACKENDS = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)


@extend_schema(tags=["Inventario"], description="CRUD de items de inventario y stock base.")
class InventoryItemViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "inventory"
    required_module = "inventory"
    queryset = InventoryItem.objects.annotate(lotes_count=Count("lotes"))
    serializer_class = InventoryItemSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion", "sku")
    ordering_fields = ("nombre", "tipo", "stock_actual", "stock_minimo", "precio_venta_sugerido", "created_at")
    filterset_fields = ("tipo", "unidad", "activo", "requiere_mantenimiento", "es_para_venta")

    def get_queryset(self):
        qs = super().get_queryset()
        stock_bajo = self.request.query_params.get("stock_bajo")
        if stock_bajo in ("1", "true", "True"):
            qs = qs.filter(stock_minimo__gt=0, stock_actual__lte=F("stock_minimo"))
        return qs

    def get_audit_summary(self, instance):
        return f"item de inventario {instance.nombre}"

    def get_audit_field_labels(self):
        return {
            "nombre": "Nombre",
            "tipo": "Tipo",
            "unidad": "Unidad",
            "stock_actual": "Stock actual",
            "stock_minimo": "Stock minimo",
            "precio_venta_sugerido": "Precio venta sugerido",
            "activo": "Estado",
        }


@extend_schema(tags=["Inventario"], description="Registro de compras/lotes para inventario.")
class InventoryPurchaseBatchViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "inventory"
    required_module = "inventory"
    queryset = InventoryPurchaseBatch.objects.select_related("item", "creado_por")
    serializer_class = InventoryPurchaseBatchSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("item__nombre", "proveedor", "notas")
    ordering_fields = ("fecha_compra", "cantidad", "costo_total", "costo_unitario", "created_at")
    filterset_fields = ("item", "compra_por_mayor", "proveedor")

    def perform_create(self, serializer):
        instance = serializer.save(creado_por=self.request.user)
        self._write_audit(AuditLog.Action.CREATE, instance)

    def get_audit_summary(self, instance):
        return f"lote de {instance.item.nombre}: {instance.cantidad} a Bs {instance.costo_unitario}"

    def get_audit_field_labels(self):
        return {
            "item": "Item",
            "fecha_compra": "Fecha de compra",
            "proveedor": "Proveedor",
            "cantidad": "Cantidad",
            "costo_total": "Costo total",
            "costo_unitario": "Costo unitario",
            "precio_venta_unitario": "Precio venta unitario",
            "compra_por_mayor": "Compra por mayor",
        }


@extend_schema(tags=["Inventario"], description="CRUD de promociones ligadas a reservas e inventario.")
class InventoryPromotionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_module = "inventory"
    required_module = "inventory"
    read_modules = ("inventory", "reservations")
    queryset = InventoryPromotion.objects.select_related("item_regalo").prefetch_related("espacios")
    serializer_class = InventoryPromotionSerializer
    authentication_classes = AUTH
    permission_classes = PERMS
    filter_backends = BACKENDS
    search_fields = ("nombre", "descripcion", "notas", "item_regalo__nombre", "espacios__nombre")
    ordering_fields = ("nombre", "tipo", "activo", "prioridad", "fecha_inicio", "fecha_fin", "created_at")
    filterset_fields = ("tipo", "activo", "aplica_festivos", "aplica_todos_los_espacios", "combinable")

    def get_audit_summary(self, instance):
        return f"promocion de inventario {instance.nombre}"

    def get_audit_field_labels(self):
        return {
            "nombre": "Nombre",
            "tipo": "Tipo",
            "activo": "Estado",
            "fecha_inicio": "Fecha inicio",
            "fecha_fin": "Fecha fin",
            "dias_semana": "Dias de la semana",
            "aplica_festivos": "Aplica festivos",
            "min_reserva_minutos": "Reserva minima",
            "horas_pagadas": "Horas pagadas",
            "horas_gratis": "Horas gratis",
            "descuento_porcentaje": "Descuento",
            "item_regalo": "Item de regalo",
            "cantidad_item_regalo": "Cantidad de regalo",
            "aplica_todos_los_espacios": "Aplica a todos los espacios",
            "prioridad": "Prioridad",
            "combinable": "Combinable",
        }
