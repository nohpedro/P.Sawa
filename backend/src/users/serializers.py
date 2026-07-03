from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Cliente, MODULE_CHOICES, UserAccessProfile

User = get_user_model()


# =====================================================
# USER SERIALIZERS
# (se mantienen por si los usas en UserViewSet)
# =====================================================

class UserListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    modules = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "modules",
            "date_joined",
        ]

    def get_role(self, obj):
        if obj.is_superuser:
            return "superuser"
        profile, _ = UserAccessProfile.objects.get_or_create(user=obj)
        return profile.role

    def get_modules(self, obj):
        if obj.is_superuser:
            return [key for key, _ in MODULE_CHOICES]
        profile, _ = UserAccessProfile.objects.get_or_create(user=obj)
        return profile.normalized_modules()


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=4,
    )
    role = serializers.CharField(required=False, allow_blank=True)
    modules = serializers.ListField(
        child=serializers.ChoiceField(choices=[key for key, _ in MODULE_CHOICES]),
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "is_active",
            "is_staff",
            "role",
            "modules",
        ]

    def create(self, validated_data):
        role = validated_data.pop("role", None)
        modules = validated_data.pop("modules", None)
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        user.set_password(password or "123456")
        user.save()
        profile, _ = UserAccessProfile.objects.get_or_create(user=user)
        profile.role = role or ("admin" if user.is_staff else "operador")
        profile.modules = modules if modules is not None else UserAccessProfile.defaults_for_user(user)
        profile.save()
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        modules = validated_data.pop("modules", None)
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        profile, _ = UserAccessProfile.objects.get_or_create(user=instance)
        if role is not None:
            profile.role = role or profile.role
        if modules is not None:
            profile.modules = modules
        profile.save()
        return instance


class UserPasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(required=False, allow_blank=True, min_length=4)


# =====================================================
# CLIENTE SERIALIZERS
# =====================================================

class ClienteReadSerializer(serializers.ModelSerializer):
    """
    SOLO lectura.
    Expone datos del Cliente + info básica del User asociado.
    """
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Cliente
        fields = [
            "id",
            "username",
            "email",
            "nombre",
            "apellido",
            "telefono",
            "documento",
            "notas",
            "created_at",
            "updated_at",
        ]
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


class ClienteWriteSerializer(serializers.ModelSerializer):
    """
    SOLO escritura del perfil Cliente.

    - Admin: crea Cliente -> el ViewSet crea el User automáticamente
    - Usuario normal: edita su propio perfil
    - NO se recibe user_id
    """

    class Meta:
        model = Cliente
        fields = [
            "nombre",
            "apellido",
            "telefono",
            "documento",
            "notas",
        ]

    def validate(self, attrs):
        """
        Validaciones de negocio mínimas.
        El User se maneja en la vista, no aquí.
        """
        request = self.context.get("request")

        # Si es creación por admin, exigimos nombre y apellido
        if request and request.method == "POST" and request.user.is_staff:
            if not attrs.get("nombre"):
                raise serializers.ValidationError({
                    "nombre": "Este campo es obligatorio para crear un cliente."
                })
            if not attrs.get("apellido"):
                raise serializers.ValidationError({
                    "apellido": "Este campo es obligatorio para crear un cliente."
                })

        return attrs
