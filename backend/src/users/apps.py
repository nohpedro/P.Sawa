from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self):
        # Si mueves los receivers a signals.py, impórtalos aquí.
        from . import models  # noqa
