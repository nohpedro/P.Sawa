from rest_framework import serializers
from ..models import Espacio, EspacioActividad, TipoActividad
from .actividad import TipoActividadSerializer


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
    actividades = TipoActividadSerializer(many=True, read_only=True)
    estado_actual = serializers.CharField(read_only=True)

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
            "estado_operativo",
            "estado_actual",
            "ubicacion",
            "tags",
            "actividades",
            "tipo_ids",
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
