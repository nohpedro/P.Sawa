from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.utils import timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="Cliente",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at", models.DateTimeField(default=timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("nombre", models.CharField(blank=True, max_length=100)),
                ("apellido", models.CharField(blank=True, max_length=100)),
                ("telefono", models.CharField(blank=True, max_length=30)),
                ("documento", models.CharField(blank=True, max_length=50)),
                ("notas", models.TextField(blank=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cliente",
                        to="auth.user",
                    ),
                ),
            ],
            options={
                "indexes": [models.Index(fields=["apellido", "nombre"], name="users_clien_apellid_0e4c20_idx")],
            },
        ),
    ]
