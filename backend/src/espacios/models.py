from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

from common_vap.models import BaseModel
from common_vap.enums import EspaciosEstado  # Debe exponer .choices (TextChoices)


# ---------------------
# Catálogo de Actividades
# ---------------------
class TipoActividad(BaseModel):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "espacios_tipo_actividad"
        verbose_name = "Tipo de Actividad"
        verbose_name_plural = "Tipos de Actividad"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


# ---------------------
# Espacio físico
# ---------------------
class Espacio(BaseModel):
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.TextField(blank=True)
    capacidad = models.PositiveIntegerField(default=1)
    estado = models.CharField(max_length=30, choices=EspaciosEstado.choices)
    ubicacion = models.CharField(max_length=255, blank=True)
    tags = models.CharField(max_length=255, blank=True, help_text="CSV: ej. techada,cesped,iluminación")

    # relación M2M usando el intermedio
    actividades = models.ManyToManyField(
        TipoActividad, through="EspacioActividad", related_name="espacios"
    )

    class Meta:
        db_table = "espacios_espacio"
        verbose_name = "Espacio"
        verbose_name_plural = "Espacios"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class EspacioActividad(BaseModel):
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE, related_name="espacio_actividades")
    tipo = models.ForeignKey(TipoActividad, on_delete=models.CASCADE, related_name="espacio_actividades")
    duracion_minutos = models.PositiveIntegerField(default=60)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "espacios_espacio_actividad"
        verbose_name = "Actividad por Espacio"
        verbose_name_plural = "Actividades por Espacio"
        unique_together = (("espacio", "tipo"),)
        ordering = ["espacio__nombre", "tipo__nombre"]

    def __str__(self):
        return f"{self.espacio} - {self.tipo}"


# ---------------------
# Disponibilidad puntual (rango de fechas)
# ---------------------
class Calendario(BaseModel):
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE, related_name="calendarios")
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    aforo_maximo = models.PositiveIntegerField()
    titulo = models.CharField(max_length=150)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "espacios_calendario"
        verbose_name = "Calendario de Espacio"
        verbose_name_plural = "Calendarios de Espacio"
        ordering = ["-fecha_inicio"]

    def clean(self):
        if self.fecha_fin <= self.fecha_inicio:
            raise ValidationError({"fecha_fin": "La fecha_fin debe ser posterior a fecha_inicio."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ---------------------
# Reglas recurrentes (RRULE simplificado)
# ---------------------
class ReglaFrecuencia(models.TextChoices):
    DAILY = "DAILY", "Diaria"
    WEEKLY = "WEEKLY", "Semanal"
    MONTHLY = "MONTHLY", "Mensual"


VALID_WEEKDAYS = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}


class Regla(BaseModel):
    espacio = models.ForeignKey(Espacio, on_delete=models.CASCADE, related_name="reglas")
    frecuencia = models.CharField(max_length=10, choices=ReglaFrecuencia.choices)
    intervalo = models.PositiveIntegerField(default=1, help_text="Cada cuántas unidades se repite (>=1)")
    weekday_mask = models.CharField(
        max_length=50,
        blank=True,
        help_text='Sólo para WEEKLY: CSV con días, ej. "MO,WE,FR"'
    )
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    fecha_desde = models.DateField(default=timezone.now)
    fecha_hasta = models.DateField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "espacios_regla"
        verbose_name = "Regla de Disponibilidad"
        verbose_name_plural = "Reglas de Disponibilidad"
        ordering = ["-fecha_desde", "espacio__nombre"]

    def clean(self):
        errors = {}
        if self.hora_fin <= self.hora_inicio:
            errors["hora_fin"] = "La hora_fin debe ser posterior a hora_inicio."
        if self.fecha_hasta and self.fecha_hasta < self.fecha_desde:
            errors["fecha_hasta"] = "La fecha_hasta debe ser igual o posterior a fecha_desde."
        if self.frecuencia == ReglaFrecuencia.WEEKLY:
            if not self.weekday_mask:
                errors["weekday_mask"] = "Para frecuencia semanal, weekday_mask es obligatorio."
            else:
                tokens = [t.strip() for t in self.weekday_mask.split(",") if t.strip()]
                invalid = [t for t in tokens if t not in VALID_WEEKDAYS]
                if invalid:
                    errors["weekday_mask"] = f"Códigos inválidos: {', '.join(invalid)}."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ReglaGlobal(BaseModel):
    """
    Regla de disponibilidad/indisponibilidad recurrente que puede aplicar a
    todos los espacios o a un subconjunto de ellos.
    Si aplica_todos=False, usar la M2M 'espacios' para acotar el alcance.
    """
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.TextField(blank=True)
    frecuencia = models.CharField(max_length=10, choices=ReglaFrecuencia.choices)
    intervalo = models.PositiveIntegerField(default=1, help_text="Cada cuántas unidades se repite (>=1)")
    weekday_mask = models.CharField(
        max_length=50, blank=True,
        help_text='Para WEEKLY: CSV ej. "MO,WE,FR". Para DAILY/MONTHLY se ignora.'
    )
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    fecha_desde = models.DateField(default=timezone.now)
    fecha_hasta = models.DateField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    aplica_todos = models.BooleanField(default=True)
    espacios = models.ManyToManyField("Espacio", blank=True, related_name="reglas_globales")

    class Meta:
        db_table = "espacios_regla_global"
        verbose_name = "Regla Global de Disponibilidad"
        verbose_name_plural = "Reglas Globales de Disponibilidad"
        ordering = ["-fecha_desde", "nombre"]

    def clean(self):
        errors = {}
        if self.hora_fin <= self.hora_inicio:
            errors["hora_fin"] = "La hora_fin debe ser posterior a hora_inicio."
        if self.fecha_hasta and self.fecha_hasta < self.fecha_desde:
            errors["fecha_hasta"] = "La fecha_hasta debe ser igual o posterior a fecha_desde."
        if self.frecuencia == ReglaFrecuencia.WEEKLY and self.weekday_mask:
            tokens = [t.strip() for t in self.weekday_mask.split(",") if t.strip()]
            invalid = [t for t in tokens if t not in VALID_WEEKDAYS]
            if invalid:
                errors["weekday_mask"] = f"Códigos inválidos: {', '.join(invalid)}."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        alcance = "Todos" if self.aplica_todos else "Algunos"
        return f"{self.nombre} ({alcance})"


class Promocion(BaseModel):
    """
    Descuentos sobre precio_base de EspacioActividad (o capa superior).
    La lógica de aplicación del descuento se resuelve en la capa de dominio/servicio
    al cotizar una reserva (no aquí).
    """
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    descuento_porcentaje = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="0 a 100"
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField(default=True)

    aplica_todos = models.BooleanField(default=False)
    espacios = models.ManyToManyField("Espacio", blank=True, related_name="promociones")

    class Meta:
        db_table = "espacios_promocion"
        verbose_name = "Promoción"
        verbose_name_plural = "Promociones"
        ordering = ["-fecha_inicio", "nombre"]

    def clean(self):
        errors = {}
        if self.fecha_fin < self.fecha_inicio:
            errors["fecha_fin"] = "La fecha_fin debe ser igual o posterior a fecha_inicio."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        alcance = "Todos" if self.aplica_todos else "Seleccionados"
        return f"{self.nombre} ({self.descuento_porcentaje}% - {alcance})"


# ---------------------
# Reserva / Uso del espacio por un usuario (cliente)
# ---------------------
class ReservaEstado(models.TextChoices):
    RESERVADA = "RESERVADA", "Reservada"
    ACTIVA = "ACTIVA", "Activa"
    CANCELADA = "CANCELADA", "Cancelada"
    FINALIZADA = "FINALIZADA", "Finalizada"


class Reserva(BaseModel):
    """
    Registra qué usuario/cliente usa qué espacio y en qué rango de tiempo.
    Por ahora el cliente no "usa el sistema"; esto sirve para tener trazabilidad.

    - usuario: settings.AUTH_USER_MODEL (el perfil Cliente se obtiene con user.cliente)
    - actividad: opcional (qué deporte se realizará). Si luego quieres precio/duración real,
      conviene apuntar a EspacioActividad en vez de TipoActividad.
    """
    espacio = models.ForeignKey(Espacio, on_delete=models.PROTECT, related_name="reservas")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reservas")
    actividad = models.ForeignKey(TipoActividad, on_delete=models.PROTECT, null=True, blank=True)

    inicio = models.DateTimeField()
    fin = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ReservaEstado.choices, default=ReservaEstado.RESERVADA)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "espacios_reserva"
        verbose_name = "Reserva"
        verbose_name_plural = "Reservas"
        ordering = ["-inicio"]
        indexes = [
            models.Index(fields=["espacio", "inicio", "fin"]),
            models.Index(fields=["usuario", "inicio"]),
            models.Index(fields=["estado"]),
        ]

    def clean(self):
        errors = {}

        # 1) coherencia básica
        if self.fin <= self.inicio:
            errors["fin"] = "La fecha/hora fin debe ser posterior a inicio."

        # 2) si hay actividad, debe estar habilitada en el espacio (opcional pero recomendado)
        if self.actividad_id:
            existe = EspacioActividad.objects.filter(
                espacio=self.espacio, tipo=self.actividad, activo=True
            ).exists()
            if not existe:
                errors["actividad"] = "Esta actividad no está habilitada para el espacio."

        # 3) evitar solapes (para estados que ocupan el espacio)
        if self.espacio_id and self.inicio and self.fin:
            ocupa = {ReservaEstado.RESERVADA, ReservaEstado.ACTIVA}
            qs = Reserva.objects.filter(espacio_id=self.espacio_id, estado__in=ocupa)
            if self.pk:
                qs = qs.exclude(pk=self.pk)

            # solape: inicio < otro.fin AND fin > otro.inicio
            qs = qs.filter(inicio__lt=self.fin, fin__gt=self.inicio)
            if qs.exists():
                errors["inicio"] = "Existe una reserva que se solapa con el rango indicado para este espacio."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.espacio} | {self.usuario} | {self.inicio} - {self.fin}"
