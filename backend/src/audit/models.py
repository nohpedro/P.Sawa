from django.conf import settings
from django.db import models

from common_vap.models import BaseModel


class AuditLog(BaseModel):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Creacion"
        UPDATE = "UPDATE", "Edicion"
        DELETE = "DELETE", "Eliminacion"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    username = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    module = models.CharField(max_length=50)
    module_label = models.CharField(max_length=120)
    target_model = models.CharField(max_length=120)
    target_id = models.CharField(max_length=80, blank=True)
    target_repr = models.CharField(max_length=255, blank=True)
    affected_summary = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
      db_table = "audit_log"
      ordering = ["-created_at"]
      indexes = [
          models.Index(fields=["created_at"]),
          models.Index(fields=["user", "created_at"]),
          models.Index(fields=["module", "action"]),
      ]

    def __str__(self):
        return f"{self.username or 'Sistema'} {self.action} {self.module_label}"
