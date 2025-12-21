from rest_framework import serializers
from ..models import Regla, ReglaGlobal, Espacio


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
