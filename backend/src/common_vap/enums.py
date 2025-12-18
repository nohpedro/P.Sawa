from django.db.models import TextChoices

class EspaciosEstado(TextChoices):
    DISPONIBLE = "DISPONIBLE", "Disponible"
    MANTENIMIENTO = "MANTENIMIENTO", "Mantenimiento"
    FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO", "Fuera de servicio"

class ReservaEstado(TextChoices):
    # workflow
    PENDIENTE = "PENDIENTE", "Pendiente"        # cliente solicita
    CONFIRMADA = "CONFIRMADA", "Confirmada"     # admin confirma / reserva creada por admin

    # ciclo de vida
    ACTIVA = "ACTIVA", "Activa"                 # cuando inicio <= ahora < fin
    FINALIZADA = "FINALIZADA", "Finalizada"     # cuando fin <= ahora

    # cierre
    CANCELADA = "CANCELADA", "Cancelada"
    NO_SHOW = "NO_SHOW", "No show"
