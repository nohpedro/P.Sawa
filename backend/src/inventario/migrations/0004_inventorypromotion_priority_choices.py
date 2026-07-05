from django.db import migrations, models


def normalize_priority(apps, schema_editor):
    promotion_model = apps.get_model("inventario", "InventoryPromotion")
    for promotion in promotion_model.objects.all():
        current = str(getattr(promotion, "prioridad", "") or "").lower()
        if current not in {"baja", "media", "alta"}:
            current = "media"
        promotion.prioridad = current
        promotion.save(update_fields=["prioridad"])


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0003_inventorypromotion"),
    ]

    operations = [
        migrations.AlterField(
            model_name="inventorypromotion",
            name="prioridad",
            field=models.CharField(
                choices=[("baja", "Baja"), ("media", "Media"), ("alta", "Alta")],
                default="media",
                max_length=10,
            ),
        ),
        migrations.RunPython(normalize_priority, migrations.RunPython.noop),
    ]
