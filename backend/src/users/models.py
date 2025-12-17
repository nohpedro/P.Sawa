from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from common_vap.models import BaseModel

class Cliente(BaseModel):
    """
    Perfil extendido del usuario.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cliente"
    )
    nombre = models.CharField(max_length=100, blank=True)
    apellido = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    documento = models.CharField(max_length=50, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=["apellido", "nombre"])]

    def __str__(self):
        return f"{self.nombre} {self.apellido}".strip() or self.user.get_username()


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_or_update_cliente(sender, instance, created, **kwargs):
    """
    Crea automáticamente el perfil Cliente al crear un User.
    """
    from django.db import transaction

    def _ensure_cliente():
        Cliente.objects.get_or_create(user=instance)

    transaction.on_commit(_ensure_cliente)
