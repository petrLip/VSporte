import logging

import requests
from django.conf import settings

from .models import City

logger = logging.getLogger(__name__)

YANDEX_GEOCODER_URL = "https://geocode-maps.yandex.ru/1.x/"
YANDEX_GEOCODER_V1_URL = "https://geocode-maps.yandex.ru/v1/"


class GeocoderUnavailableError(Exception):
    """HTTP Geocoder недоступен (403, сеть, неверный ключ)."""


def _normalize_name(value):
    return (value or "").strip().casefold()


def _geocoder_headers(referer=None):
    referer = referer or settings.YANDEX_MAPS_REFERER
    return {"Referer": referer} if referer else {}


def _geocoder_api_key():
    return getattr(settings, "YANDEX_GEOCODER_API_KEY", None) or settings.YANDEX_MAPS_API_KEY


def _geocoder_api_key_for_uri():
    return getattr(settings, "YANDEX_GEOCODER_API_KEY", None) or settings.YANDEX_MAPS_API_KEY


def _geocoder_v1_request(params, referer=None, api_key=None):
    """Geocoder API v1 — используется для uri из Geosuggest."""
    api_key = api_key or _geocoder_api_key_for_uri()
    if not api_key:
        logger.warning("Yandex geocoder API key is not configured")
        raise GeocoderUnavailableError()

    try:
        response = requests.get(
            YANDEX_GEOCODER_V1_URL,
            params={
                **params,
                "apikey": api_key,
                "format": "json",
                "lang": "ru_RU",
            },
            headers=_geocoder_headers(referer),
            timeout=5,
        )
        if response.status_code == 403:
            logger.warning(
                "Yandex geocoder v1 returned 403. Clear IP restrictions on the Geocoder key "
                "and wait up to 15 minutes after key creation. Referer=%s Body=%s",
                referer or settings.YANDEX_MAPS_REFERER,
                response.text[:200],
            )
            raise GeocoderUnavailableError()
        response.raise_for_status()
        return response.json()
    except GeocoderUnavailableError:
        raise
    except requests.RequestException as exc:
        logger.warning("Yandex geocoder v1 request failed: %s", exc)
        raise GeocoderUnavailableError() from exc


def _geocoder_request(params, referer=None):
    """Выполняет запрос к HTTP Geocoder. Возвращает JSON."""
    api_key = _geocoder_api_key()
    if not api_key:
        logger.warning("YANDEX_MAPS_API_KEY is not configured")
        raise GeocoderUnavailableError()

    try:
        response = requests.get(
            YANDEX_GEOCODER_URL,
            params={
                **params,
                "apikey": api_key,
                "format": "json",
                "lang": "ru_RU",
            },
            headers=_geocoder_headers(referer),
            timeout=5,
        )
        if response.status_code == 403:
            logger.warning(
                "Yandex geocoder returned 403. Clear IP restrictions on the Geocoder key "
                "and wait up to 15 minutes after key creation. Referer=%s Body=%s",
                referer or settings.YANDEX_MAPS_REFERER,
                response.text[:200],
            )
            raise GeocoderUnavailableError()
        response.raise_for_status()
        return response.json()
    except GeocoderUnavailableError:
        raise
    except requests.RequestException as exc:
        logger.warning("Yandex geocoder request failed: %s", exc)
        raise GeocoderUnavailableError() from exc


def _first_geo_object(payload):
    members = (
        payload.get("response", {})
        .get("GeoObjectCollection", {})
        .get("featureMember", [])
    )
    if not members:
        return None
    return members[0].get("GeoObject", {})


def _parse_geo_object(geo_object, fallback_address=""):
    pos = geo_object.get("Point", {}).get("pos", "")
    if not pos:
        return None

    try:
        lon_str, lat_str = pos.split()
        longitude = float(lon_str)
        latitude = float(lat_str)
    except (ValueError, AttributeError):
        return None

    meta = geo_object.get("metaDataProperty", {}).get("GeocoderMetaData", {})
    formatted_address = meta.get("text") or fallback_address
    return latitude, longitude, formatted_address


def forward_geocode_by_uri(uri, referer=None):
    """Возвращает координаты по uri из Geosuggest через Geocoder API v1."""
    uri_value = (uri or "").strip()
    if not uri_value:
        return None

    keys_to_try = []
    for key in (
        getattr(settings, "YANDEX_GEOCODER_API_KEY", None),
        settings.YANDEX_MAPS_API_KEY,
    ):
        if key and key not in keys_to_try:
            keys_to_try.append(key)

    if not keys_to_try:
        raise GeocoderUnavailableError()

    last_error = None
    for api_key in keys_to_try:
        try:
            payload = _geocoder_v1_request(
                {"uri": uri_value, "results": 1},
                referer=referer,
                api_key=api_key,
            )
            geo_object = _first_geo_object(payload)
            if not geo_object:
                return None
            return _parse_geo_object(geo_object)
        except GeocoderUnavailableError as exc:
            last_error = exc
            continue

    if last_error:
        raise last_error
    return None


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


def forward_geocode_address(address, referer=None):
    """Возвращает (latitude, longitude, formatted_address) по текстовому адресу."""
    query = (address or "").strip()
    if not query:
        return None

    payload = _geocoder_request({"geocode": query, "results": 1}, referer=referer)
    if not payload:
        return None

    geo_object = _first_geo_object(payload)
    if not geo_object:
        return None

    return _parse_geo_object(geo_object, query)


def reverse_geocode_city_name(latitude, longitude):
    """Определяет название города по координатам через Yandex Geocoder."""
    try:
        payload = _geocoder_request({"geocode": f"{longitude},{latitude}", "results": 1})
    except GeocoderUnavailableError:
        return None

    geo_object = _first_geo_object(payload)
    if not geo_object:
        return None

    return _extract_locality_name(geo_object)


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
