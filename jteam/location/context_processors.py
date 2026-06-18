from .models import City


def cities(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return {"cities": []}
    return {
        "cities": list(City.objects.order_by("name").values("slug", "name")),
    }
