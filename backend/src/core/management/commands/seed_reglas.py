from datetime import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from espacios.models import Regla
from core.management.commands._seed_espacios_utils import get_espacios


class Command(BaseCommand):
    help = "Seed: Reglas recurrentes por espacio."

    def handle(self, *args, **options):
        espacios = get_espacios()
        cancha1 = espacios.get("Cancha 1")
        cancha2 = espacios.get("Cancha 2")
        cancha3 = espacios.get("Cancha 3")
        hoy = timezone.localdate()

        if cancha1:
            Regla.objects.get_or_create(
                espacio=cancha1,
                frecuencia="WEEKLY",
                intervalo=1,
                weekday_mask="MO,WE,FR",
                hora_inicio=time(18, 0),
                hora_fin=time(20, 0),
                fecha_desde=hoy,
                defaults={"activo": True},
            )

        if cancha2:
            Regla.objects.get_or_create(
                espacio=cancha2,
                frecuencia="WEEKLY",
                intervalo=1,
                weekday_mask="TU,TH",
                hora_inicio=time(19, 0),
                hora_fin=time(21, 0),
                fecha_desde=hoy,
                defaults={"activo": True},
            )

        if cancha3:
            Regla.objects.get_or_create(
                espacio=cancha3,
                frecuencia="DAILY",
                intervalo=1,
                weekday_mask="",
                hora_inicio=time(8, 0),
                hora_fin=time(10, 0),
                fecha_desde=hoy,
                defaults={"activo": False},
            )

        self.stdout.write(self.style.SUCCESS("Reglas por espacio listas."))
