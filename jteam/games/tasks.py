from celery import shared_task
from django.utils import timezone
from games.models import Game
import logging

logger = logging.getLogger(__name__)

def sync_game_statuses():
    """
    Обновляет статусы игр на основе времени начала и продолжительности.

    Логика:
    1. Игры со статусом 'open', время начала которых наступило, переводятся в 'started'
    2. Игры со статусом 'started', время окончания которых прошло, переводятся в 'finished'
    """
    now = timezone.now()

    games_to_start = Game.objects.filter(status="open", start_time__lte=now)
    started_count = games_to_start.update(status="started")

    finished_count = 0
    for game in Game.objects.filter(status="started"):
        if now >= game.start_time + game.duration:
            game.status = "finished"
            game.save(update_fields=["status"])
            finished_count += 1

    return started_count, finished_count


@shared_task
def update_game_status():
    now = timezone.now()
    logger.info(f"Запуск обновления статусов игр в {now}")

    started_count, finished_count = sync_game_statuses()

    result = f"Updated: {started_count} games started, {finished_count} games finished"
    logger.info(result)
    return result
