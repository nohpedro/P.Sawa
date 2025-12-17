from django.apps import AppConfig

class AuthVapConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "auth_vap"

    def ready(self):
        # Importa la extensión para que drf-spectacular la registre
        from . import openapi  # noqa
