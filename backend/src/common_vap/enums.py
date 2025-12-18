from django.db.models import TextChoices

class EspaciosEstado(TextChoices):
    DISPONIBLE = "DISPONIBLE", "Disponible"
    MANTENIMIENTO = "MANTENIMIENTO", "Mantenimiento"
    FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO", "Fuera de servicio"

class ReservasEstado(TextChoices):
    PENDIENTE = "PENDIENTE", "Pendiente"
    CONFIRMADA = "CONFIRMADA", "Confirmada"
    CANCELADA = "CANCELADA", "Cancelada"
    NO_SHOW = "NO_SHOW", "No show"
