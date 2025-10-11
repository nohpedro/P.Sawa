from django.db import models
from django.conf import settings
from django.utils import timezone

class BlacklistedAccessToken(models.Model):
    """
    Guarda el jti de access tokens “cerrados” (logout).
    Si el jti está aquí, el token se considera inválido.
    """
    jti = models.CharField(max_length=255, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blacklisted_access_tokens")
    created_at = models.DateTimeField(default=timezone.now)
