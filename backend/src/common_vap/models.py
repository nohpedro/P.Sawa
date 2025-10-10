import uuid
from django.db import models
from django.utils import timezone
from django_extensions.db.models import TimeStampedModel


class TimestampModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now,editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True
        ordering = ['-created_at']

class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Meta:
        abstract = True

class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)
    objects = SoftDeleteQuerySet.as_manager()
    class Meta:
        abstract = True

    def deleted(self,using=None,keep_parents=False):
        self.is_deleted = True
        update_fields=['is_deleted']
        if hasattr(self, "updated_at"):
            update_fields.append("updated_at")
        self.save(update_fields=update_fields)

class BaseModel(UUIDModel,TimeStampedModel,SoftDeleteModel):
    class Meta(UUIDModel.Meta,TimeStampedModel.Meta,SoftDeleteModel.Meta):
        abstract = True
    

