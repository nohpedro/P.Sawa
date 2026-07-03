# src/users/views.py
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema

from .models import Cliente
from .serializers import (
    UserListSerializer,
    UserWriteSerializer,
    UserPasswordResetSerializer,
    ClienteReadSerializer,
    ClienteWriteSerializer,
)

User = get_user_model()


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsSuperUserOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsAdminOrSelf(permissions.BasePermission):
    def has_permission(self, request, view):
        if getattr(view, "action", None) in ("list", "create", "destroy"):
            return bool(request.user and request.user.is_staff)
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj == request.user


class IsAdminOrOwnCliente(permissions.BasePermission):
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
        return [IsSuperUserOnly()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserWriteSerializer
        return UserListSerializer

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser and user != request.user:
            raise ValidationError({"user": "No puedes resetear la contrasena de otro superusuario."})

        serializer = UserPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = (serializer.validated_data.get("password") or "").strip()

        if not password:
            now = timezone.localtime(timezone.now())
            password = f"{user.username}{now.day:02d}{now.month:02d}"

        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"id": user.id, "username": user.username, "password": password})


def _generate_unique_username(nombre: str, apellido: str) -> str:
    """
    Genera un username único basado en nombre+apellido.
    Ej: juan-perez, juan-perez-2, juan-perez-3...
    """
    base = slugify(f"{nombre} {apellido}").replace("-", "")
    base = base or "cliente"

    # límite típico de username (depende de tu User model)
    base = base[:30]

    candidate = base
    i = 2
    while User.objects.filter(username=candidate).exists():
        suffix = f"{i}"
        candidate = f"{base[: (30 - len(suffix))]}{suffix}"
        i += 1
    return candidate


@extend_schema(tags=["Clientes"])
class ClienteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrOwnCliente]
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

    def create(self, request, *args, **kwargs):
        """
        Admin:
          - POST /clientes/ crea automáticamente un User + perfil Cliente
          - Devuelve además credenciales generadas (username/password)

        Usuario normal:
          - UPSERT sobre su propio Cliente
        """
        write = self.get_serializer(data=request.data)
        write.is_valid(raise_exception=True)
        data = write.validated_data

        # -----------------------
        # ADMIN: crea user + cliente
        # -----------------------
        if request.user.is_staff:
            nombre = (data.get("nombre") or "").strip()
            apellido = (data.get("apellido") or "").strip()

            if not nombre or not apellido:
                raise ValidationError({
                    "nombre": "Requerido para generar credenciales.",
                    "apellido": "Requerido para generar credenciales.",
                })

            now = timezone.localtime(timezone.now())
            dd = f"{now.day:02d}"
            mm = f"{now.month:02d}"

            username = _generate_unique_username(nombre, apellido)
            raw_password = f"{nombre}{apellido}{dd}{mm}"

            # Recomendación: crea todo en una transacción
            with transaction.atomic():
                user = User.objects.create(
                    username=username,
                    email="",          # email vacío permitido
                    is_active=True,
                    is_staff=False,
                )
                user.set_password(raw_password)
                user.save()

                # Tu SIGNAL ya crea Cliente automáticamente.
                # Aun así, por seguridad:
                cliente, _ = Cliente.objects.get_or_create(user=user)

                for k, v in data.items():
                    setattr(cliente, k, v)
                cliente.save()

            payload = ClienteReadSerializer(cliente).data
            # Incluimos credenciales generadas para que el admin pueda entregarlas.
            payload["generated_user"] = {
                "id": user.id,
                "username": user.username,
                "password": raw_password,
            }
            return Response(payload, status=status.HTTP_201_CREATED)

        # -----------------------
        # USUARIO NORMAL: upsert propio perfil
        # -----------------------
        cliente, created = Cliente.objects.get_or_create(user=request.user)
        for k, v in data.items():
            setattr(cliente, k, v)
        cliente.save()

        return Response(
            ClienteReadSerializer(cliente).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


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
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ClienteWriteSerializer

    def get_object(self):
        cliente, _ = Cliente.objects.get_or_create(user=self.request.user)
        return cliente

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(ClienteReadSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(ClienteReadSerializer(instance).data)
