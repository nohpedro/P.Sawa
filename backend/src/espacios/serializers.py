from rest_framework import serializers
from .models import TipoActividad, Espacio, EspacioActividad, Calendario, Regla, ReglaGlobal, Promocion, Reserva

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
            "id", "espacio", "espacio_nombre", "tipo", "tipo_nombre",
            "duracion_minutos", "precio_base", "activo",
            "created_at", "updated_at"
        )

class EspacioSerializer(serializers.ModelSerializer):
    actividades = TipoActividadSerializer(many=True, read_only=True)
    tipo_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False,
        help_text="IDs de TipoActividad a asociar"
    )
    duracion_minutos_default = serializers.IntegerField(write_only=True, required=False)
    precio_base_default = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True, required=False)

    class Meta:
        model = Espacio
        fields = (
            "id", "nombre", "descripcion", "capacidad", "estado",
            "ubicacion", "tags",
            "actividades",           # lectura
            "tipo_ids",              # escritura
            "duracion_minutos_default", "precio_base_default",
            "created_at", "updated_at"
        )

    def _sync_actividades(self, espacio, tipo_ids, dur_def=None, precio_def=None):
        if tipo_ids is None:
            return
        # Trae existentes para no duplicar
        existentes = {ea.tipo_id: ea for ea in EspacioActividad.objects.filter(espacio=espacio)}
        for tipo_id in tipo_ids:
            if tipo_id in existentes:
                continue
            EspacioActividad.objects.create(
                espacio=espacio,
                tipo_id=tipo_id,
                duracion_minutos=dur_def or 60,
                precio_base=precio_def or 0
            )
        # Opcional: no eliminamos relaciones existentes para evitar side-effects

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
            "id", "espacio", "espacio_nombre",
            "fecha_inicio", "fecha_fin", "aforo_maximo",
            "titulo", "notas",
            "created_at", "updated_at"
        )

class ReglaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")

    class Meta:
        model = Regla
        fields = (
            "id", "espacio", "espacio_nombre",
            "frecuencia", "intervalo", "weekday_mask",
            "hora_inicio", "hora_fin",
            "fecha_desde", "fecha_hasta",
            "activo",
            "created_at", "updated_at"
        )
class ReglaGlobalSerializer(serializers.ModelSerializer):
    espacios = serializers.PrimaryKeyRelatedField(
        queryset=Espacio.objects.all(), many=True, required=False
    )

    class Meta:
        model = ReglaGlobal
        fields = (
            "id", "nombre", "descripcion",
            "frecuencia", "intervalo", "weekday_mask",
            "hora_inicio", "hora_fin",
            "fecha_desde", "fecha_hasta",
            "aplica_todos", "espacios", "activo",
            "created_at", "updated_at",
        )

    def validate(self, attrs):
        aplica_todos = attrs.get("aplica_todos", getattr(self.instance, "aplica_todos", True))
        espacios = attrs.get("espacios", None)
        if not aplica_todos and self.instance is None and not espacios:
            raise serializers.ValidationError("Si 'aplica_todos' es False, debes indicar al menos un espacio.")
        return attrs


class PromocionSerializer(serializers.ModelSerializer):
    espacios = serializers.PrimaryKeyRelatedField(
        queryset=Espacio.objects.all(), many=True, required=False
    )

    class Meta:
        model = Promocion
        fields = (
            "id", "nombre", "descripcion",
            "descuento_porcentaje",
            "fecha_inicio", "fecha_fin",
            "aplica_todos", "espacios", "activo",
            "created_at", "updated_at",
        )

    def validate(self, attrs):
        aplica_todos = attrs.get("aplica_todos", getattr(self.instance, "aplica_todos", False))
        espacios = attrs.get("espacios", None)
        if not aplica_todos and self.instance is None and not espacios:
            raise serializers.ValidationError("Si 'aplica_todos' es False, debes indicar al menos un espacio.")
        return attrs


class ReservaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")
    usuario_username = serializers.ReadOnlyField(source="usuario.get_username")
    # Si quieres exponer datos del perfil Cliente (siempre existe por tu signal)
    cliente_nombre = serializers.SerializerMethodField()
    cliente_apellido = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            "id",
            "espacio", "espacio_nombre",
            "usuario", "usuario_username",
            "cliente_nombre", "cliente_apellido",
            "actividad",
            "inicio", "fin",
            "estado",
            "notas",
            "created_at", "updated_at",
        )

    def get_cliente_nombre(self, obj):
        return getattr(getattr(obj.usuario, "cliente", None), "nombre", "")

    def get_cliente_apellido(self, obj):
        return getattr(getattr(obj.usuario, "cliente", None), "apellido", "")
