import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("username", models.CharField(blank=True, max_length=150)),
                ("action", models.CharField(choices=[("CREATE", "Creacion"), ("UPDATE", "Edicion"), ("DELETE", "Eliminacion")], max_length=20)),
                ("module", models.CharField(max_length=50)),
                ("module_label", models.CharField(max_length=120)),
                ("target_model", models.CharField(max_length=120)),
                ("target_id", models.CharField(blank=True, max_length=80)),
                ("target_repr", models.CharField(blank=True, max_length=255)),
                ("affected_summary", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "audit_log",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["created_at"], name="audit_log_created_0ffab1_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user", "created_at"], name="audit_log_user_id_096c0c_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["module", "action"], name="audit_log_module_850e18_idx"),
        ),
    ]
