from django.contrib import admin

from .models import InventoryItem, InventoryPromotion, InventoryPurchaseBatch


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ("nombre", "tipo", "unidad", "stock_actual", "stock_minimo", "precio_venta_sugerido", "activo")
    list_filter = ("tipo", "unidad", "activo", "requiere_mantenimiento")
    search_fields = ("nombre", "sku", "descripcion")


@admin.register(InventoryPurchaseBatch)
class InventoryPurchaseBatchAdmin(admin.ModelAdmin):
    list_display = ("item", "fecha_compra", "cantidad", "costo_total", "costo_unitario", "precio_venta_unitario", "compra_por_mayor")
    list_filter = ("compra_por_mayor", "fecha_compra")
    search_fields = ("item__nombre", "proveedor", "notas")


@admin.register(InventoryPromotion)
class InventoryPromotionAdmin(admin.ModelAdmin):
    list_display = ("nombre", "tipo", "activo", "fecha_inicio", "fecha_fin", "aplica_festivos", "prioridad")
    list_filter = ("tipo", "activo", "aplica_festivos", "combinable")
    search_fields = ("nombre", "descripcion", "notas", "item_regalo__nombre")
    filter_horizontal = ("espacios",)
