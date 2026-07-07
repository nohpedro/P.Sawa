from rest_framework import serializers

from .models import (
    InventoryItem,
    InventoryItemType,
    InventoryProductSale,
    InventoryPromotion,
    InventoryPromotionPriority,
    InventoryPromotionWeekday,
    InventoryPurchaseBatch,
)


class InventoryPurchaseBatchSerializer(serializers.ModelSerializer):
    item_nombre = serializers.ReadOnlyField(source="item.nombre")
    creado_por_username = serializers.ReadOnlyField(source="creado_por.username")

    class Meta:
        model = InventoryPurchaseBatch
        fields = (
            "id",
            "item",
            "item_nombre",
            "fecha_compra",
            "proveedor",
            "cantidad",
            "costo_total",
            "costo_unitario",
            "precio_venta_unitario",
            "compra_por_mayor",
            "notas",
            "creado_por",
            "creado_por_username",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("creado_por", "costo_unitario", "precio_venta_unitario")


class InventoryItemSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    unidad_label = serializers.CharField(source="get_unidad_display", read_only=True)
    margen_sugerido = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    stock_bajo = serializers.SerializerMethodField()
    ultimo_lote = serializers.SerializerMethodField()
    lotes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = (
            "id",
            "nombre",
            "tipo",
            "tipo_label",
            "unidad",
            "unidad_label",
            "descripcion",
            "sku",
            "stock_actual",
            "stock_minimo",
            "stock_bajo",
            "es_para_venta",
            "margen_venta_porcentaje",
            "requiere_mantenimiento",
            "fecha_ultimo_mantenimiento",
            "fecha_proximo_mantenimiento",
            "precio_venta_sugerido",
            "margen_sugerido",
            "activo",
            "ultimo_lote",
            "lotes_count",
            "created_at",
            "updated_at",
        )

    def get_stock_bajo(self, obj):
        return obj.stock_minimo > 0 and obj.stock_actual <= obj.stock_minimo

    def get_ultimo_lote(self, obj):
        lote = obj.lotes.order_by("-fecha_compra", "-created_at").first()
        if not lote:
            return None
        return {
            "id": str(lote.id),
            "fecha_compra": lote.fecha_compra,
            "cantidad": lote.cantidad,
            "costo_unitario": lote.costo_unitario,
            "precio_venta_unitario": lote.precio_venta_unitario,
            "compra_por_mayor": lote.compra_por_mayor,
            "proveedor": lote.proveedor,
        }

    def validate(self, attrs):
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        if tipo == InventoryItemType.MANTENIMIENTO:
            attrs["requiere_mantenimiento"] = True
        return attrs


class InventoryPromotionSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    prioridad_label = serializers.CharField(source="get_prioridad_display", read_only=True)
    item_regalo_nombre = serializers.ReadOnlyField(source="item_regalo.nombre")
    espacios_nombres = serializers.SerializerMethodField()
    dias_semana_lista = serializers.ListField(
        child=serializers.ChoiceField(choices=InventoryPromotionWeekday.choices),
        required=False,
        write_only=True,
    )
    dias_semana_display = serializers.SerializerMethodField()

    class Meta:
        model = InventoryPromotion
        fields = (
            "id",
            "nombre",
            "tipo",
            "tipo_label",
            "descripcion",
            "activo",
            "fecha_inicio",
            "fecha_fin",
            "dias_semana",
            "dias_semana_lista",
            "dias_semana_display",
            "aplica_festivos",
            "min_reserva_minutos",
            "horas_pagadas",
            "horas_gratis",
            "descuento_porcentaje",
            "item_regalo",
            "item_regalo_nombre",
            "cantidad_item_regalo",
            "aplica_todos_los_espacios",
            "espacios",
            "espacios_nombres",
            "prioridad",
            "prioridad_label",
            "combinable",
            "notas",
            "created_at",
            "updated_at",
        )

    def get_espacios_nombres(self, obj):
        return [space.nombre for space in obj.espacios.all()]

    def get_dias_semana_display(self, obj):
        labels = dict(InventoryPromotionWeekday.choices)
        return [labels.get(day, day) for day in obj.dias_semana_lista]

    def validate(self, attrs):
        days = attrs.pop("dias_semana_lista", None)
        if days is not None:
            attrs["dias_semana"] = ",".join(days)
        priority = attrs.get("prioridad")
        if priority and priority not in {choice.value for choice in InventoryPromotionPriority}:
            raise serializers.ValidationError({"prioridad": "Selecciona prioridad baja, media o alta."})
        return attrs


class InventoryProductSaleSerializer(serializers.ModelSerializer):
    item_nombre = serializers.ReadOnlyField(source="item.nombre")
    cliente_nombre = serializers.SerializerMethodField()
    vendido_por_username = serializers.ReadOnlyField(source="vendido_por.username")

    class Meta:
        model = InventoryProductSale
        fields = (
            "id",
            "item",
            "item_nombre",
            "cliente",
            "cliente_nombre",
            "reserva",
            "cantidad",
            "precio_unitario",
            "total",
            "notas",
            "vendido_por",
            "vendido_por_username",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("precio_unitario", "total", "vendido_por")

    def get_cliente_nombre(self, obj):
        return str(obj.cliente) if obj.cliente_id else ""

    def validate_item(self, item):
        if item.tipo != InventoryItemType.CONSUMIBLE:
            raise serializers.ValidationError("Solo se pueden vender items consumibles.")
        if not item.es_para_venta:
            raise serializers.ValidationError("El item no esta marcado para venta.")
        if not item.activo:
            raise serializers.ValidationError("El item no esta activo.")
        return item
