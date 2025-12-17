from datetime import date, datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from common_vap.enums import EspaciosEstado
from espacios.models import (
    TipoActividad,
    Espacio,
    EspacioActividad,
    Calendario,
    Regla,
    ReglaGlobal,
    Promocion,
    Reserva,
    ReservaEstado,
)


class Command(BaseCommand):
    help = "Crea datos iniciales de prueba para la app de espacios (tipos, espacios, reglas, promociones y reservas)."

    def handle(self, *args, **options):
        self.stdout.write("Iniciando carga de datos de ejemplo de ESPACIOS...")

        User = get_user_model()
        usernames = ["admin", "juan", "maria", "pedro", "ana"]
        users = {u.username: u for u in User.objects.filter(username__in=usernames)}
        faltantes = [u for u in usernames if u not in users]
        if faltantes:
            self.stdout.write(
                self.style.WARNING(
                    f"Faltan usuarios: {', '.join(faltantes)}. Ejecuta primero el comando seed de usuarios."
                )
            )

        # 1) Tipos de actividad
        tipos_data = [
            ("Voley", "Voleibol"),
            ("Fútbol", "Fútbol 5/7"),
            ("Básquet", "Baloncesto"),
        ]
        tipos = {}
        for nombre, desc in tipos_data:
            tipo, _ = TipoActividad.objects.get_or_create(
                nombre=nombre,
                defaults={"descripcion": desc, "activo": True},
            )
            if tipo.descripcion != desc or tipo.activo is False:
                tipo.descripcion = desc
                tipo.activo = True
                tipo.save(update_fields=["descripcion", "activo", "updated_at"])
            tipos[nombre] = tipo

        self.stdout.write(self.style.SUCCESS("Tipos de actividad listos."))

        # 2) Espacios
        estado_disponible = getattr(EspaciosEstado, "DISPONIBLE", EspaciosEstado.choices[0][0])
        estado_mantenimiento = getattr(EspaciosEstado, "MANTENIMIENTO", EspaciosEstado.choices[0][0])

        cancha1, _ = Espacio.objects.get_or_create(
            nombre="Cancha 1",
            defaults=dict(
                descripcion="Cancha techada con iluminación LED.",
                capacidad=12,
                estado=estado_disponible,
                ubicacion="Sede Central",
                tags="techada,iluminada",
            ),
        )

        cancha2, _ = Espacio.objects.get_or_create(
            nombre="Cancha 2",
            defaults=dict(
                descripcion="Cancha abierta de césped sintético.",
                capacidad=12,
                estado=estado_disponible,
                ubicacion="Sede Norte",
                tags="abierta,cesped",
            ),
        )

        # Un tercer espacio opcional para más casos (si no lo quieres, bórralo)
        cancha3, _ = Espacio.objects.get_or_create(
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

        # 3) EspacioActividad (asociaciones) con defaults distintos
        # Estructura: {espacio: {tipo_nombre: (duracion, precio, activo)}}
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
            cancha3: {
                "Voley": (60, 0, False),   # Ejemplo: no disponible por mantenimiento
                "Fútbol": (60, 0, False),
                "Básquet": (60, 0, False),
            },
        }

        for espacio, cfg in matrix.items():
            for tipo_nombre, (dur, precio, activo) in cfg.items():
                tipo = tipos[tipo_nombre]
                ea, created = EspacioActividad.objects.get_or_create(
                    espacio=espacio,
                    tipo=tipo,
                    defaults={
                        "duracion_minutos": dur,
                        "precio_base": precio,
                        "activo": activo,
                    },
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

        # Helpers para datetimes aware en TZ actual
        tz = timezone.get_current_timezone()

        def aware_dt(d: date, t: time) -> datetime:
            return timezone.make_aware(datetime.combine(d, t), tz)

        hoy = timezone.localdate()

        # 4) Calendarios de disponibilidad puntuales
        # Cancha 1: disponible en 2 rangos futuros
        c1_ini = aware_dt(hoy + timedelta(days=7), time(8, 0))
        c1_fin = aware_dt(hoy + timedelta(days=14), time(22, 0))
        Calendario.objects.get_or_create(
            espacio=cancha1,
            titulo="Disponibilidad Semana Próxima",
            defaults={
                "fecha_inicio": c1_ini,
                "fecha_fin": c1_fin,
                "aforo_maximo": 12,
                "notas": "Rango general de reserva para la próxima semana.",
            },
        )

        c1_ini2 = aware_dt(hoy + timedelta(days=15), time(8, 0))
        c1_fin2 = aware_dt(hoy + timedelta(days=21), time(22, 0))
        Calendario.objects.get_or_create(
            espacio=cancha1,
            titulo="Disponibilidad Semana Siguiente",
            defaults={
                "fecha_inicio": c1_ini2,
                "fecha_fin": c1_fin2,
                "aforo_maximo": 12,
                "notas": "Rango general de reserva para la semana siguiente.",
            },
        )

        # Cancha 2: disponibilidad de fin de semana (bloque)
        c2_ini = aware_dt(hoy + timedelta(days=9), time(10, 0))
        c2_fin = aware_dt(hoy + timedelta(days=10), time(20, 0))
        Calendario.objects.get_or_create(
            espacio=cancha2,
            titulo="Fin de semana habilitado",
            defaults={
                "fecha_inicio": c2_ini,
                "fecha_fin": c2_fin,
                "aforo_maximo": 12,
                "notas": "Disponibilidad especial para fin de semana.",
            },
        )

        self.stdout.write(self.style.SUCCESS("Calendarios listos."))

        # 5) Reglas por espacio
        # Cancha 1: semanal MO/WE/FR 18-20
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

        # Cancha 2: semanal TU/TH 19-21
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

        # Cancha 3: diaria 08-10 pero inactiva por mantenimiento
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

        # 6) Reglas Globales (una global y otra específica)
        rg_all, _ = ReglaGlobal.objects.get_or_create(
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
        # Aplica solo a Cancha 1 y Cancha 3
        rg_especifica.espacios.set([cancha1.id, cancha3.id])

        self.stdout.write(self.style.SUCCESS("Reglas globales listas."))

        # 7) Promociones (una global y una específica)
        inicio_mes = hoy.replace(day=1)
        if inicio_mes.month == 12:
            fin_mes = inicio_mes.replace(year=inicio_mes.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            fin_mes = inicio_mes.replace(month=inicio_mes.month + 1, day=1) - timedelta(days=1)

        promo_all, _ = Promocion.objects.get_or_create(
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
        promo_especifica.espacios.set([cancha2.id])

        self.stdout.write(self.style.SUCCESS("Promociones listas."))

        # 8) Reservas (si existen usuarios)
        # Se crean en rangos futuros sin solape para cada cancha
        def make_reserva(username: str, espacio: Espacio, actividad_nombre: str, d: date, h_ini: time, h_fin: time):
            user = users.get(username)
            if not user:
                return

            actividad = tipos.get(actividad_nombre)
            if not actividad:
                return

            inicio_dt = aware_dt(d, h_ini)
            fin_dt = aware_dt(d, h_fin)

            # Clave estable para no duplicar: (espacio, usuario, inicio, fin)
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

        self.stdout.write(self.style.SUCCESS("Seed de espacios completado con éxito."))
