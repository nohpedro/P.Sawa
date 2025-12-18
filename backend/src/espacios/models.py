from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

from common_vap.models import BaseModel
from common_vap.enums import EspaciosEstado, ReservaEstado
from users.models import Cliente


# =====================
# Catálogo de actividades
# =====================
class TipoActividad(BaseModel):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "espacios_tipo_actividad"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


# =====================
# Espacio físico (cancha, sala, etc.)
# =====================
class Espacio(BaseModel):
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.TextField(blank=True)
    capacidad = models.PositiveIntegerField(default=1)

    # Estado OPERATIVO del espacio (no depende de reservas)
    estado_operativo = models.CharField(
        max_length=30,
        choices=EspaciosEstado.choices,
        default=EspaciosEstado.DISPONIBLE,
    )

    ubicacion = models.CharField(max_length=255, blank=True)
    tags = models.CharField(
        max_length=255,
        blank=True,
        help_text="CSV: ej. techada,cesped,iluminacion"
    )

    actividades = models.ManyToManyField(
        TipoActividad,
        through="EspacioActividad",
        related_name="espacios",
    )

    class Meta:
        db_table = "espacios_espacio"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

    @property
    def estado_actual(self) -> str:
        """
        Estado dinámico para UI/Frontend (NO se guarda en DB):
        - Si estado_operativo != DISPONIBLE => "NO_DISPONIBLE"
        - Si hay reserva activa/confirmada/pendiente solapada ahora => "OCUPADO"
        - Caso contrario => "LIBRE"
        """
        if self.estado_operativo != EspaciosEstado.DISPONIBLE:
            return "NO_DISPONIBLE"

        now = timezone.now()
        # reservas que bloquean el uso "en este momento"
        blocking_states = (
            ReservaEstado.PENDIENTE,
            ReservaEstado.CONFIRMADA,
            ReservaEstado.ACTIVA,
        )
        has_overlap_now = self.reservas.filter(
            estado_reserva__in=blocking_states,
            inicio__lt=now,
            fin__gt=now,
        ).exists()

        return "OCUPADO" if has_overlap_now else "LIBRE"


class EspacioActividad(BaseModel):
    espacio = models.ForeignKey(
        Espacio,
        on_delete=models.CASCADE,
        related_name="espacio_actividades",
    )
    tipo = models.ForeignKey(
        TipoActividad,
        on_delete=models.CASCADE,
        related_name="espacio_actividades",
    )

    duracion_minutos = models.PositiveIntegerField(default=60)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "espacios_espacio_actividad"
        unique_together = ("espacio", "tipo")

    def __str__(self):
        return f"{self.espacio} - {self.tipo}"


# =====================
# Calendario puntual
# =====================
class Calendario(BaseModel):
    espacio = models.ForeignKey(
        Espacio,
        on_delete=models.CASCADE,
        related_name="calendarios",
    )
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    aforo_maximo = models.PositiveIntegerField()
    titulo = models.CharField(max_length=150)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "espacios_calendario"
        ordering = ["-fecha_inicio"]

    def clean(self):
        if self.fecha_fin <= self.fecha_inicio:
            raise ValidationError("fecha_fin debe ser posterior a fecha_inicio")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# =====================
# Reglas recurrentes
# =====================
class ReglaFrecuencia(models.TextChoices):
    DAILY = "DAILY", "Diaria"
    WEEKLY = "WEEKLY", "Semanal"
    MONTHLY = "MONTHLY", "Mensual"


class Regla(BaseModel):
    espacio = models.ForeignKey(
        Espacio,
        on_delete=models.CASCADE,
        related_name="reglas",
    )
    frecuencia = models.CharField(max_length=10, choices=ReglaFrecuencia.choices)
    intervalo = models.PositiveIntegerField(default=1)
    weekday_mask = models.CharField(
        max_length=50,
        blank=True,
        help_text='Ej: "MO,WE,FR"',
    )
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    fecha_desde = models.DateField(default=timezone.now)
    fecha_hasta = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "espacios_regla"

    def clean(self):
        errors = {}
        if self.hora_fin <= self.hora_inicio:
            errors["hora_fin"] = "hora_fin debe ser posterior a hora_inicio"
        if self.fecha_hasta and self.fecha_hasta < self.fecha_desde:
            errors["fecha_hasta"] = "fecha_hasta inválida"
        if errors:
            raise ValidationError(errors)


class ReglaGlobal(BaseModel):
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.TextField(blank=True)
    frecuencia = models.CharField(max_length=10, choices=ReglaFrecuencia.choices)
    intervalo = models.PositiveIntegerField(default=1)
    weekday_mask = models.CharField(max_length=50, blank=True)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    fecha_desde = models.DateField(default=timezone.now)
    fecha_hasta = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    aplica_todos = models.BooleanField(default=True)
    espacios = models.ManyToManyField(Espacio, blank=True, related_name="reglas_globales")

    class Meta:
        db_table = "espacios_regla_global"


# =====================
# Promociones
# =====================
class Promocion(BaseModel):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    descuento_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField(default=True)

    aplica_todos = models.BooleanField(default=False)
    espacios = models.ManyToManyField(Espacio, blank=True, related_name="promociones")

    class Meta:
        db_table = "espacios_promocion"


# =====================
# Reservas
# =====================
class Reserva(BaseModel):
    espacio = models.ForeignKey(
        Espacio,
        on_delete=models.PROTECT,
        related_name="reservas",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reservas",
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="reservas",
        null=True,
        blank=True,
    )

    actividad = models.ForeignKey(
        TipoActividad,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    inicio = models.DateTimeField()
    fin = models.DateTimeField()

    estado_reserva = models.CharField(
        max_length=20,
        choices=ReservaEstado.choices,
        default=ReservaEstado.PENDIENTE,
    )

    notas = models.TextField(blank=True)

    class Meta:
        db_table = "espacios_reserva"
        indexes = [
            models.Index(fields=["espacio", "inicio", "fin"]),
            models.Index(fields=["cliente", "inicio"]),
            models.Index(fields=["estado_reserva"]),
        ]

    def clean(self):
        errors = {}

        if self.fin <= self.inicio:
            errors["fin"] = "La fecha fin debe ser posterior al inicio."

        if self.espacio and self.espacio.estado_operativo != EspaciosEstado.DISPONIBLE:
            errors["espacio"] = "El espacio no está disponible para reservas."

        # Evitar solapamientos con estados que BLOQUEAN
        blocking_states = (
            ReservaEstado.PENDIENTE,
            ReservaEstado.CONFIRMADA,
            ReservaEstado.ACTIVA,   # importante si vas a usar ACTIVA
        )

        qs = Reserva.objects.filter(
            espacio=self.espacio,
            estado_reserva__in=blocking_states,
            inicio__lt=self.fin,
            fin__gt=self.inicio,
        )
        if self.pk:
            qs = qs.exclude(pk=self.pk)

        if qs.exists():
            errors["inicio"] = "Existe una reserva que se solapa."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Auto-asignar cliente desde el usuario si existe el perfil
        if self.usuario_id and not self.cliente_id:
            self.cliente = getattr(self.usuario, "cliente", None)

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.espacio} | {self.inicio} - {self.fin}"
