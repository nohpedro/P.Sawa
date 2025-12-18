from datetime import time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from espacios.models import Reserva, ReservaEstado
from core.management.commands._seed_espacios_utils import get_users_map, get_tipos, get_espacios, aware_dt


class Command(BaseCommand):
    help = "Seed: Reservas (requiere usuarios y datos base de espacios)."

    def handle(self, *args, **options):
        users = get_users_map()
        usernames = ["admin", "juan", "maria", "pedro", "ana"]
        faltantes = [u for u in usernames if u not in users]
        if faltantes:
            self.stdout.write(self.style.WARNING(
                f"Faltan usuarios: {', '.join(faltantes)}. Ejecuta primero seed_usuarios."
            ))
            return

        tipos = get_tipos()
        espacios = get_espacios()
        cancha1 = espacios.get("Cancha 1")
        cancha2 = espacios.get("Cancha 2")

        if not (cancha1 and cancha2) or not tipos:
            self.stdout.write(self.style.WARNING("Faltan espacios/tipos. Ejecuta seeds base primero."))
            return

        hoy = timezone.localdate()

        def make_reserva(username: str, espacio, actividad_nombre: str, d, h_ini, h_fin):
            user = users.get(username)
            actividad = tipos.get(actividad_nombre)
            if not user or not actividad:
                return

            inicio_dt = aware_dt(d, h_ini)
            fin_dt = aware_dt(d, h_fin)

            Reserva.objects.get_or_create(
                espacio=espacio,
                usuario=user,
                inicio=inicio_dt,
                fin=fin_dt,
                defaults=dict(
                    actividad=actividad,
                    estado=ReservaEstado.RESERVADA,
                    notas=f"Reserva seed: {actividad_nombre}",
                ),
            )

        d1 = hoy + timedelta(days=8)
        d2 = hoy + timedelta(days=9)
        d3 = hoy + timedelta(days=10)

        make_reserva("juan", cancha1, "Fútbol", d1, time(18, 0), time(19, 0))
        make_reserva("maria", cancha1, "Voley", d1, time(19, 0), time(20, 0))
        make_reserva("pedro", cancha2, "Básquet", d2, time(19, 0), time(20, 0))
        make_reserva("ana", cancha2, "Fútbol", d2, time(20, 0), time(21, 0))
        make_reserva("admin", cancha1, "Básquet", d3, time(18, 0), time(19, 0))

        self.stdout.write(self.style.SUCCESS("Reservas listas."))
