from rest_framework import serializers
from ..models import TipoActividad


class TipoActividadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoActividad
        fields = ("id", "nombre", "descripcion", "activo", "created_at", "updated_at")
