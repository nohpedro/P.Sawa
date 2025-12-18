from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from espacios.models import Promocion
from core.management.commands._seed_espacios_utils import get_espacios


class Command(BaseCommand):
    help = "Seed: Promociones (global y por espacio)."

    def handle(self, *args, **options):
        espacios = get_espacios()
        cancha2 = espacios.get("Cancha 2")
        hoy = timezone.localdate()

        inicio_mes = hoy.replace(day=1)
        if inicio_mes.month == 12:
            fin_mes = inicio_mes.replace(year=inicio_mes.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            fin_mes = inicio_mes.replace(month=inicio_mes.month + 1, day=1) - timedelta(days=1)

        Promocion.objects.get_or_create(
            nombre="Promo 10% Mes Actual",
            defaults=dict(
                descripcion="Descuento general del 10% en todos los espacios durante el mes actual.",
                descuento_porcentaje=10,
                fecha_inicio=inicio_mes,
                fecha_fin=fin_mes,
                aplica_todos=True,
                activo=True,
            ),
        )

        promo_especifica, _ = Promocion.objects.get_or_create(
            nombre="Promo 20% Sede Norte",
            defaults=dict(
                descripcion="Descuento del 20% solo para espacios seleccionados (Sede Norte).",
                descuento_porcentaje=20,
                fecha_inicio=inicio_mes,
                fecha_fin=fin_mes,
                aplica_todos=False,
                activo=True,
            ),
        )

        if cancha2:
            promo_especifica.espacios.set([cancha2.id])

        self.stdout.write(self.style.SUCCESS("Promociones listas."))
