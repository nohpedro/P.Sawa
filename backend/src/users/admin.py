from django.contrib import admin
from .models import Cliente

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "nombre", "apellido", "telefono", "documento")
    search_fields = ("user__username", "user__email", "nombre", "apellido", "documento")
    # No usamos date_hierarchy ni list_filter con created_at/updated_at
