import logging

import requests
from django.conf import settings

from .models import City

logger = logging.getLogger(__name__)

YANDEX_GEOCODER_URL = "https://geocode-maps.yandex.ru/1.x/"


def _normalize_name(value):
    return (value or "").strip().casefold()


def match_city_by_name(detected_name):
    """Сопоставляет название из геокодера с городом в базе."""
    if not detected_name:
        return None

    normalized = _normalize_name(detected_name)
    for city in City.objects.all():
        city_name = _normalize_name(city.name)
        if city_name == normalized:
            return city
        if city_name in normalized or normalized in city_name:
            return city
    return None


def _extract_locality_name(geo_object):
    meta = geo_object.get("metaDataProperty", {}).get("GeocoderMetaData", {})
    components = meta.get("Address", {}).get("Components", [])
    for component in components:
        if component.get("kind") == "locality":
            return component.get("name")

    for component in components:
        if component.get("kind") in {"area", "province", "district"}:
            return component.get("name")

    return meta.get("text")


def reverse_geocode_city_name(latitude, longitude):
    """Определяет название города по координатам через Yandex Geocoder."""
    api_key = settings.YANDEX_MAPS_API_KEY
    if not api_key:
        logger.warning("YANDEX_MAPS_API_KEY is not configured")
        return None

    try:
        response = requests.get(
            YANDEX_GEOCODER_URL,
            params={
                "apikey": api_key,
                "geocode": f"{longitude},{latitude}",
                "format": "json",
                "lang": "ru_RU",
                "results": 1,
            },
            timeout=5,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        logger.warning("Yandex geocoder request failed: %s", exc)
        return None

    members = (
        payload.get("response", {})
        .get("GeoObjectCollection", {})
        .get("featureMember", [])
    )
    if not members:
        return None

    return _extract_locality_name(members[0].get("GeoObject", {}))


def detect_city(latitude, longitude):
    """Возвращает словарь с результатом определения города."""
    detected_name = reverse_geocode_city_name(latitude, longitude)
    matched_city = match_city_by_name(detected_name)

    city_data = None
    if matched_city:
        city_data = {"slug": matched_city.slug, "name": matched_city.name}

    return {
        "city": city_data,
        "detected_name": detected_name,
        "matched": matched_city is not None,
    }
