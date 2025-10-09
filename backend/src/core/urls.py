from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from django.db import connection
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health_check(request):
    """
    Endpoint simple para verificar que la app y la DB estén disponibles.
    Devuelve:
      {"status": "ok", "database": "connected"}
    """
    db_status = "connected"
    try:
        connection.ensure_connection()
    except Exception:
        db_status = "error"
    return JsonResponse({"status": "ok", "database": db_status})


urlpatterns = [
    path("admin/", admin.site.urls),

    # Health Check
    path("api/health/", health_check, name="health-check"),

    # OpenAPI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
