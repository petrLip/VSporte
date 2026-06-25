import datetime

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from django.utils import timezone

from .models import Notification

FRIENDSHIP_NOTIFICATION_TYPES = {
    Notification.TYPE_FRIENDSHIP_REQUEST,
    Notification.TYPE_FRIENDSHIP_ACCEPTED,
}

GAME_NOTIFICATION_TYPES = {
    Notification.TYPE_GAME_PARTICIPATION_REQUEST,
    Notification.TYPE_GAME_INVITATION,
    Notification.TYPE_GAME_PARTICIPATION_ACCEPTED,
    Notification.TYPE_GAME_PARTICIPATION_REJECTED,
}


def _actor_display_name(user):
    return user.get_full_name() or user.username


def _game_sport_label(game):
    return game.get_sport_display()


def get_notification_message(notification):
    actor = _actor_display_name(notification.actor)
    target = notification.target
    notification_type = notification.notification_type

    if notification_type == Notification.TYPE_FRIENDSHIP_REQUEST:
        return f"{actor} отправил вам заявку в друзья"

    if notification_type == Notification.TYPE_FRIENDSHIP_ACCEPTED:
        return f"{actor} принял вашу заявку в друзья"

    if notification_type == Notification.TYPE_GAME_PARTICIPATION_REQUEST:
        game = getattr(target, "game", target)
        sport = _game_sport_label(game)
        return f"{actor} запросил участие в вашем мероприятии {sport}"

    if notification_type == Notification.TYPE_GAME_INVITATION:
        game = getattr(target, "game", target)
        sport = _game_sport_label(game)
        return f"{actor} пригласил вас на мероприятие {sport}"

    if notification_type == Notification.TYPE_GAME_PARTICIPATION_ACCEPTED:
        game = getattr(target, "game", target)
        sport = _game_sport_label(game)
        return f"{actor} принял вашу заявку на участие в мероприятии {sport}"

    if notification_type == Notification.TYPE_GAME_PARTICIPATION_REJECTED:
        game = getattr(target, "game", target)
        sport = _game_sport_label(game)
        return f"{actor} отклонил вашу заявку на участие в мероприятии {sport}"

    return f"{actor} отправил вам уведомление"


def get_notification_game(notification):
    if notification.notification_type not in GAME_NOTIFICATION_TYPES:
        return None
    target = notification.target
    if target is None:
        return None
    return getattr(target, "game", target)


def get_notification_url(notification):
    if notification.notification_type in FRIENDSHIP_NOTIFICATION_TYPES:
        return reverse("user_detail", args=[notification.actor.username])
    game = get_notification_game(notification)
    if game is not None:
        return game.get_absolute_url()
    return reverse("dashboard")


def create_notification(recipient, actor, notification_type, target):
    if recipient == actor:
        return None

    now = timezone.now()
    last_minute = now - datetime.timedelta(seconds=60)
    target_ct = ContentType.objects.get_for_model(target)
    similar = Notification.objects.filter(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        target_ct=target_ct,
        target_id=target.pk,
        created__gte=last_minute,
    )
    if similar.exists():
        return None

    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        target=target,
    )


def get_unread_count(user):
    return Notification.objects.filter(recipient=user, read_at__isnull=True).count()


def mark_as_read(notification, user):
    if notification.recipient_id != user.id:
        return False
    if notification.read_at is not None:
        return True
    notification.read_at = timezone.now()
    notification.save(update_fields=["read_at"])
    return True


def mark_all_as_read(user):
    return Notification.objects.filter(
        recipient=user, read_at__isnull=True
    ).update(read_at=timezone.now())
