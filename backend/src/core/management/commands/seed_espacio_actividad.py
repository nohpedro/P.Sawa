from django.core.management.base import BaseCommand

from espacios.models import EspacioActividad
from core.management.commands._seed_espacios_utils import get_tipos, get_espacios


class Command(BaseCommand):
    help = "Seed: Asociaciones EspacioActividad con duración/precio/activo."

    def handle(self, *args, **options):
        tipos = get_tipos()
        espacios = get_espacios()

        cancha1 = espacios.get("Cancha 1")
        cancha2 = espacios.get("Cancha 2")
        cancha3 = espacios.get("Cancha 3")

        if not (cancha1 and cancha2):
            self.stdout.write(self.style.WARNING("Faltan espacios. Ejecuta primero seed_espacios."))
            return

        matrix = {
            cancha1: {
                "Voley": (60, 50, True),
                "Fútbol": (60, 70, True),
                "Básquet": (60, 55, True),
            },
            cancha2: {
                "Voley": (60, 45, True),
                "Fútbol": (60, 65, True),
                "Básquet": (60, 50, True),
            },
        }

        if cancha3:
            matrix[cancha3] = {
                "Voley": (60, 0, False),
                "Fútbol": (60, 0, False),
                "Básquet": (60, 0, False),
            }

        for espacio, cfg in matrix.items():
            for tipo_nombre, (dur, precio, activo) in cfg.items():
                tipo = tipos.get(tipo_nombre)
                if not tipo:
                    continue

                ea, created = EspacioActividad.objects.get_or_create(
                    espacio=espacio,
                    tipo=tipo,
                    defaults={"duracion_minutos": dur, "precio_base": precio, "activo": activo},
                )
                if not created:
                    changed = False
                    if ea.duracion_minutos != dur:
                        ea.duracion_minutos = dur
                        changed = True
                    if str(ea.precio_base) != str(precio):
                        ea.precio_base = precio
                        changed = True
                    if ea.activo != activo:
                        ea.activo = activo
                        changed = True
                    if changed:
                        ea.save()

        self.stdout.write(self.style.SUCCESS("Relaciones EspacioActividad listas."))
