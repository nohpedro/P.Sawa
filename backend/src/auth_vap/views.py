from django.contrib.auth import authenticate
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample

from .serializers import LoginInputSerializer, TokenAccessSerializer, LogoutInputSerializer
from .models import BlacklistedAccessToken
from users.models import MODULE_CHOICES, UserAccessProfile

@extend_schema(
    tags=["Auth"],
    request=LoginInputSerializer,
    responses={200: TokenAccessSerializer, 401: OpenApiResponse(description="Credenciales inválidas")},
    examples=[
        OpenApiExample("Solicitud", value={"username": "admin", "password": "admin"}, request_only=True),
        OpenApiExample("Respuesta", value={
            "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "user": {"id": 1, "username": "admin", "email": "admin@example.com"}
        }, response_only=True),
    ],
)
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = LoginInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = authenticate(username=s.validated_data["username"], password=s.validated_data["password"])
        if not user:
            return Response({"detail": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        access = AccessToken.for_user(user)
        profile, _ = UserAccessProfile.objects.get_or_create(user=user)
        modules = [key for key, _ in MODULE_CHOICES] if user.is_superuser else profile.normalized_modules()
        role = "superuser" if user.is_superuser else profile.role
        data = {
            "access": str(access),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or "",
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "role": role,
                "modules": modules,
            },
        }
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Auth"],
    request=LogoutInputSerializer,
    responses={205: OpenApiResponse(description="Sesión cerrada"), 400: OpenApiResponse(description="Token faltante/ inválido")},
    examples=[OpenApiExample("Solicitud", value={"token": "Bearer eyJhbGciOi..."}, request_only=True)],
)
class LogoutView(APIView):
    """
    Invalida el access token actual agregando su jti a la denylist.
    Toma el token del Authorization header (Bearer ...) o del body {"token": "..."}.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw = None

        # 1) Header Authorization
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if auth.lower().startswith("bearer "):
            raw = auth.split(" ", 1)[1].strip()

        # 2) Body (opcional)
        if not raw:
            raw = request.data.get("token")

        if not raw:
            return Response({"detail": "Token requerido (Header Authorization: Bearer <token> o body.token)"}, status=400)

        try:
            token = AccessToken(raw)
            jti = token.get("jti")
            user = request.user
            if not jti:
                return Response({"detail": "Token sin JTI"}, status=400)

            BlacklistedAccessToken.objects.get_or_create(jti=jti, user=user)
            return Response({"detail": "Sesión cerrada"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"detail": "Token inválido o expirado"}, status=400)
