from datetime import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from espacios.models import ReglaGlobal
from core.management.commands._seed_espacios_utils import get_espacios


class Command(BaseCommand):
    help = "Seed: Reglas globales (aplican a todos o a espacios específicos)."

    def handle(self, *args, **options):
        espacios = get_espacios()
        cancha1 = espacios.get("Cancha 1")
        cancha3 = espacios.get("Cancha 3")
        hoy = timezone.localdate()

        ReglaGlobal.objects.get_or_create(
            nombre="Regla Global Nocturna",
            defaults=dict(
                descripcion="Disponibilidad general nocturna para todos los espacios.",
                frecuencia="WEEKLY",
                intervalo=1,
                weekday_mask="MO,WE,FR",
                hora_inicio=time(18, 0),
                hora_fin=time(22, 0),
                fecha_desde=hoy,
                aplica_todos=True,
                activo=True,
            ),
        )

        rg_especifica, _ = ReglaGlobal.objects.get_or_create(
            nombre="Regla Global Solo Sede Central",
            defaults=dict(
                descripcion="Regla que aplica solo a espacios seleccionados (Sede Central).",
                frecuencia="WEEKLY",
                intervalo=1,
                weekday_mask="SA,SU",
                hora_inicio=time(9, 0),
                hora_fin=time(13, 0),
                fecha_desde=hoy,
                aplica_todos=False,
                activo=True,
            ),
        )

        ids = [e.id for e in [cancha1, cancha3] if e]
        if ids:
            rg_especifica.espacios.set(ids)

        self.stdout.write(self.style.SUCCESS("Reglas globales listas."))
