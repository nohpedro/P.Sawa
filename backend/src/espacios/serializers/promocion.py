from rest_framework import serializers
from ..models import Promocion, Espacio


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
