from drf_spectacular.extensions import OpenApiAuthenticationExtension

class AccessTokenAuthenticationScheme(OpenApiAuthenticationExtension):
    """
    Hace que drf-spectacular documente auth_vap.authentication.AccessTokenAuthentication
    como un esquema Bearer JWT en Swagger (Authorize).
    """
    target_class = "auth_vap.authentication.AccessTokenAuthentication"  # ruta a tu autenticador
    name = "BearerAuth"  # debe coincidir con SPECTACULAR_SETTINGS.SECURITY

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Introduce el token **sin** el prefijo 'Bearer '. La UI agregará el prefijo.",
        }
