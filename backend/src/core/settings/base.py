from pathlib import Path
import os
from datetime import timedelta

# === Rutas base ===
BASE_DIR = Path(__file__).resolve().parents[2]

# === Configuración general ===
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# === Aplicaciones instaladas ===
INSTALLED_APPS = [
    # Apps Django base
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Terceros
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "rest_framework_simplejwt",
    "corsheaders",

    # Apps locales
    "core",
    "common_vap",
    "users",
    "auth_vap",
    "espacios",
    "audit",
]

# === Middleware ===
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # <-- AQUI
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# === Base de datos (PostgreSQL por defecto) ===
DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.postgresql"),
        "NAME": os.getenv("POSTGRES_DB", "proy_volley"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# Alternativa local con SQLite (solo si USE_SQLITE=1)
if os.getenv("USE_SQLITE") == "1":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# === Internacionalización ===
LANGUAGE_CODE = "es-es"
TIME_ZONE = os.getenv("TZ", "UTC")
USE_I18N = True
USE_TZ = True

# === Archivos estáticos y media ===
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# === Templates (requerido por admin) ===
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# === Configuración Django REST Framework ===
REST_FRAMEWORK = {
    # Autenticación con JWT (solo access token)
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "auth_vap.authentication.AccessTokenAuthentication",
    ),

    # Permisos globales
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),

    # Documentación OpenAPI/Swagger
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",

    # Paginación global
    "DEFAULT_PAGINATION_CLASS": "common_vap.pagination.DefaultPageNumberPagination",
    "PAGE_SIZE": 20,
}

# === Swagger / OpenAPI ===
SPECTACULAR_SETTINGS = {
    "TITLE": "Proy Volley API",
    "DESCRIPTION": "API para gestión de espacios, actividades y reservas.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,

    # Mantener sesión en UI
    "SWAGGER_UI_SETTINGS": {"persistAuthorization": True},

    # 1) Declara explícitamente el esquema Bearer (JWT)
    "SECURITY_SCHEMES": {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Introduce solo el token (sin 'Bearer '), la UI agrega el prefijo automáticamente.",
        }
    },

    # 2) Haz que todos los endpoints usen Bearer por defecto
    "SECURITY": [{"BearerAuth": []}],

    # 3) Usa el “scheme” de SimpleJWT para documentar correctamente, aunque tu auth real sea custom
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "drf_spectacular.contrib.rest_framework_simplejwt.authentication.SimpleJWTScheme",
    ],
}

# === Configuración SimpleJWT (solo access token) ===
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),  # duración del token
    "REFRESH_TOKEN_LIFETIME": timedelta(seconds=0),  # deshabilitado
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,

    # Encabezado
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",

    # Firma y algoritmo
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,

    # Claims
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",

    # Clase de usuario del token
    "TOKEN_USER_CLASS": "rest_framework_simplejwt.models.TokenUser",
}

# === CORS ===

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Permitir envío de cookies/Authorization si lo necesitas
CORS_ALLOW_CREDENTIALS = True

# Headers permitidos (JWT usa Authorization)
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Métodos permitidos
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
