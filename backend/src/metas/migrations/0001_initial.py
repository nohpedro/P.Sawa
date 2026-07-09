import uuid
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BusinessFixedExpense",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("nombre", models.CharField(max_length=160)),
                ("categoria", models.CharField(max_length=80)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0)])),
                ("frecuencia", models.CharField(choices=[("once", "Una vez"), ("weekly", "Semanal"), ("monthly", "Mensual"), ("custom_days", "Cada cierta cantidad de dias")], default="monthly", max_length=20)),
                ("frecuencia_dias", models.PositiveIntegerField(default=30)),
                ("fecha_pago", models.DateField()),
                ("prioridad", models.CharField(choices=[("baja", "Baja"), ("media", "Media"), ("alta", "Alta"), ("critica", "Critica")], default="media", max_length=20)),
                ("estado", models.CharField(choices=[("activo", "Activo"), ("pausado", "Pausado"), ("pagado", "Pagado"), ("vencido", "Vencido"), ("cancelado", "Cancelado")], default="activo", max_length=20)),
                ("proveedor", models.CharField(blank=True, max_length=160)),
                ("notas", models.TextField(blank=True)),
            ],
            options={"db_table": "metas_gasto_fijo", "ordering": ["fecha_pago", "-prioridad", "nombre"]},
        ),
        migrations.CreateModel(
            name="BusinessGoal",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("nombre", models.CharField(max_length=160)),
                ("descripcion", models.TextField(blank=True)),
                ("monto_objetivo", models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)])),
                ("fecha_inicio", models.DateField()),
                ("fecha_fin", models.DateField()),
                ("prioridad", models.CharField(choices=[("baja", "Baja"), ("media", "Media"), ("alta", "Alta"), ("critica", "Critica")], default="media", max_length=20)),
                ("estado", models.CharField(choices=[("borrador", "Borrador"), ("activa", "Activa"), ("pausada", "Pausada"), ("cumplida", "Cumplida"), ("cancelada", "Cancelada")], default="activa", max_length=20)),
                ("recursos_reservados", models.DecimalField(decimal_places=2, default=0, max_digits=12, validators=[django.core.validators.MinValueValidator(0)])),
                ("variables_calculo", models.JSONField(blank=True, default=dict)),
                ("tipo", models.CharField(choices=[("no_renovable", "No renovable"), ("renovable", "Renovable")], default="no_renovable", max_length=20)),
                ("frecuencia_renovacion", models.CharField(blank=True, choices=[("weekly", "Semanal"), ("monthly", "Mensual"), ("custom_days", "Cada cierta cantidad de dias")], max_length=20)),
                ("frecuencia_dias", models.PositiveIntegerField(default=30)),
                ("proximo_ciclo", models.DateField(blank=True, null=True)),
                ("manejo_saldo", models.CharField(choices=[("reset", "Reiniciar saldo"), ("carry_over", "Arrastrar saldo acumulado"), ("reserve_only", "Conservar solo recursos reservados")], default="reset", max_length=20)),
                ("conservar_nodos", models.BooleanField(default=True)),
                ("creado_por", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="metas_empresariales_creadas", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "metas_empresarial", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BusinessGoalCycle",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("numero", models.PositiveIntegerField(default=1)),
                ("fecha_inicio", models.DateField()),
                ("fecha_fin", models.DateField()),
                ("monto_objetivo", models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0)])),
                ("saldo_inicial", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("monto_acumulado", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("estado", models.CharField(choices=[("borrador", "Borrador"), ("activa", "Activa"), ("pausada", "Pausada"), ("cumplida", "Cumplida"), ("cancelada", "Cancelada")], default="activa", max_length=20)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("goal", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cycles", to="metas.businessgoal")),
            ],
            options={"db_table": "metas_ciclo", "ordering": ["-numero"], "unique_together": {("goal", "numero")}},
        ),
        migrations.CreateModel(
            name="BusinessGoalMovement",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("tipo", models.CharField(choices=[("ingreso", "Ingreso"), ("gasto", "Gasto"), ("reserva", "Reserva"), ("ajuste", "Ajuste")], max_length=20)),
                ("concepto", models.CharField(max_length=180)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=12)),
                ("fecha", models.DateField(default=django.utils.timezone.localdate)),
                ("categoria", models.CharField(blank=True, max_length=80)),
                ("notas", models.TextField(blank=True)),
                ("creado_por", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="metas_movimientos_creados", to=settings.AUTH_USER_MODEL)),
                ("cycle", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="movements", to="metas.businessgoalcycle")),
                ("goal", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="movements", to="metas.businessgoal")),
            ],
            options={"db_table": "metas_movimiento", "ordering": ["-fecha", "-created_at"]},
        ),
        migrations.CreateModel(
            name="BusinessGoalNode",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("tipo", models.CharField(choices=[("ventas", "Ventas"), ("reservas", "Reservas"), ("salarios", "Salarios"), ("servicios", "Servicios"), ("alquiler", "Alquiler"), ("gastos_variables", "Gastos variables"), ("facturas_pendientes", "Facturas pendientes"), ("ingreso_manual", "Ingreso manual"), ("porcentaje_reservado", "Porcentaje reservado"), ("periodo_calculo", "Periodo de calculo"), ("gasto_fijo", "Gasto fijo")], max_length=30)),
                ("etiqueta", models.CharField(max_length=140)),
                ("valor", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("porcentaje", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("periodo_inicio", models.DateField(blank=True, null=True)),
                ("periodo_fin", models.DateField(blank=True, null=True)),
                ("posicion_x", models.IntegerField(default=120)),
                ("posicion_y", models.IntegerField(default=120)),
                ("config", models.JSONField(blank=True, default=dict)),
                ("cycle", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="nodes", to="metas.businessgoalcycle")),
                ("goal", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="nodes", to="metas.businessgoal")),
            ],
            options={"db_table": "metas_nodo", "ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="BusinessGoalConnection",
            fields=[
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("operador", models.CharField(default="+", max_length=10)),
                ("peso", models.DecimalField(decimal_places=2, default=1, max_digits=8)),
                ("cycle", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="connections", to="metas.businessgoalcycle")),
                ("goal", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="connections", to="metas.businessgoal")),
                ("source", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="outgoing_connections", to="metas.businessgoalnode")),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="incoming_connections", to="metas.businessgoalnode")),
            ],
            options={"db_table": "metas_conexion", "ordering": ["created_at"]},
        ),
    ]
