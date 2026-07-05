from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="inventoryitem",
            name="es_para_venta",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="inventoryitem",
            name="margen_venta_porcentaje",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("50.00"),
                max_digits=5,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
    ]
