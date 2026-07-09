from .models import DEFAULT_SALE_MARGIN_PERCENT


SALE_MARGIN_MODULE = "inventory_sale_margin"


def can_edit_sale_margin(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True

    profile = getattr(user, "access_profile", None)
    if not profile:
        return False

    return SALE_MARGIN_MODULE in profile.normalized_modules()


def default_sale_margin_if_unauthorized(value, user):
    if can_edit_sale_margin(user):
        return value or DEFAULT_SALE_MARGIN_PERCENT
    return DEFAULT_SALE_MARGIN_PERCENT
