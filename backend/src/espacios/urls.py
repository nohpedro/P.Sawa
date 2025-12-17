from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoActividadViewSet, EspacioViewSet, EspacioActividadViewSet,
    CalendarioViewSet, ReglaViewSet, ReglaGlobalViewSet, PromocionViewSet, ReservaViewSet
)

router = DefaultRouter()
router.register(r"tipos-actividad", TipoActividadViewSet, basename="tipo-actividad")
router.register(r"espacios", EspacioViewSet, basename="espacio")
router.register(r"espacio-actividad", EspacioActividadViewSet, basename="espacio-actividad")
router.register(r"calendarios", CalendarioViewSet, basename="calendario")
router.register(r"reglas", ReglaViewSet, basename="regla")
router.register(r"reglas-globales", ReglaGlobalViewSet, basename="regla-global")
router.register(r"promociones", PromocionViewSet, basename="promocion")
router.register(r"reservas", ReservaViewSet, basename="reserva")

urlpatterns = [
    path("", include(router.urls)),
]
