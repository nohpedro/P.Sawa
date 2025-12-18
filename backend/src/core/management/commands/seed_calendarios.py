from datetime import time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from espacios.models import Calendario
from core.management.commands._seed_espacios_utils import get_espacios, aware_dt


class Command(BaseCommand):
    help = "Seed: Calendarios de disponibilidad puntuales."

    def handle(self, *args, **options):
        espacios = get_espacios()
        cancha1 = espacios.get("Cancha 1")
        cancha2 = espacios.get("Cancha 2")

        if not (cancha1 and cancha2):
            self.stdout.write(self.style.WARNING("Faltan espacios. Ejecuta primero seed_espacios."))
            return

        hoy = timezone.localdate()

        c1_ini = aware_dt(hoy + timedelta(days=7), time(8, 0))
        c1_fin = aware_dt(hoy + timedelta(days=14), time(22, 0))
        Calendario.objects.get_or_create(
            espacio=cancha1,
            titulo="Disponibilidad Semana Próxima",
            defaults={"fecha_inicio": c1_ini, "fecha_fin": c1_fin, "aforo_maximo": 12, "notas": "Rango general de reserva para la próxima semana."},
        )

        c1_ini2 = aware_dt(hoy + timedelta(days=15), time(8, 0))
        c1_fin2 = aware_dt(hoy + timedelta(days=21), time(22, 0))
        Calendario.objects.get_or_create(
            espacio=cancha1,
            titulo="Disponibilidad Semana Siguiente",
            defaults={"fecha_inicio": c1_ini2, "fecha_fin": c1_fin2, "aforo_maximo": 12, "notas": "Rango general de reserva para la semana siguiente."},
        )

        c2_ini = aware_dt(hoy + timedelta(days=9), time(10, 0))
        c2_fin = aware_dt(hoy + timedelta(days=10), time(20, 0))
        Calendario.objects.get_or_create(
            espacio=cancha2,
            titulo="Fin de semana habilitado",
            defaults={"fecha_inicio": c2_ini, "fecha_fin": c2_fin, "aforo_maximo": 12, "notas": "Disponibilidad especial para fin de semana."},
        )

        self.stdout.write(self.style.SUCCESS("Calendarios listos."))
