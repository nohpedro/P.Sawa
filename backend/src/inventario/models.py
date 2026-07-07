from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common_vap.models import BaseModel
from espacios.models import Espacio


DEFAULT_SALE_MARGIN_PERCENT = Decimal("50.00")


class InventoryItemType(models.TextChoices):
    CONSUMIBLE = "consumible", "Consumible"
    MANTENIMIENTO = "mantenimiento", "Item con mantenimiento"
    VARIADO = "variado", "Variado"


class InventoryUnit(models.TextChoices):
    UNIDAD = "unidad", "Unidad"
    PAQUETE = "paquete", "Paquete"
    CAJA = "caja", "Caja"
    KG = "kg", "Kg"
    LITRO = "litro", "Litro"


class InventoryPromotionType(models.TextChoices):
    ITEM_REGALO = "item_regalo", "Item de regalo"
    HORAS_GRATIS = "horas_gratis", "Horas gratis"
    DESCUENTO = "descuento", "Descuento"
    PERSONALIZADA = "personalizada", "Personalizada"


class InventoryPromotionWeekday(models.TextChoices):
    MONDAY = "MO", "Lunes"
    TUESDAY = "TU", "Martes"
    WEDNESDAY = "WE", "Miercoles"
    THURSDAY = "TH", "Jueves"
    FRIDAY = "FR", "Viernes"
    SATURDAY = "SA", "Sabado"
    SUNDAY = "SU", "Domingo"


class InventoryPromotionPriority(models.TextChoices):
    BAJA = "baja", "Baja"
    MEDIA = "media", "Media"
    ALTA = "alta", "Alta"


class InventoryItem(BaseModel):
    nombre = models.CharField(max_length=160, unique=True)
    tipo = models.CharField(max_length=30, choices=InventoryItemType.choices)
    unidad = models.CharField(max_length=20, choices=InventoryUnit.choices, default=InventoryUnit.UNIDAD)
    descripcion = models.TextField(blank=True)
    sku = models.CharField(max_length=80, blank=True, unique=True, null=True)
    stock_actual = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    es_para_venta = models.BooleanField(default=False)
    margen_venta_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=DEFAULT_SALE_MARGIN_PERCENT,
        validators=[MinValueValidator(0)],
    )
    requiere_mantenimiento = models.BooleanField(default=False)
    fecha_ultimo_mantenimiento = models.DateField(null=True, blank=True)
    fecha_proximo_mantenimiento = models.DateField(null=True, blank=True)
    precio_venta_sugerido = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "inventario_item"
        ordering = ["nombre"]

    def clean(self):
        errors = {}
        self.unidad = InventoryUnit.UNIDAD
        if self.tipo == InventoryItemType.MANTENIMIENTO:
            self.requiere_mantenimiento = True
        if not self.es_para_venta:
            self.precio_venta_sugerido = Decimal("0.00")
        if self.fecha_ultimo_mantenimiento and self.fecha_proximo_mantenimiento:
            if self.fecha_proximo_mantenimiento < self.fecha_ultimo_mantenimiento:
                errors["fecha_proximo_mantenimiento"] = "Debe ser posterior al ultimo mantenimiento."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.sku == "":
            self.sku = None
        self.unidad = InventoryUnit.UNIDAD
        self.full_clean()
        super().save(*args, **kwargs)
        self.recalculate_sale_price_from_last_batch()

    def recalculate_sale_price_from_last_batch(self):
        if not self.es_para_venta:
            if self.precio_venta_sugerido != Decimal("0.00"):
                self.precio_venta_sugerido = Decimal("0.00")
                InventoryItem.objects.filter(pk=self.pk).update(precio_venta_sugerido=Decimal("0.00"))
            return

        last_batch = self.lotes.order_by("-fecha_compra", "-created_at").first()
        if not last_batch:
            return

        multiplier = Decimal("1.00") + (self.margen_venta_porcentaje / Decimal("100.00"))
        sale_price = (last_batch.costo_unitario * multiplier).quantize(Decimal("0.01"))
        updates = {}
        if self.precio_venta_sugerido != sale_price:
            updates["precio_venta_sugerido"] = sale_price
            self.precio_venta_sugerido = sale_price
        if last_batch.precio_venta_unitario != sale_price:
            InventoryPurchaseBatch.objects.filter(pk=last_batch.pk).update(precio_venta_unitario=sale_price)
        if updates:
            InventoryItem.objects.filter(pk=self.pk).update(**updates)

    @property
    def margen_sugerido(self):
        last_batch = self.lotes.order_by("-fecha_compra", "-created_at").first()
        if not last_batch or not last_batch.costo_unitario:
            return Decimal("0.00")
        return self.precio_venta_sugerido - last_batch.costo_unitario

    def __str__(self):
        return self.nombre


class InventoryPromotion(BaseModel):
    nombre = models.CharField(max_length=160, unique=True)
    tipo = models.CharField(max_length=30, choices=InventoryPromotionType.choices)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    dias_semana = models.CharField(max_length=30, blank=True)
    aplica_festivos = models.BooleanField(default=False)
    min_reserva_minutos = models.PositiveIntegerField(default=0)
    horas_pagadas = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    horas_gratis = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    descuento_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    item_regalo = models.ForeignKey(
        InventoryItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="promociones_regalo",
    )
    cantidad_item_regalo = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    aplica_todos_los_espacios = models.BooleanField(default=True)
    espacios = models.ManyToManyField(Espacio, blank=True, related_name="promociones_inventario")
    prioridad = models.CharField(
        max_length=10,
        choices=InventoryPromotionPriority.choices,
        default=InventoryPromotionPriority.MEDIA,
    )
    combinable = models.BooleanField(default=False)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "inventario_promocion"
        ordering = ["-activo", "prioridad", "nombre"]

    def clean(self):
        errors = {}
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            errors["fecha_fin"] = "Debe ser posterior o igual a la fecha de inicio."

        dias = [day.strip() for day in (self.dias_semana or "").split(",") if day.strip()]
        valid_days = {choice.value for choice in InventoryPromotionWeekday}
        invalid_days = [day for day in dias if day not in valid_days]
        if invalid_days:
            errors["dias_semana"] = "Dias no validos: " + ", ".join(invalid_days)
        self.dias_semana = ",".join(dict.fromkeys(dias))

        if self.tipo == InventoryPromotionType.ITEM_REGALO:
            if not self.item_regalo_id:
                errors["item_regalo"] = "Selecciona el item que se regalara."
            if self.cantidad_item_regalo <= 0:
                errors["cantidad_item_regalo"] = "Debe ser mayor a 0."
        elif self.tipo == InventoryPromotionType.HORAS_GRATIS:
            self.min_reserva_minutos = 0
            if self.horas_pagadas <= 0:
                errors["horas_pagadas"] = "Indica cuantas horas debe reservar/pagar."
            if self.horas_gratis <= 0:
                errors["horas_gratis"] = "Indica cuantas horas gratis entrega la promocion."
        elif self.tipo == InventoryPromotionType.DESCUENTO and self.descuento_porcentaje <= 0:
            errors["descuento_porcentaje"] = "El descuento debe ser mayor a 0."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def dias_semana_lista(self):
        return [day for day in self.dias_semana.split(",") if day]

    def __str__(self):
        return self.nombre


class InventoryPurchaseBatch(BaseModel):
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name="lotes")
    fecha_compra = models.DateField()
    proveedor = models.CharField(max_length=160, blank=True)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    costo_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    precio_venta_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    compra_por_mayor = models.BooleanField(default=False)
    notas = models.TextField(blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inventario_lotes_creados",
    )

    class Meta:
        db_table = "inventario_lote_compra"
        ordering = ["-fecha_compra", "-created_at"]

    def clean(self):
        if self.cantidad and self.costo_total and not self.costo_unitario:
            self.costo_unitario = self.costo_total / self.cantidad

    def save(self, *args, **kwargs):
        if self.cantidad and self.costo_total:
            self.costo_unitario = (self.costo_total / self.cantidad).quantize(Decimal("0.01"))
        if self.item_id and self.item.es_para_venta:
            multiplier = Decimal("1.00") + (self.item.margen_venta_porcentaje / Decimal("100.00"))
            self.precio_venta_unitario = (self.costo_unitario * multiplier).quantize(Decimal("0.01"))
        else:
            self.precio_venta_unitario = Decimal("0.00")
        self.full_clean()

        is_new = self.pk is None
        previous_quantity = Decimal("0.00")
        previous_item = None
        if not is_new:
            previous = InventoryPurchaseBatch.objects.filter(pk=self.pk).first()
            if previous:
                previous_item = previous.item
                previous_quantity = previous.cantidad

        super().save(*args, **kwargs)

        if previous_item and previous_item.id != self.item_id:
            previous_item.stock_actual = max(Decimal("0.00"), previous_item.stock_actual - previous_quantity)
            previous_item.save(update_fields=["stock_actual", "updated_at"])
            delta = self.cantidad
        else:
            delta = self.cantidad if is_new else self.cantidad - previous_quantity

        if delta or self.precio_venta_unitario:
            self.item.stock_actual = max(Decimal("0.00"), self.item.stock_actual + delta)
            if self.precio_venta_unitario:
                self.item.precio_venta_sugerido = self.precio_venta_unitario
            self.item.save(update_fields=["stock_actual", "precio_venta_sugerido", "updated_at"])

    def delete(self, *args, **kwargs):
        item = self.item
        quantity = self.cantidad
        result = super().delete(*args, **kwargs)
        item.stock_actual = max(Decimal("0.00"), item.stock_actual - quantity)
        item.save(update_fields=["stock_actual", "updated_at"])
        return result

    def __str__(self):
        return f"{self.item} x {self.cantidad} ({self.fecha_compra})"


class InventoryProductSale(BaseModel):
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="ventas_producto")
    cliente = models.ForeignKey(
        "users.Cliente",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ventas_producto",
    )
    reserva = models.ForeignKey(
        "espacios.Reserva",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ventas_producto",
    )
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    notas = models.TextField(blank=True)
    vendido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ventas_producto_inventario",
    )

    class Meta:
        db_table = "inventario_venta_producto"
        ordering = ["-created_at"]

    def clean(self):
        errors = {}
        if self.item_id:
            if self.item.tipo != InventoryItemType.CONSUMIBLE:
                errors["item"] = "Solo se pueden vender items consumibles."
            if not self.item.es_para_venta:
                errors["item"] = "El item no esta marcado para venta."
            if not self.item.activo:
                errors["item"] = "El item no esta activo."

            available = self.item.stock_actual
            if self.pk:
                previous = InventoryProductSale.objects.filter(pk=self.pk).select_related("item").first()
                if previous and previous.item_id == self.item_id:
                    available += previous.cantidad
            if self.cantidad and self.cantidad > available:
                errors["cantidad"] = f"Stock insuficiente. Disponible: {available}."

        if self.precio_unitario is None or self.precio_unitario <= 0:
            errors["precio_unitario"] = "El precio unitario debe ser mayor a 0."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.item_id and not self.precio_unitario:
            self.precio_unitario = self.item.precio_venta_sugerido
        if self.cantidad and self.precio_unitario:
            self.total = (self.cantidad * self.precio_unitario).quantize(Decimal("0.01"))

        is_new = self.pk is None
        previous = None if is_new else InventoryProductSale.objects.filter(pk=self.pk).select_related("item").first()
        self.full_clean()
        super().save(*args, **kwargs)

        if previous:
            previous.item.stock_actual = max(Decimal("0.00"), previous.item.stock_actual + previous.cantidad)
            previous.item.save(update_fields=["stock_actual", "updated_at"])

        self.item.refresh_from_db(fields=["stock_actual"])
        self.item.stock_actual = max(Decimal("0.00"), self.item.stock_actual - self.cantidad)
        self.item.save(update_fields=["stock_actual", "updated_at"])

    def delete(self, *args, **kwargs):
        item = self.item
        quantity = self.cantidad
        result = super().delete(*args, **kwargs)
        item.stock_actual = item.stock_actual + quantity
        item.save(update_fields=["stock_actual", "updated_at"])
        return result

    def __str__(self):
        return f"Venta {self.item} x {self.cantidad}"
