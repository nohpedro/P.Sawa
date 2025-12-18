# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserViewSet,
    ClienteViewSet,
    MeView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
router.register(r"clientes", ClienteViewSet, basename="clientes")

urlpatterns = [
    # ViewSets
    path("", include(router.urls)),
    path("me/", MeView.as_view(), name="me"),
]
