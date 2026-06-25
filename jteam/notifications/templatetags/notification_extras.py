from django import template

from notifications.services import (
    get_notification_game,
    get_notification_message,
    get_notification_url,
)

register = template.Library()


@register.filter
def notification_message(notification):
    return get_notification_message(notification)


@register.filter
def notification_url(notification):
    return get_notification_url(notification)


@register.filter
def notification_game(notification):
    return get_notification_game(notification)
