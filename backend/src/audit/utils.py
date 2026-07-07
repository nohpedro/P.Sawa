from datetime import date, datetime, time
from typing import Any

from django.utils import timezone

from .models import AuditLog


MODULE_LABELS = {
    "reservations": "Reservas",
    "spaces": "Espacios",
    "activities": "Actividades",
    "space_activities": "Designacion de actividades",
    "inventory": "Inventario",
    "inventory_promotions": "Promociones",
    "product_sales": "Venta de productos",
    "sales_history": "Historial de ventas",
    "audit": "Auditoria",
}


def create_audit_log(
    *,
    user,
    action: str,
    module: str,
    target: Any = None,
    target_id: str = "",
    target_repr: str = "",
    affected_summary: str = "",
    metadata: dict | None = None,
) -> AuditLog:
    username = ""
    if user and getattr(user, "is_authenticated", False):
        username = user.get_username()

    if target is not None:
        target_id = target_id or str(getattr(target, "pk", "") or "")
        target_repr = target_repr or str(target)

    return AuditLog.objects.create(
        user=user if user and getattr(user, "is_authenticated", False) else None,
        username=username,
        action=action,
        module=module,
        module_label=MODULE_LABELS.get(module, module),
        target_model=target.__class__.__name__ if target is not None else "",
        target_id=target_id,
        target_repr=target_repr[:255],
        affected_summary=(affected_summary or target_repr)[:255],
        metadata=metadata or {},
    )


class AuditLogMixin:
    audit_module = ""

    def get_audit_summary(self, instance) -> str:
        return str(instance)

    def get_audit_metadata(self, instance) -> dict:
        return {}

    def get_audit_field_labels(self) -> dict[str, str]:
        return {}

    def get_audit_tracked_fields(self, serializer) -> list[str]:
        return list(getattr(serializer, "validated_data", {}).keys())

    def _audit_field_label(self, field: str) -> str:
        labels = self.get_audit_field_labels()
        return labels.get(field, field.replace("_", " ").capitalize())

    def _audit_value(self, instance, field: str) -> str:
        if not instance or not hasattr(instance, field):
            return "sin valor"

        display = getattr(instance, f"get_{field}_display", None)
        value = display() if callable(display) else getattr(instance, field)

        if value is None:
            return "sin valor"
        if isinstance(value, bool):
            return "Si" if value else "No"
        if isinstance(value, datetime):
            if timezone.is_aware(value):
                value = timezone.localtime(value)
            return value.strftime("%d/%m/%Y %H:%M")
        if isinstance(value, date):
            return value.strftime("%d/%m/%Y")
        if isinstance(value, time):
            return value.strftime("%H:%M")

        return str(value)

    def _audit_changes(self, before_instance, after_instance, fields: list[str]) -> list[dict[str, str]]:
        changes = []
        for field in fields:
            before = self._audit_value(before_instance, field)
            after = self._audit_value(after_instance, field)
            if before == after:
                continue
            changes.append(
                {
                    "field": field,
                    "label": self._audit_field_label(field),
                    "before": before,
                    "after": after,
                }
            )
        return changes

    def _write_audit(self, action: str, instance, *, target_id: str = "", target_repr: str = ""):
        if not self.audit_module:
            return

        create_audit_log(
            user=getattr(self.request, "user", None),
            action=action,
            module=self.audit_module,
            target=instance,
            target_id=target_id,
            target_repr=target_repr,
            affected_summary=self.get_audit_summary(instance),
            metadata=self.get_audit_metadata(instance),
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._write_audit(AuditLog.Action.CREATE, instance)

    def perform_update(self, serializer):
        if not self.audit_module:
            serializer.save()
            return

        fields = self.get_audit_tracked_fields(serializer)
        before_instance = serializer.instance
        before_values = {
            field: self._audit_value(before_instance, field)
            for field in fields
        }
        instance = serializer.save()
        metadata = dict(self.get_audit_metadata(instance) or {})
        changes = []
        for field in fields:
            before = before_values.get(field, "sin valor")
            after = self._audit_value(instance, field)
            if before == after:
                continue
            changes.append(
                {
                    "field": field,
                    "label": self._audit_field_label(field),
                    "before": before,
                    "after": after,
                }
            )
        metadata["changes"] = changes

        create_audit_log(
            user=getattr(self.request, "user", None),
            action=AuditLog.Action.UPDATE,
            module=self.audit_module,
            target=instance,
            affected_summary=self.get_audit_summary(instance),
            metadata=metadata,
        )

    def perform_destroy(self, instance):
        target_id = str(getattr(instance, "pk", "") or "")
        target_repr = str(instance)
        summary = self.get_audit_summary(instance)
        super().perform_destroy(instance)
        create_audit_log(
            user=getattr(self.request, "user", None),
            action=AuditLog.Action.DELETE,
            module=self.audit_module,
            target=None,
            target_id=target_id,
            target_repr=target_repr,
            affected_summary=summary,
            metadata={},
        )
