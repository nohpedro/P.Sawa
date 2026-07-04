from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(source="get_action_display", read_only=True)
    message = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "username",
            "action",
            "action_label",
            "module",
            "module_label",
            "target_model",
            "target_id",
            "target_repr",
            "affected_summary",
            "metadata",
            "message",
            "created_at",
            "updated_at",
        )

    def _format_changes(self, obj):
        changes = (obj.metadata or {}).get("changes") or []
        if not isinstance(changes, list):
            return ""

        parts = []
        for change in changes[:4]:
            if not isinstance(change, dict):
                continue
            label = change.get("label") or change.get("field") or "Campo"
            before = change.get("before") or "sin valor"
            after = change.get("after") or "sin valor"
            parts.append(f"{label} de {before} a {after}")

        remaining = len(changes) - len(parts)
        if remaining > 0:
            parts.append(f"{remaining} cambio(s) mas")

        return ", ".join(parts)

    def get_message(self, obj):
        username = obj.username or "Sistema"
        affected = obj.affected_summary or obj.target_repr or "un registro"
        when = obj.created_at.strftime("%d/%m/%Y %H:%M")

        if obj.action == AuditLog.Action.UPDATE:
            changes = self._format_changes(obj)
            if changes:
                return (
                    f"El usuario {username} edito {affected} en el modulo "
                    f"{obj.module_label}, cambiando {changes}, el {when}."
                )
            return (
                f"El usuario {username} edito {affected} en el modulo "
                f"{obj.module_label}, sin cambios relevantes detectados, el {when}."
            )

        return (
            f"El usuario {username} realizo la accion {obj.get_action_display()} "
            f"en el modulo {obj.module_label}, afectando a {affected}, "
            f"el {when}."
        )
