from rest_framework.permissions import BasePermission, SAFE_METHODS
from users.models import UserAccessProfile

class IsAdminOrReadOnly(BasePermission):
    """
    Permite lectura a cualquiera y escritura solo a staff/admin.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class HasModuleAccess(BasePermission):
    """
    Valida que el usuario tenga el modulo requerido por el ViewSet.
    El superuser siempre tiene acceso.
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        required_modules = getattr(view, "required_module", None)
        if request.method in SAFE_METHODS:
            required_modules = getattr(view, "read_modules", None) or required_modules

        if not required_modules:
            return True

        profile, _ = UserAccessProfile.objects.get_or_create(user=user)
        user_modules = set(profile.normalized_modules())

        if isinstance(required_modules, str):
            return required_modules in user_modules

        return bool(user_modules.intersection(required_modules))
