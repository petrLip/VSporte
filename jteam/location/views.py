import json
import logging

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET, require_POST

from .city_detection import detect_city
from .models import City, Place
from cart.forms import CartAddProductForm
from .recommender import Recommender

logger = logging.getLogger(__name__)


def place_list(request, city_slug=None):
    city = None
    city_list = City.objects.all()
    places = Place.objects.filter(available=True)
    if city_slug:
        city = get_object_or_404(City, slug=city_slug)
        places = places.filter(city=city)
    return render(
        request, "place/list.html", {"city": city, "city_list": city_list, "places": places}
    )


def place_detail(request, id, slug):
    place = get_object_or_404(Place, id=id, slug=slug, available=True)
    cart_place_form = CartAddProductForm()
    r = Recommender()
    recommended_places = r.suggest_places_for([place], 4)
    return render(
        request,
        "place/detail.html",
        {
            "place": place,
            "cart_place_form": cart_place_form,
            "recommended_places": recommended_places,
        },
    )


@login_required
@require_GET
def api_cities(request):
    cities = City.objects.order_by("name")
    query = (request.GET.get("q") or "").strip()
    if query:
        if len(query) < 2:
            return JsonResponse({"cities": [], "error": "query_too_short"}, status=400)
        cities = cities.filter(name__icontains=query)
    return JsonResponse({"cities": list(cities.values("slug", "name")[:20])})


@login_required
@require_POST
def api_detect_city(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_json"}, status=400)

    try:
        latitude = float(payload.get("latitude"))
        longitude = float(payload.get("longitude"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid_coordinates"}, status=400)

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return JsonResponse({"error": "invalid_coordinates"}, status=400)

    result = detect_city(latitude, longitude)
    if not result["detected_name"] and not result["city"]:
        return JsonResponse({"error": "city_not_detected"}, status=404)

    return JsonResponse(result)


@login_required
@require_POST
def api_set_city(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_json"}, status=400)

    slug = payload.get("slug")
    if not slug:
        return JsonResponse({"error": "slug_required"}, status=400)

    city = get_object_or_404(City, slug=slug)
    return JsonResponse({"city": {"slug": city.slug, "name": city.name}})
