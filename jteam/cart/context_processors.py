from django.conf import settings

from .cart import Cart


def cart(request):
    context = {"marketplace_enabled": settings.MARKETPLACE_ENABLED}
    if settings.MARKETPLACE_ENABLED:
        context["cart"] = Cart(request)
    return context
