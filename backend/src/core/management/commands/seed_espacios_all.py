from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Ejecuta todos los seeds de espacios en orden."

    def handle(self, *args, **options):
        call_command("seed_usuarios")
        call_command("seed_tipos_actividad")
        call_command("seed_espacios")
        call_command("seed_espacio_actividad")
        call_command("seed_calendarios")
        call_command("seed_reglas")
        call_command("seed_reglas_globales")
        call_command("seed_promociones")
        call_command("seed_reservas")
        self.stdout.write(self.style.SUCCESS("Seed completo de espacios ejecutado."))
