from django.core.management.base import BaseCommand

from espacios.models import Espacio
from core.management.commands._seed_espacios_utils import get_estado


class Command(BaseCommand):
    help = "Seed: Espacios (Cancha 1, Cancha 2, Cancha 3 opcional)."

    def handle(self, *args, **options):
        estado_disponible = get_estado("DISPONIBLE")
        estado_mantenimiento = get_estado("MANTENIMIENTO")

        Espacio.objects.get_or_create(
            nombre="Cancha 1",
            defaults=dict(
                descripcion="Cancha techada con iluminación LED.",
                capacidad=12,
                estado=estado_disponible,
                ubicacion="Sede Central",
                tags="techada,iluminada",
            ),
        )

        Espacio.objects.get_or_create(
            nombre="Cancha 2",
            defaults=dict(
                descripcion="Cancha abierta de césped sintético.",
                capacidad=12,
                estado=estado_disponible,
                ubicacion="Sede Norte",
                tags="abierta,cesped",
            ),
        )

        # Opcional (para probar casos de mantenimiento)
        Espacio.objects.get_or_create(
            nombre="Cancha 3",
            defaults=dict(
                descripcion="Cancha multiuso (entrenamiento).",
                capacidad=8,
                estado=estado_mantenimiento,
                ubicacion="Sede Central",
                tags="multiuso,entrenamiento",
            ),
        )

        self.stdout.write(self.style.SUCCESS("Espacios listos."))
