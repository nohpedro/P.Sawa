from datetime import date, datetime, time
from typing import Dict, Tuple, Optional

from django.contrib.auth import get_user_model
from django.utils import timezone

from common_vap.enums import EspaciosEstado
from espacios.models import TipoActividad, Espacio


def get_users_map(usernames=None) -> Dict[str, object]:
    User = get_user_model()
    usernames = usernames or ["admin", "juan", "maria", "pedro", "ana"]
    qs = User.objects.filter(username__in=usernames)
    return {u.username: u for u in qs}


def get_estado(name: str) -> str:
    return getattr(EspaciosEstado, name, EspaciosEstado.choices[0][0])


def tz() -> timezone.tzinfo:
    return timezone.get_current_timezone()


def aware_dt(d: date, t: time) -> datetime:
    return timezone.make_aware(datetime.combine(d, t), tz())


def get_tipos() -> Dict[str, TipoActividad]:
    return {t.nombre: t for t in TipoActividad.objects.all()}


def get_espacios() -> Dict[str, Espacio]:
    return {e.nombre: e for e in Espacio.objects.all()}
