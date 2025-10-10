from django.db.models import TextChoices

class EspaciosEstado(TextChoices):
    DISPONIBLE="Disponible","DISPONIBLE"
    MANTENIMIENTO="Mantenito","MANTENIMIENTO"
    FUERA_DE_SERVICIO= "Fuera de servicio","FUERA_DE_SERVICIO"

class ReservasEstado(TextChoices):
    PENDIENTE="Pendiente","PENDIENTE"
    CONFIRMADA="Confirmada","CONFIRMADA"
    CANCELA="Cancelada","CANCELA"
    NO_SHOW="No show","NO_SHOW"
