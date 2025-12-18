from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Cliente

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_active", "is_staff", "date_joined"]


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=4)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "is_active", "is_staff"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ClienteReadSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Cliente
        fields = [
            "id", "username", "email",
            "nombre", "apellido", "telefono", "documento", "notas",
            "created_at", "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")


class ClienteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["nombre", "apellido", "telefono", "documento", "notas"]
