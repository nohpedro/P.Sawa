from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryItemViewSet, InventoryPromotionViewSet, InventoryPurchaseBatchViewSet


router = DefaultRouter()
router.register(r"items", InventoryItemViewSet, basename="inventario-item")
router.register(r"lotes", InventoryPurchaseBatchViewSet, basename="inventario-lote")
router.register(r"promociones", InventoryPromotionViewSet, basename="inventario-promocion")

urlpatterns = [
    path("", include(router.urls)),
]
