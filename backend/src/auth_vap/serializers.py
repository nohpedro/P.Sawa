from rest_framework import serializers

class LoginInputSerializer(serializers.Serializer):
    username = serializers.CharField(
        help_text="Nombre de usuario",

    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        help_text="Contraseña del usuario",

    )

class UserPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True, required=False)

class TokenAccessSerializer(serializers.Serializer):
    access = serializers.CharField()
    user = UserPublicSerializer()

class LogoutInputSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, help_text="Bearer access token (opcional si va en Header)")
