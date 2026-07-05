from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from common_vap.enums import ReservaEstado
from inventario.models import InventoryPromotion, InventoryPromotionPriority, InventoryPromotionType
from users.models import Cliente
from ..models import EspacioActividad, Reserva, ReservaPromotionCredit, ReservaPromotionCreditStatus

User = get_user_model()

WEEKDAY_CODES = ("MO", "TU", "WE", "TH", "FR", "SA", "SU")
PRIORITY_RANK = {
    InventoryPromotionPriority.ALTA: 3,
    InventoryPromotionPriority.MEDIA: 2,
    InventoryPromotionPriority.BAJA: 1,
}
BLOCKING_STATES = (
    ReservaEstado.PENDIENTE,
    ReservaEstado.CONFIRMADA,
    ReservaEstado.ACTIVA,
)


def duration_minutes(inicio, fin) -> int:
    if not inicio or not fin or fin <= inicio:
        return 0
    return int(round((fin - inicio).total_seconds() / 60))


def decimal_hours_to_minutes(value) -> int:
    return int((Decimal(value or 0) * Decimal(60)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def promotion_applies(promotion: InventoryPromotion, espacio, inicio, paid_minutes: int) -> bool:
    if not promotion.activo or not inicio or paid_minutes <= 0:
        return False

    local_inicio = timezone.localtime(inicio)
    day = local_inicio.date()
    if promotion.fecha_inicio and day < promotion.fecha_inicio:
        return False
    if promotion.fecha_fin and day > promotion.fecha_fin:
        return False

    days = promotion.dias_semana_lista
    if days and WEEKDAY_CODES[local_inicio.weekday()] not in days:
        return False

    if not promotion.aplica_todos_los_espacios and espacio:
        if not promotion.espacios.filter(pk=espacio.pk).exists():
            return False

    if promotion.tipo == InventoryPromotionType.HORAS_GRATIS:
        return paid_minutes >= decimal_hours_to_minutes(promotion.horas_pagadas)

    min_minutes = int(promotion.min_reserva_minutos or 0)
    if min_minutes and paid_minutes < min_minutes:
        return False

    return promotion.tipo in {
        InventoryPromotionType.ITEM_REGALO,
        InventoryPromotionType.DESCUENTO,
        InventoryPromotionType.PERSONALIZADA,
    }


def promotion_order_key(promotion: InventoryPromotion):
    return (-PRIORITY_RANK.get(promotion.prioridad, 2), promotion.nombre.lower())


def eligible_promotions(espacio, inicio, fin, promotion_type: str):
    paid_minutes = duration_minutes(inicio, fin)
    promotions = (
        InventoryPromotion.objects
        .select_related("item_regalo")
        .prefetch_related("espacios")
        .filter(activo=True, tipo=promotion_type)
    )
    return sorted(
        [promotion for promotion in promotions if promotion_applies(promotion, espacio, inicio, paid_minutes)],
        key=promotion_order_key,
    )


def has_reservation_overlap(espacio, inicio, fin, exclude_pk=None) -> bool:
    if not espacio or not inicio or not fin or fin <= inicio:
        return True
    qs = Reserva.objects.filter(
        espacio=espacio,
        estado_reserva__in=BLOCKING_STATES,
        inicio__lt=fin,
        fin__gt=inicio,
    )
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs.exists()


def calcular_monto_reserva(obj: Reserva) -> Decimal:
    minutos = duration_minutes(obj.inicio, obj.fin)
    if minutos <= 0:
        return Decimal("0.00")

    relacion = (
        EspacioActividad.objects
        .filter(espacio=obj.espacio, tipo=obj.actividad, activo=True)
        .first()
    )
    if not relacion or relacion.duracion_minutos <= 0:
        return Decimal("0.00")

    free_minutes = int(obj.minutos_promocion_gratis_aplicados or 0)
    credit_minutes = int(obj.minutos_credito_aplicados or 0)
    chargeable_minutes = max(0, minutos - free_minutes - credit_minutes)
    bloques = Decimal(chargeable_minutes) / Decimal(relacion.duracion_minutos)
    total = bloques * relacion.precio_base

    discount = getattr(obj, "descuento_promocion", None)
    if discount and discount.tipo == InventoryPromotionType.DESCUENTO and discount.descuento_porcentaje:
        total = total * (Decimal("100.00") - discount.descuento_porcentaje) / Decimal("100.00")

    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class ReservaPromotionCreditSerializer(serializers.ModelSerializer):
    promocion_nombre = serializers.ReadOnlyField(source="promocion.nombre")
    cliente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ReservaPromotionCredit
        fields = (
            "id",
            "cliente",
            "cliente_nombre",
            "promocion",
            "promocion_nombre",
            "reserva_origen",
            "reserva_canje",
            "minutos_total",
            "minutos_disponibles",
            "estado",
            "notas",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_cliente_nombre(self, obj):
        return str(obj.cliente)


class ReservaSerializer(serializers.ModelSerializer):
    espacio_nombre = serializers.ReadOnlyField(source="espacio.nombre")
    actividad_nombre = serializers.ReadOnlyField(source="actividad.nombre")
    usuario_username = serializers.ReadOnlyField(source="usuario.get_username")
    cliente_nombre = serializers.SerializerMethodField()
    cliente_apellido = serializers.SerializerMethodField()
    duracion_minutos = serializers.SerializerMethodField()
    monto_estimado = serializers.SerializerMethodField()
    descuento_promocion_nombre = serializers.ReadOnlyField(source="descuento_promocion.nombre")
    credito_promocion_canjeado_nombre = serializers.ReadOnlyField(source="credito_promocion_canjeado.promocion.nombre")

    usuario = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )

    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.select_related("user").all(),
        required=False,
        allow_null=True,
    )

    descuento_promocion = serializers.PrimaryKeyRelatedField(
        queryset=InventoryPromotion.objects.filter(activo=True, tipo=InventoryPromotionType.DESCUENTO),
        required=False,
        allow_null=True,
    )

    credito_promocion_canjeado = serializers.PrimaryKeyRelatedField(
        queryset=ReservaPromotionCredit.objects.filter(
            estado__in=(ReservaPromotionCreditStatus.PENDIENTE, ReservaPromotionCreditStatus.PARCIAL),
            minutos_disponibles__gt=0,
        ),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Reserva
        fields = (
            "id",
            "espacio",
            "espacio_nombre",
            "usuario",
            "usuario_username",
            "cliente",
            "cliente_nombre",
            "cliente_apellido",
            "actividad",
            "actividad_nombre",
            "inicio",
            "fin",
            "duracion_minutos",
            "monto_estimado",
            "descuento_promocion",
            "descuento_promocion_nombre",
            "credito_promocion_canjeado",
            "credito_promocion_canjeado_nombre",
            "promociones_aplicadas",
            "minutos_promocion_gratis_aplicados",
            "minutos_promocion_pendientes_generados",
            "minutos_credito_aplicados",
            "estado_reserva",
            "notas",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "created_at",
            "updated_at",
            "promociones_aplicadas",
            "minutos_promocion_gratis_aplicados",
            "minutos_promocion_pendientes_generados",
            "minutos_credito_aplicados",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        inicio = attrs.get("inicio") or getattr(self.instance, "inicio", None)
        fin = attrs.get("fin") or getattr(self.instance, "fin", None)
        espacio = attrs.get("espacio") or getattr(self.instance, "espacio", None)
        incoming_usuario = attrs.get("usuario", None)
        incoming_cliente = attrs.get("cliente", None)
        cliente_for_validation = incoming_cliente or getattr(self.instance, "cliente", None)
        if not user.is_staff:
            cliente_for_validation = getattr(user, "cliente", None)

        if inicio and fin and fin <= inicio:
            raise serializers.ValidationError({"fin": "La fecha/hora fin debe ser posterior a inicio."})

        if not user.is_staff:
            if incoming_usuario and incoming_usuario != user:
                raise serializers.ValidationError({"usuario": "No puedes crear/editar reservas para otro usuario."})
            if incoming_cliente and incoming_cliente.user_id != user.id:
                raise serializers.ValidationError({"cliente": "No puedes crear/editar reservas para otro cliente."})

        discount = attrs.get("descuento_promocion")
        if discount:
            if discount.tipo != InventoryPromotionType.DESCUENTO:
                raise serializers.ValidationError({"descuento_promocion": "Solo puedes seleccionar promociones de descuento."})
            if not promotion_applies(discount, espacio, inicio, duration_minutes(inicio, fin)):
                raise serializers.ValidationError({"descuento_promocion": "Este descuento no aplica a esta reserva."})

        credit = attrs.get("credito_promocion_canjeado")
        if credit:
            if not cliente_for_validation or credit.cliente_id != cliente_for_validation.id:
                raise serializers.ValidationError({"credito_promocion_canjeado": "Este saldo no pertenece al cliente seleccionado."})
            if credit.minutos_disponibles <= 0 or credit.estado not in (
                ReservaPromotionCreditStatus.PENDIENTE,
                ReservaPromotionCreditStatus.PARCIAL,
            ):
                raise serializers.ValidationError({"credito_promocion_canjeado": "Este saldo ya fue utilizado."})

        return attrs

    def _apply_promotions_to_create(self, validated_data):
        inicio = validated_data.get("inicio")
        original_fin = validated_data.get("fin")
        espacio = validated_data.get("espacio")
        cliente = validated_data.get("cliente")
        paid_minutes = duration_minutes(inicio, original_fin)
        applied = []
        pending_credit = None

        credit = validated_data.get("credito_promocion_canjeado")
        if credit:
            credit_minutes = min(int(credit.minutos_disponibles), paid_minutes)
            validated_data["minutos_credito_aplicados"] = credit_minutes
            applied.append({
                "tipo": "saldo_pendiente",
                "nombre": credit.promocion.nombre if credit.promocion_id else "Saldo pendiente",
                "beneficio": f"{credit_minutes} minutos canjeados",
                "minutos": credit_minutes,
                "credito_id": str(credit.id),
            })

        hour_promotions = eligible_promotions(espacio, inicio, original_fin, InventoryPromotionType.HORAS_GRATIS)
        hour_promotion = hour_promotions[0] if hour_promotions else None
        if hour_promotion:
            free_minutes = decimal_hours_to_minutes(hour_promotion.horas_gratis)
            extended_fin = original_fin + timedelta(minutes=free_minutes)
            entry = {
                "tipo": "horas_gratis",
                "promocion_id": str(hour_promotion.id),
                "nombre": hour_promotion.nombre,
                "beneficio": f"{free_minutes} minutos gratis",
                "minutos": free_minutes,
            }
            if has_reservation_overlap(espacio, original_fin, extended_fin):
                validated_data["minutos_promocion_pendientes_generados"] = free_minutes
                entry["estado"] = "pendiente"
                entry["detalle"] = "El horario extra no estaba libre; se genero saldo pendiente."
                pending_credit = {
                    "promocion": hour_promotion,
                    "minutos": free_minutes,
                }
            else:
                validated_data["fin"] = extended_fin
                validated_data["minutos_promocion_gratis_aplicados"] = free_minutes
                entry["estado"] = "aplicada"
                entry["detalle"] = "La reserva se extendio automaticamente con la hora gratis."
            applied.append(entry)

        gift_promotions = eligible_promotions(espacio, inicio, original_fin, InventoryPromotionType.ITEM_REGALO)
        gift_promotion = gift_promotions[0] if gift_promotions else None
        if gift_promotion:
            applied.append({
                "tipo": "item_regalo",
                "promocion_id": str(gift_promotion.id),
                "nombre": gift_promotion.nombre,
                "beneficio": f"{gift_promotion.cantidad_item_regalo} x {gift_promotion.item_regalo.nombre if gift_promotion.item_regalo_id else 'item'}",
                "item_regalo": str(gift_promotion.item_regalo_id) if gift_promotion.item_regalo_id else None,
                "item_regalo_nombre": gift_promotion.item_regalo.nombre if gift_promotion.item_regalo_id else "",
                "cantidad": str(gift_promotion.cantidad_item_regalo),
            })

        discount = validated_data.get("descuento_promocion")
        if discount:
            applied.append({
                "tipo": "descuento",
                "promocion_id": str(discount.id),
                "nombre": discount.nombre,
                "beneficio": f"{discount.descuento_porcentaje}% descuento",
                "descuento_porcentaje": str(discount.descuento_porcentaje),
            })

        validated_data["promociones_aplicadas"] = applied
        self._pending_promotion_credit = pending_credit
        self._credit_to_redeem = credit

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        cliente_obj = validated_data.get("cliente")
        if cliente_obj is not None:
            validated_data["usuario"] = cliente_obj.user

        if user.is_staff:
            validated_data["usuario"] = validated_data.get("usuario") or user
            validated_data["estado_reserva"] = ReservaEstado.CONFIRMADA
        else:
            validated_data["usuario"] = user
            validated_data["estado_reserva"] = ReservaEstado.PENDIENTE
            validated_data["cliente"] = getattr(user, "cliente", None)

        self._apply_promotions_to_create(validated_data)
        instance = super().create(validated_data)

        pending_credit = getattr(self, "_pending_promotion_credit", None)
        if pending_credit and instance.cliente_id:
            ReservaPromotionCredit.objects.create(
                cliente=instance.cliente,
                promocion=pending_credit["promocion"],
                reserva_origen=instance,
                minutos_total=pending_credit["minutos"],
                minutos_disponibles=pending_credit["minutos"],
                notas=f"Saldo generado por {pending_credit['promocion'].nombre}.",
            )

        credit = getattr(self, "_credit_to_redeem", None)
        if credit and instance.minutos_credito_aplicados:
            credit.minutos_disponibles = max(0, int(credit.minutos_disponibles) - int(instance.minutos_credito_aplicados))
            credit.reserva_canje = instance
            credit.save(update_fields=["minutos_disponibles", "reserva_canje", "estado", "updated_at"])

        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuario no autenticado.")

        if not user.is_staff:
            validated_data.pop("estado_reserva", None)
            validated_data.pop("usuario", None)
            validated_data.pop("cliente", None)

        cliente_obj = validated_data.get("cliente")
        if user.is_staff and cliente_obj is not None:
            validated_data["usuario"] = cliente_obj.user

        return super().update(instance, validated_data)

    def get_cliente_nombre(self, obj: Reserva) -> str:
        if obj.cliente_id:
            return getattr(obj.cliente, "nombre", "")
        return getattr(getattr(obj.usuario, "cliente", None), "nombre", "")

    def get_cliente_apellido(self, obj: Reserva) -> str:
        if obj.cliente_id:
            return getattr(obj.cliente, "apellido", "")
        return getattr(getattr(obj.usuario, "cliente", None), "apellido", "")

    def get_duracion_minutos(self, obj: Reserva) -> int:
        return duration_minutes(obj.inicio, obj.fin)

    def get_monto_estimado(self, obj: Reserva) -> str:
        return str(calcular_monto_reserva(obj))
