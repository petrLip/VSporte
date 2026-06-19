import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

YANDEX_SUGGEST_URL = "https://suggest-maps.yandex.ru/v1/suggest"


def fetch_address_suggestions(query, referer=None):
    """Возвращает список подсказок адресов через HTTP API Geosuggest."""
    api_key = settings.YANDEX_MAPS_SUGGEST_API_KEY
    text = (query or "").strip()
    if not api_key or not text:
        return []

    headers = {}
    referer = referer or settings.YANDEX_MAPS_REFERER
    if referer:
        headers["Referer"] = referer

    try:
        response = requests.get(
            YANDEX_SUGGEST_URL,
            params={
                "apikey": api_key,
                "text": text,
                "lang": "ru_RU",
                "results": 5,
                "types": "geo,street,house",
                "attrs": "uri",
                "print_address": 1,
            },
            headers=headers,
            timeout=5,
        )
        if response.status_code == 403:
            logger.warning(
                "Yandex suggest returned 403. Referer=%s",
                referer,
            )
            return []
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        logger.warning("Yandex suggest request failed: %s", exc)
        return []

    suggestions = []
    for item in payload.get("results", []):
        title = (item.get("title") or {}).get("text", "").strip()
        subtitle = (item.get("subtitle") or {}).get("text", "").strip()
        if not title:
            continue

        formatted_address = (item.get("address") or {}).get("formatted_address", "").strip()
        if formatted_address:
            value = formatted_address
            label = formatted_address
        elif subtitle and subtitle not in title:
            value = f"{subtitle}, {title}"
            label = value
        else:
            value = title
            label = title

        suggestion = {"label": label, "value": value}
        uri = (item.get("uri") or "").strip()
        if uri:
            suggestion["uri"] = uri

        suggestions.append(suggestion)

    return suggestions
