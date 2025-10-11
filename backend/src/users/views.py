from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cliente
from .serializers import (
    UserListSerializer,
    UserWriteSerializer,
    ClienteSerializer,
)

User = get_user_model()


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsAdminOrSelf(permissions.BasePermission):
    def has_permission(self, request, view):
        if view.action in ("list", "create", "destroy"):
            return bool(request.user and request.user.is_staff)
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj == request.user


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


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cliente, _ = Cliente.objects.get_or_create(user=request.user)
        return Response(ClienteSerializer(cliente).data)

    def patch(self, request):
        cliente, _ = Cliente.objects.get_or_create(user=request.user)
        serializer = ClienteSerializer(cliente, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
