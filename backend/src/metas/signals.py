from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from espacios.models import Reserva
from inventario.models import InventoryProductSale, InventoryPurchaseBatch

from .models import BusinessFixedExpense, BusinessGoal, GoalStatus
from .services import current_cycle, recalculate_cycle


def refresh_active_goal_cycles():
    goals = BusinessGoal.objects.filter(estado=GoalStatus.ACTIVE)
    for goal in goals:
        recalculate_cycle(current_cycle(goal))


@receiver(post_save, sender=InventoryProductSale)
@receiver(post_delete, sender=InventoryProductSale)
def refresh_goals_from_product_sale(sender, **kwargs):
    refresh_active_goal_cycles()


@receiver(post_save, sender=InventoryPurchaseBatch)
@receiver(post_delete, sender=InventoryPurchaseBatch)
def refresh_goals_from_inventory_batch(sender, **kwargs):
    refresh_active_goal_cycles()


@receiver(post_save, sender=BusinessFixedExpense)
@receiver(post_delete, sender=BusinessFixedExpense)
def refresh_goals_from_fixed_expense(sender, **kwargs):
    refresh_active_goal_cycles()


@receiver(post_save, sender=Reserva)
@receiver(post_delete, sender=Reserva)
def refresh_goals_from_reservation(sender, **kwargs):
    refresh_active_goal_cycles()
