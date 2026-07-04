from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "username", "action", "module_label", "affected_summary")
    list_filter = ("action", "module", "created_at")
    search_fields = ("username", "target_repr", "affected_summary")
    readonly_fields = (
        "user",
        "username",
        "action",
        "module",
        "module_label",
        "target_model",
        "target_id",
        "target_repr",
        "affected_summary",
        "metadata",
        "created_at",
        "updated_at",
    )
