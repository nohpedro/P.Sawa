from decimal import Decimal

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("espacios", "0002_alter_calendario_options_alter_espacio_options_and_more"),
        ("inventario", "0002_inventoryitem_sale_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="InventoryPromotion",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("nombre", models.CharField(max_length=160, unique=True)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("item_regalo", "Item de regalo"),
                            ("horas_gratis", "Horas gratis"),
                            ("descuento", "Descuento"),
                            ("personalizada", "Personalizada"),
                        ],
                        max_length=30,
                    ),
                ),
                ("descripcion", models.TextField(blank=True)),
                ("activo", models.BooleanField(default=True)),
                ("fecha_inicio", models.DateField(blank=True, null=True)),
                ("fecha_fin", models.DateField(blank=True, null=True)),
                ("dias_semana", models.CharField(blank=True, max_length=30)),
                ("aplica_festivos", models.BooleanField(default=False)),
                ("min_reserva_minutos", models.PositiveIntegerField(default=0)),
                (
                    "horas_pagadas",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=5,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "horas_gratis",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=5,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "descuento_porcentaje",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=5,
                        validators=[
                            django.core.validators.MinValueValidator(0),
                            django.core.validators.MaxValueValidator(100),
                        ],
                    ),
                ),
                (
                    "cantidad_item_regalo",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                ("aplica_todos_los_espacios", models.BooleanField(default=True)),
                ("prioridad", models.PositiveIntegerField(default=0)),
                ("combinable", models.BooleanField(default=False)),
                ("notas", models.TextField(blank=True)),
                (
                    "espacios",
                    models.ManyToManyField(
                        blank=True,
                        related_name="promociones_inventario",
                        to="espacios.espacio",
                    ),
                ),
                (
                    "item_regalo",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="promociones_regalo",
                        to="inventario.inventoryitem",
                    ),
                ),
            ],
            options={
                "db_table": "inventario_promocion",
                "ordering": ["-activo", "prioridad", "nombre"],
            },
        ),
    ]
