from django.apps import AppConfig


class MetasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "metas"
    verbose_name = "Metas empresariales"

    def ready(self):
        import metas.signals  # noqa: F401
