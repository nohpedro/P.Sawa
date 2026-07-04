from datetime import datetime, time as dtime

from django.utils import timezone
from django.utils.dateparse import parse_date
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from auth_vap.authentication import AccessTokenAuthentication
from common_vap.permissions import HasModuleAccess

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    required_module = "audit"
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    authentication_classes = (AccessTokenAuthentication,)
    permission_classes = (HasModuleAccess,)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ("user", "action", "module")
    search_fields = ("username", "module_label", "target_repr", "affected_summary")
    ordering_fields = ("created_at", "username", "module", "action")

    def get_queryset(self):
        qs = super().get_queryset()

        desde_str = self.request.query_params.get("desde")
        hasta_str = self.request.query_params.get("hasta")
        tz = timezone.get_current_timezone()

        if desde_str:
            d = parse_date(desde_str)
            if d:
                start_dt = timezone.make_aware(datetime.combine(d, dtime.min), tz)
                qs = qs.filter(created_at__gte=start_dt)

        if hasta_str:
            h = parse_date(hasta_str)
            if h:
                end_dt = timezone.make_aware(datetime.combine(h, dtime.max), tz)
                qs = qs.filter(created_at__lte=end_dt)

        return qs
