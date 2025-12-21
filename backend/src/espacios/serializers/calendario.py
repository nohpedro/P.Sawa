from rest_framework import serializers
from ..models import Calendario


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
