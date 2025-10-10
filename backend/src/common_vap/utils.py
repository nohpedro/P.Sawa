from datetime import datetime
from django.utils import timezone

def aware_now():
    """Devuelve now() con TZ activa."""
    return timezone.now()

def to_aware(dt: datetime):
    """Asegura que un datetime sea timezone-aware en la TZ configurada."""
    if timezone.is_aware(dt):
        return dt
    return timezone.make_aware(dt, timezone.get_current_timezone())
