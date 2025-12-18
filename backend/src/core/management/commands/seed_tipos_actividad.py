from django.core.management.base import BaseCommand

from espacios.models import TipoActividad


class Command(BaseCommand):
    help = "Seed: Tipos de actividad (Voley, Fútbol, Básquet)."

    def handle(self, *args, **options):
        tipos_data = [
            ("Voley", "Voleibol"),
            ("Fútbol", "Fútbol 5/7"),
            ("Básquet", "Baloncesto"),
        ]

        for nombre, desc in tipos_data:
            tipo, created = TipoActividad.objects.get_or_create(
                nombre=nombre,
                defaults={"descripcion": desc, "activo": True},
            )
            if not created:
                changed = False
                if tipo.descripcion != desc:
                    tipo.descripcion = desc
                    changed = True
                if tipo.activo is False:
                    tipo.activo = True
                    changed = True
                if changed:
                    tipo.save(update_fields=["descripcion", "activo", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Tipos de actividad listos."))
