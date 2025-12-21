from django.contrib.auth import get_user_model
from rest_framework import serializers

from common_vap.enums import ReservaEstado
from users.models import Cliente
from .models import (
    TipoActividad,
    Espacio,
    EspacioActividad,
    Calendario,
    Regla,
    ReglaGlobal,
    Promocion,
    Reserva,
)

User = get_user_model()


class TipoActividadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoActividad
        fields = ("id", "nombre", "descripcion", "activo", "created_at", "updated_at")


class EspacioActividadSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")
    tipo_nombre = serializers.ReadOnlyField(source="tipo.nombre")

    class Meta:
        model = EspacioActividad
        fields = (
            "id",
            "espacio",
            "espacio_nombre",
            "tipo",
            "tipo_nombre",
            "duracion_minutos",
            "precio_base",
            "activo",
            "created_at",
            "updated_at",
        )


class EspacioSerializer(serializers.ModelSerializer):
    # lectura
    actividades = TipoActividadSerializer(many=True, read_only=True)

    # estado actual calculado (propiedad del modelo)
    estado_actual = serializers.CharField(read_only=True)

    # escritura
    tipo_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="IDs de TipoActividad a asociar",
    )
    duracion_minutos_default = serializers.IntegerField(write_only=True, required=False)
    precio_base_default = serializers.DecimalField(
        max_digits=10, decimal_places=2, write_only=True, required=False
    )

    class Meta:
        model = Espacio
        fields = (
            "id",
            "nombre",
            "descripcion",
            "capacidad",
            "estado_operativo",   # <- antes tenías "estado"
            "estado_actual",      # <- nuevo para GET
            "ubicacion",
            "tags",
            "actividades",        # lectura
            "tipo_ids",           # escritura
            "duracion_minutos_default",
            "precio_base_default",
            "created_at",
            "updated_at",
        )

    def _sync_actividades(self, espacio, tipo_ids, dur_def=None, precio_def=None):
        if tipo_ids is None:
            return

        existentes = {
            ea.tipo_id: ea
            for ea in EspacioActividad.objects.filter(espacio=espacio)
        }

        for tipo_id in tipo_ids:
            if tipo_id in existentes:
                continue
            EspacioActividad.objects.create(
                espacio=espacio,
                tipo_id=tipo_id,
                duracion_minutos=dur_def or 60,
                precio_base=precio_def or 0,
            )

    def create(self, validated_data):
        tipo_ids = validated_data.pop("tipo_ids", None)
        dur_def = validated_data.pop("duracion_minutos_default", None)
        precio_def = validated_data.pop("precio_base_default", None)

        espacio = super().create(validated_data)
        self._sync_actividades(espacio, tipo_ids, dur_def, precio_def)
        return espacio

    def update(self, instance, validated_data):
        tipo_ids = validated_data.pop("tipo_ids", None)
        dur_def = validated_data.pop("duracion_minutos_default", None)
        precio_def = validated_data.pop("precio_base_default", None)

        espacio = super().update(instance, validated_data)
        self._sync_actividades(espacio, tipo_ids, dur_def, precio_def)
        return espacio


class CalendarioSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")

    class Meta:
        model = Calendario
        fields = (
            "id",
            "espacio",
            "espacio_nombre",
            "fecha_inicio",
            "fecha_fin",
            "aforo_maximo",
            "titulo",
            "notas",
            "created_at",
            "updated_at",
        )


class ReglaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")

    class Meta:
        model = Regla
        fields = (
            "id",
            "espacio",
            "espacio_nombre",
            "frecuencia",
            "intervalo",
            "weekday_mask",
            "hora_inicio",
            "hora_fin",
            "fecha_desde",
            "fecha_hasta",
            "activo",
            "created_at",
            "updated_at",
        )


class ReglaGlobalSerializer(serializers.ModelSerializer):
    espacios = serializers.PrimaryKeyRelatedField(
        queryset=Espacio.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = ReglaGlobal
        fields = (
            "id",
            "nombre",
            "descripcion",
            "frecuencia",
            "intervalo",
            "weekday_mask",
            "hora_inicio",
            "hora_fin",
            "fecha_desde",
            "fecha_hasta",
            "aplica_todos",
            "espacios",
            "activo",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        aplica_todos = attrs.get(
            "aplica_todos",
            getattr(self.instance, "aplica_todos", True),
        )
        espacios = attrs.get("espacios", None)

        if not aplica_todos and self.instance is None and not espacios:
            raise serializers.ValidationError(
                "Si 'aplica_todos' es False, debes indicar al menos un espacio."
            )
        return attrs


class PromocionSerializer(serializers.ModelSerializer):
    espacios = serializers.PrimaryKeyRelatedField(
        queryset=Espacio.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Promocion
        fields = (
            "id",
            "nombre",
            "descripcion",
            "descuento_porcentaje",
            "fecha_inicio",
            "fecha_fin",
            "aplica_todos",
            "espacios",
            "activo",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        aplica_todos = attrs.get(
            "aplica_todos",
            getattr(self.instance, "aplica_todos", False),
        )
        espacios = attrs.get("espacios", None)

        if not aplica_todos and self.instance is None and not espacios:
            raise serializers.ValidationError(
                "Si 'aplica_todos' es False, debes indicar al menos un espacio."
            )
        return attrs


class ReservaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")
    usuario_username = serializers.ReadOnlyField(source="usuario.get_username")
    cliente_nombre = serializers.SerializerMethodField()
    cliente_apellido = serializers.SerializerMethodField()

    # IMPORTANTE: hacer usuario opcional para que no dé 400 si no viene en payload
    usuario = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )

    # Aceptar cliente desde el frontend (lo que hoy estás enviando: clienteId)
    # Si tu Cliente.id es UUID, DRF lo resuelve igual con PrimaryKeyRelatedField.
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
            "usuario",            # ahora opcional
            "usuario_username",
            "cliente",            # ahora aceptado en escritura
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

        # Usuario normal: no puede crear/editar para otro usuario
        if not user.is_staff:
            # si mandan usuario explícito, debe ser él mismo
            if incoming_usuario and incoming_usuario != user:
                raise serializers.ValidationError(
                    {"usuario": "No puedes crear/editar reservas para otro usuario."}
                )

            # si mandan cliente explícito, debe pertenecerle
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

        # Si viene cliente, derivamos usuario desde cliente.user (esto arregla tu front)
        if cliente_obj is not None:
            validated_data["usuario"] = cliente_obj.user

        if user.is_staff:
            # admin: si no mandó usuario ni cliente, se toma a sí mismo
            validated_data["usuario"] = validated_data.get("usuario") or user
            validated_data["estado_reserva"] = ReservaEstado.CONFIRMADA
        else:
            # no admin: siempre es él mismo y queda PENDIENTE
            validated_data["usuario"] = user
            validated_data["estado_reserva"] = ReservaEstado.PENDIENTE
            # si mandó cliente, igual lo forzamos al perfil del user
            validated_data["cliente"] = getattr(user, "cliente", None)

        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        # Usuario normal: no puede cambiar estado ni usuario ni cliente
        if not user.is_staff:
            validated_data.pop("estado_reserva", None)
            validated_data.pop("usuario", None)
            validated_data.pop("cliente", None)

        # Si admin manda cliente en update, sincroniza usuario = cliente.user
        cliente_obj = validated_data.get("cliente")
        if user.is_staff and cliente_obj is not None:
            validated_data["usuario"] = cliente_obj.user

        return super().update(instance, validated_data)

    def get_cliente_nombre(self, obj: Reserva) -> str:
        # Prioriza obj.cliente si está, sino deriva del perfil del usuario
        if obj.cliente_id:
            return getattr(obj.cliente, "nombre", "")
        return getattr(getattr(obj.usuario, "cliente", None), "nombre", "")

    def get_cliente_apellido(self, obj: Reserva) -> str:
        if obj.cliente_id:
            return getattr(obj.cliente, "apellido", "")
        return getattr(getattr(obj.usuario, "cliente", None), "apellido", "")