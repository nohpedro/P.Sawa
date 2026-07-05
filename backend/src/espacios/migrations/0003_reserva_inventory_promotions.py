import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("espacios", "0002_alter_calendario_options_alter_espacio_options_and_more"),
        ("inventario", "0004_inventorypromotion_priority_choices"),
        ("users", "0004_useraccessprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="reserva",
            name="descuento_promocion",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reservas_descuento",
                to="inventario.inventorypromotion",
            ),
        ),
        migrations.AddField(
            model_name="reserva",
            name="minutos_credito_aplicados",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="reserva",
            name="minutos_promocion_gratis_aplicados",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="reserva",
            name="minutos_promocion_pendientes_generados",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="reserva",
            name="promociones_aplicadas",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name="ReservaPromotionCredit",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("minutos_total", models.PositiveIntegerField(default=0)),
                ("minutos_disponibles", models.PositiveIntegerField(default=0)),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("PENDIENTE", "Pendiente"),
                            ("PARCIAL", "Parcial"),
                            ("USADO", "Usado"),
                            ("CANCELADO", "Cancelado"),
                        ],
                        default="PENDIENTE",
                        max_length=20,
                    ),
                ),
                ("notas", models.TextField(blank=True)),
                (
                    "cliente",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="creditos_promocion_reserva",
                        to="users.cliente",
                    ),
                ),
                (
                    "promocion",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="creditos_reserva",
                        to="inventario.inventorypromotion",
                    ),
                ),
                (
                    "reserva_canje",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="creditos_promocion_usados",
                        to="espacios.reserva",
                    ),
                ),
                (
                    "reserva_origen",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="creditos_promocion_generados",
                        to="espacios.reserva",
                    ),
                ),
            ],
            options={
                "db_table": "espacios_reserva_promocion_credito",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddField(
            model_name="reserva",
            name="credito_promocion_canjeado",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reservas_canje",
                to="espacios.reservapromotioncredit",
            ),
        ),
        migrations.AddIndex(
            model_name="reservapromotioncredit",
            index=models.Index(fields=["cliente", "estado"], name="espacios_re_cliente_11d9c3_idx"),
        ),
    ]
