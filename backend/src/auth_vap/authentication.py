from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .models import BlacklistedAccessToken

class AccessTokenAuthentication(JWTAuthentication):
    """
    Extiende JWTAuthentication para rechazar access tokens cuyo jti esté en denylist.
    """
    def get_validated_token(self, raw_token):
        token = super().get_validated_token(raw_token)
        jti = token.get("jti", None)
        if jti and BlacklistedAccessToken.objects.filter(jti=jti).exists():
            raise InvalidToken("Token invalidado (logout).")
        return token
