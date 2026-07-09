from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BusinessFixedExpenseViewSet,
    BusinessGoalConnectionViewSet,
    BusinessGoalCycleViewSet,
    BusinessGoalMovementViewSet,
    BusinessGoalNodeViewSet,
    BusinessGoalViewSet,
)


router = DefaultRouter()
router.register(r"gastos-fijos", BusinessFixedExpenseViewSet, basename="meta-gasto-fijo")
router.register(r"metas", BusinessGoalViewSet, basename="meta-empresarial")
router.register(r"ciclos", BusinessGoalCycleViewSet, basename="meta-ciclo")
router.register(r"movimientos", BusinessGoalMovementViewSet, basename="meta-movimiento")
router.register(r"nodos", BusinessGoalNodeViewSet, basename="meta-nodo")
router.register(r"conexiones", BusinessGoalConnectionViewSet, basename="meta-conexion")

urlpatterns = [
    path("", include(router.urls)),
]
