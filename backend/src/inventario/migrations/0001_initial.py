# Generated manually for initial inventory module.

import uuid
from decimal import Decimal

import django.core.validators
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
            name="InventoryItem",
            fields=[
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("nombre", models.CharField(max_length=160, unique=True)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("consumible", "Consumible"),
                            ("mantenimiento", "Item con mantenimiento"),
                            ("variado", "Variado"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "unidad",
                    models.CharField(
                        choices=[
                            ("unidad", "Unidad"),
                            ("paquete", "Paquete"),
                            ("caja", "Caja"),
                            ("kg", "Kg"),
                            ("litro", "Litro"),
                        ],
                        default="unidad",
                        max_length=20,
                    ),
                ),
                ("descripcion", models.TextField(blank=True)),
                ("sku", models.CharField(blank=True, max_length=80, null=True, unique=True)),
                (
                    "stock_actual",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "stock_minimo",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                ("requiere_mantenimiento", models.BooleanField(default=False)),
                ("fecha_ultimo_mantenimiento", models.DateField(blank=True, null=True)),
                ("fecha_proximo_mantenimiento", models.DateField(blank=True, null=True)),
                (
                    "precio_venta_sugerido",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                ("activo", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "inventario_item",
                "ordering": ["nombre"],
            },
        ),
        migrations.CreateModel(
            name="InventoryPurchaseBatch",
            fields=[
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("fecha_compra", models.DateField()),
                ("proveedor", models.CharField(blank=True, max_length=160)),
                (
                    "cantidad",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                    ),
                ),
                (
                    "costo_total",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "costo_unitario",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "precio_venta_unitario",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                ("compra_por_mayor", models.BooleanField(default=False)),
                ("notas", models.TextField(blank=True)),
                (
                    "creado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="inventario_lotes_creados",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lotes",
                        to="inventario.inventoryitem",
                    ),
                ),
            ],
            options={
                "db_table": "inventario_lote_compra",
                "ordering": ["-fecha_compra", "-created_at"],
            },
        ),
    ]
