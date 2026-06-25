from functools import wraps

from django.conf import settings
from django.http import Http404


def marketplace_required(view_func):
    """Доступ только при включённом маркетплейсе (MARKETPLACE_ENABLED)."""

    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not settings.MARKETPLACE_ENABLED:
            raise Http404()
        return view_func(request, *args, **kwargs)

    return _wrapped
