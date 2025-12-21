from django.contrib.auth import get_user_model
from rest_framework import serializers

from common_vap.enums import ReservaEstado
from users.models import Cliente
from ..models import Reserva

User = get_user_model()


class ReservaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")
    usuario_username = serializers.ReadOnlyField(source="usuario.get_username")
    cliente_nombre = serializers.SerializerMethodField()
    cliente_apellido = serializers.SerializerMethodField()

    usuario = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )

    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.select_related("user").all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Reserva
        fields = (
            "id",
            "espacio",
            "espacio_nombre",
            "usuario",
            "usuario_username",
            "cliente",
            "cliente_nombre",
            "cliente_apellido",
            "actividad",
            "inicio",
            "fin",
            "estado_reserva",
            "notas",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        inicio = attrs.get("inicio") or getattr(self.instance, "inicio", None)
        fin = attrs.get("fin") or getattr(self.instance, "fin", None)
        if inicio and fin and fin <= inicio:
            raise serializers.ValidationError(
                {"fin": "La fecha/hora fin debe ser posterior a inicio."}
            )

        incoming_usuario = attrs.get("usuario", None)
        incoming_cliente = attrs.get("cliente", None)

        if not user.is_staff:
            if incoming_usuario and incoming_usuario != user:
                raise serializers.ValidationError(
                    {"usuario": "No puedes crear/editar reservas para otro usuario."}
                )

            if incoming_cliente and incoming_cliente.user_id != user.id:
                raise serializers.ValidationError(
                    {"cliente": "No puedes crear/editar reservas para otro cliente."}
                )

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        cliente_obj = validated_data.get("cliente")

        if cliente_obj is not None:
            validated_data["usuario"] = cliente_obj.user

        if user.is_staff:
            validated_data["usuario"] = validated_data.get("usuario") or user
            validated_data["estado_reserva"] = ReservaEstado.CONFIRMADA
        else:
            validated_data["usuario"] = user
            validated_data["estado_reserva"] = ReservaEstado.PENDIENTE
            validated_data["cliente"] = getattr(user, "cliente", None)

        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        if not user.is_staff:
            validated_data.pop("estado_reserva", None)
            validated_data.pop("usuario", None)
            validated_data.pop("cliente", None)

        cliente_obj = validated_data.get("cliente")
        if user.is_staff and cliente_obj is not None:
            validated_data["usuario"] = cliente_obj.user

        return super().update(instance, validated_data)

    def get_cliente_nombre(self, obj: Reserva) -> str:
        if obj.cliente_id:
            return getattr(obj.cliente, "nombre", "")
        return getattr(getattr(obj.usuario, "cliente", None), "nombre", "")

    def get_cliente_apellido(self, obj: Reserva) -> str:
        if obj.cliente_id:
            return getattr(obj.cliente, "apellido", "")
        return getattr(getattr(obj.usuario, "cliente", None), "apellido", "")
