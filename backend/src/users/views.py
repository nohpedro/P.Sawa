# src/users/views.py
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework.generics import RetrieveUpdateAPIView
from drf_spectacular.utils import extend_schema

from .models import Cliente
from .serializers import (
    UserListSerializer,
    UserWriteSerializer,
    ClienteReadSerializer,
    ClienteWriteSerializer,
)

User = get_user_model()


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsAdminOrSelf(permissions.BasePermission):
    """
    Para UserViewSet:
    - Admin: puede listar/crear/eliminar
    - Usuario autenticado: puede ver/editar su propio usuario
    """

    def has_permission(self, request, view):
        if getattr(view, "action", None) in ("list", "create", "destroy"):
            return bool(request.user and request.user.is_staff)
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj == request.user


class IsAdminOrOwnCliente(permissions.BasePermission):
    """
    Para ClienteViewSet:
    - Admin: puede todo
    - Usuario: solo puede acceder/modificar su propio Cliente
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj: Cliente):
        if request.user.is_staff:
            return True
        return obj.user_id == request.user.id


@extend_schema(tags=["Users"])
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")

    def get_permissions(self):
        if self.action in ("list", "create", "destroy"):
            return [IsAdminOnly()]
        return [IsAdminOrSelf()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserWriteSerializer
        return UserListSerializer


@extend_schema(tags=["Clientes"])
class ClienteViewSet(viewsets.ModelViewSet):
    """
    CRUD para Cliente.
    - Admin ve todos
    - Usuario solo ve su propio perfil Cliente
    """

    permission_classes = [IsAdminOrOwnCliente]

    # Fix drf-spectacular: deja claro el tipo de {id} (UUID) para el router
    lookup_field = "id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def get_queryset(self):
        qs = Cliente.objects.select_related("user").all()
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ClienteWriteSerializer
        return ClienteReadSerializer

    def perform_create(self, serializer):
        # si el usuario intenta crear otro perfil, lo forzamos al usuario logueado
        serializer.save(user=self.request.user)


@extend_schema(
    tags=["Clientes"],
    description=(
        "Endpoint del perfil del usuario autenticado.\n\n"
        "- GET: devuelve el Cliente del usuario logueado (lo crea si no existe)\n"
        "- PATCH/PUT: actualiza su propio Cliente"
    ),
    responses=ClienteReadSerializer,
)
class MeView(RetrieveUpdateAPIView):
    """
    Reemplaza APIView por GenericAPIView para que drf-spectacular pueda inferir el serializer.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ClienteWriteSerializer  # para PUT/PATCH

    def get_object(self):
        cliente, _ = Cliente.objects.get_or_create(user=self.request.user)
        return cliente

    def retrieve(self, request, *args, **kwargs):
        """
        GET -> siempre responde con el serializer de lectura
        """
        instance = self.get_object()
        return super().finalize_response(
            request,
            response=self._build_read_response(instance),
            *args,
            **kwargs,
        )

    def update(self, request, *args, **kwargs):
        """
        PUT/PATCH -> valida con write serializer y responde con read serializer
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return self._build_read_response(instance)

    def _build_read_response(self, instance):
        from rest_framework.response import Response
        return Response(ClienteReadSerializer(instance).data)
