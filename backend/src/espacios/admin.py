from django.contrib import admin
from .models import (
    TipoActividad,
    Espacio,
    EspacioActividad,
    Calendario,
    Regla,
    ReglaGlobal,
    Promocion,
    Reserva,
)


@admin.register(TipoActividad)
class TipoActividadAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo", "created_at")
    list_filter = ("activo",)
    search_fields = ("nombre", "descripcion")
    ordering = ("nombre",)


class EspacioActividadInline(admin.TabularInline):
    model = EspacioActividad
    extra = 0
    autocomplete_fields = ("tipo",)


@admin.register(Espacio)
class EspacioAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "estado_operativo",   # <- antes era "estado"
        "estado_actual",      # <- propiedad calculada (LIBRE/OCUPADO/NO_DISPONIBLE)
        "capacidad",
        "ubicacion",
        "created_at",
    )
    list_filter = ("estado_operativo", "capacidad")
    search_fields = ("nombre", "ubicacion", "tags", "descripcion")
    inlines = [EspacioActividadInline]
    ordering = ("nombre",)

    # Para que se vea como columna
    @admin.display(description="Estado actual")
    def estado_actual(self, obj):
        return getattr(obj, "estado_actual", "")


@admin.register(EspacioActividad)
class EspacioActividadAdmin(admin.ModelAdmin):
    list_display = ("espacio", "tipo", "duracion_minutos", "precio_base", "activo")
    list_filter = ("activo", "espacio", "tipo")
    search_fields = ("espacio__nombre", "tipo__nombre")
    autocomplete_fields = ("espacio", "tipo")


@admin.register(Calendario)
class CalendarioAdmin(admin.ModelAdmin):
    list_display = ("espacio", "titulo", "fecha_inicio", "fecha_fin", "aforo_maximo")
    list_filter = ("espacio",)
    search_fields = ("espacio__nombre", "titulo", "notas")
    autocomplete_fields = ("espacio",)


@admin.register(Regla)
class ReglaAdmin(admin.ModelAdmin):
    list_display = (
        "espacio",
        "frecuencia",
        "intervalo",
        "weekday_mask",
        "hora_inicio",
        "hora_fin",
        "fecha_desde",
        "fecha_hasta",
        "activo",
    )
    list_filter = ("espacio", "frecuencia", "activo")
    search_fields = ("espacio__nombre", "weekday_mask")
    autocomplete_fields = ("espacio",)


@admin.register(ReglaGlobal)
class ReglaGlobalAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "frecuencia",
        "intervalo",
        "weekday_mask",
        "hora_inicio",
        "hora_fin",
        "fecha_desde",
        "fecha_hasta",
        "aplica_todos",
        "activo",
    )
    list_filter = ("frecuencia", "aplica_todos", "activo")
    search_fields = ("nombre", "descripcion")
    filter_horizontal = ("espacios",)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if not obj.aplica_todos and obj.espacios.count() == 0:
            self.message_user(
                request,
                "Sugerencia: Selecciona al menos un espacio si 'aplica_todos' es False.",
            )


@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    list_display = ("nombre", "descuento_porcentaje", "fecha_inicio", "fecha_fin", "aplica_todos", "activo")
    list_filter = ("aplica_todos", "activo")
    search_fields = ("nombre", "descripcion")
    filter_horizontal = ("espacios",)


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = (
        "espacio",
        "usuario",
        "cliente",
        "actividad",
        "inicio",
        "fin",
        "estado_reserva",
        "created_at",
    )
    list_filter = ("estado_reserva", "espacio", "actividad")
    search_fields = ("espacio__nombre", "usuario__username", "notas")
    ordering = ("-inicio",)
    autocomplete_fields = ("espacio", "usuario", "cliente", "actividad")
