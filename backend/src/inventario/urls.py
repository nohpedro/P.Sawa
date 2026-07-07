from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryItemViewSet, InventoryProductSaleViewSet, InventoryPromotionViewSet, InventoryPurchaseBatchViewSet


router = DefaultRouter()
router.register(r"items", InventoryItemViewSet, basename="inventario-item")
router.register(r"lotes", InventoryPurchaseBatchViewSet, basename="inventario-lote")
router.register(r"promociones", InventoryPromotionViewSet, basename="inventario-promocion")
router.register(r"ventas-productos", InventoryProductSaleViewSet, basename="inventario-venta-producto")

urlpatterns = [
    path("", include(router.urls)),
]
