from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from common_vap.models import BaseModel

MODULE_CHOICES = (
    ("availability", "Disponibilidad"),
    ("reservations", "Reservas"),
    ("history", "Historial"),
    ("customers", "Clientes"),
    ("sales_note_view", "Ver nota de venta"),
    ("sales_note_edit", "Editar nota de venta"),
    ("spaces", "Espacios"),
    ("activities", "Actividades"),
    ("space_activities", "Designacion de actividades"),
    ("inventory", "Inventario"),
    ("inventory_items_create", "Crear items de inventario"),
    ("inventory_batches", "Registrar lotes"),
    ("inventory_batch_history", "Historial de ingreso de lotes"),
    ("inventory_promotions", "Promociones"),
    ("inventory_sale_margin", "Editar margen venta"),
    ("product_sales", "Venta de productos"),
    ("sales_history", "Historial de ventas"),
    ("business_goals", "Metas empresariales"),
    ("users", "Usuarios y roles"),
    ("audit", "Auditoria"),
)

DEFAULT_CLIENT_MODULES = ["availability", "reservations"]
DEFAULT_STAFF_MODULES = [
    "availability",
    "reservations",
    "history",
    "customers",
    "sales_note_view",
    "sales_note_edit",
    "spaces",
    "activities",
    "space_activities",
    "inventory",
    "inventory_items_create",
    "inventory_batches",
    "inventory_batch_history",
    "inventory_promotions",
    "inventory_sale_margin",
    "product_sales",
    "sales_history",
    "business_goals",
]


class UserAccessProfile(BaseModel):
    """
    Configuracion simple de acceso por modulos para el usuario.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="access_profile",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_access_profiles",
    )
    role = models.CharField(max_length=30, default="operador")
    modules = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "users_access_profile"

    def __str__(self):
        return f"{self.user.get_username()} ({self.role})"

    @classmethod
    def defaults_for_user(cls, user):
        if getattr(user, "is_superuser", False):
            return [key for key, _ in MODULE_CHOICES]
        if getattr(user, "is_staff", False):
            return DEFAULT_STAFF_MODULES.copy()
        return DEFAULT_CLIENT_MODULES.copy()

    def normalized_modules(self):
        allowed = {key for key, _ in MODULE_CHOICES}
        return [module for module in (self.modules or []) if module in allowed]


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
        profile, profile_created = UserAccessProfile.objects.get_or_create(user=instance)
        if profile_created or not profile.modules:
            profile.modules = UserAccessProfile.defaults_for_user(instance)
            profile.role = "superuser" if instance.is_superuser else ("admin" if instance.is_staff else "cliente")
            profile.save(update_fields=["modules", "role", "updated_at"])

    transaction.on_commit(_ensure_cliente)
