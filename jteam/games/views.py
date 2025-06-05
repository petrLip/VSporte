import redis
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_POST
from actions.utils import create_action
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models.functions import Greatest
import logging

from .forms import GameCreateForm, GameFilterForm
from .models import Game

logger = logging.getLogger(__name__)

def validate_date(value):
    if value < timezone.now().date():
        raise ValidationError("Дата не может быть в прошлом.")


def validate_time(value):
    now = timezone.now()
    if value < now.time() or (value == now.time() and now.date() > value.date()):
        raise ValidationError("Время не может быть в прошлом.")


@login_required
def game_create(request):
    if request.method == "POST":
        form = GameCreateForm(data=request.POST, files=request.FILES)
        if form.is_valid():
            new_game = form.save(commit=False)
            new_game.user = request.user
            
            logger.info("Форма валидна, начинаем создание игры.")
            logger.info("Полученные координаты: lat=%s, lon=%s",
                        form.cleaned_data.get('latitude'),
                        form.cleaned_data.get('longitude'))
            
            try:
                # Округляем время до минут
                start_time = new_game.start_time.replace(second=0, microsecond=0)
                new_game.start_time = start_time
                
                # Проверяем, что время в будущем
                if start_time <= timezone.localtime(timezone.now()):
                    messages.error(request, "Время начала игры должно быть в будущем")
                    logger.warning("Попытка создания игры в прошлом.")
                    return render(request, "games/game/create.html", {"section": "games", "form": form})
                
                # Сохраняем координаты без дополнительной проверки, так как фронтенд их гарантирует
                new_game.latitude = form.cleaned_data.get('latitude')
                new_game.longitude = form.cleaned_data.get('longitude')
                
                new_game.save()
                
                logger.info("Игра успешно создана: id=%s, координаты: lat=%s, lon=%s",
                            new_game.id, new_game.latitude, new_game.longitude)
                
                create_action(request.user, "создал(а) игру", new_game)
                messages.success(request, "Игра успешно создана")
                return redirect(new_game.get_absolute_url())
            except ValidationError as e:
                messages.error(request, e.message)
                logger.error("Ошибка валидации при создании игры: %s", e.message)
                return render(request, "games/game/create.html", {"section": "games", "form": form, "YANDEX_MAPS_API_KEY": settings.YANDEX_MAPS_API_KEY})
        else:
            logger.warning("Форма невалидна: ошибки - %s", form.errors)
    else:
        form = GameCreateForm()
    return render(request, "games/game/create.html", {"section": "games", "form": form, "YANDEX_MAPS_API_KEY": settings.YANDEX_MAPS_API_KEY})


def game_detail(request, id, slug):
    game = get_object_or_404(Game, id=id, slug=slug)
    # увеличить общее число просмотров игр на 1
    # пространство имен формат object-type:id:field
    total_views = r.incr(f"game:{game.id}:views")
    # увеличить рейтинг игр на 1
    # создаём сортированное множество
    r.zincrby("game_ranking", 1, game.id)
    return render(
        request,
        "games/game/detail.html",
        {"section": "games", "game": game, "total_views": total_views, "YANDEX_MAPS_API_KEY": settings.YANDEX_MAPS_API_KEY},
    )


@login_required
def game_list(request):
    """Выводит постраничный список игр с фильтрацией"""
    games = Game.objects.all()
    form = GameFilterForm(request.GET)
    
    if form.is_valid():
        sport = form.cleaned_data.get('sport')
        search = form.cleaned_data.get('search')
        
        if sport:
            games = games.filter(sport=sport)
            
        if search:
            games = games.annotate(
                similarity_username=TrigramSimilarity('user__username', search),
                similarity_first_name=TrigramSimilarity('user__first_name', search),
                similarity_last_name=TrigramSimilarity('user__last_name', search)
            ).annotate(
                similarity=Greatest(
                    'similarity_username',
                    'similarity_first_name',
                    'similarity_last_name'
                )
            ).filter(similarity__gt=0.1).order_by('-similarity')

    # Пагинация
    paginator = Paginator(games, 12)
    page = request.GET.get("page")
    games_only = request.GET.get("games_only")
    
    try:
        games = paginator.page(page)
    except PageNotAnInteger:
        # Если page_number не целое число, то выдать первую страницу
        games = paginator.page(1)
    except EmptyPage:
        if games_only:
            # Если AJAX-запрос и страница вне диапазона, то вернуть пустую страницу
            return HttpResponse("")
        # Если страница вне диапазона, то вернуть последнюю страницу результатов
        games = paginator.page(paginator.num_pages)
    
    if games_only:
        return render(
            request,
            "games/game/list_games.html",
            {"section": "games", "games": games}
        )
        
    return render(
        request,
        "games/game/list.html",
        {
            "section": "games",
            "games": games,
            "filter_form": form
        }
    )


# Не дает пользователям, не вошедшим в систему, обращаться к этому представлению.
# Этому представлению разрешаются запросы только методом POST.
@login_required
@require_POST
def game_join(request):
    """Представление, позволяющее присоединиться/выйти из игры"""
    game_id = request.POST.get("id")
    action = request.POST.get("action")
    if game_id and action:
        try:
            game = Game.objects.get(id=game_id)
            if action == "join":
                if game.joined_players.count() >= game.max_players:
                    return JsonResponse({
                        "status": "error",
                        "message": "Максимальное количество игроков достигнуто.",
                    })
                game.joined_players.add(request.user)
                create_action(request.user, "присоединился(ась) к игре", game)
            else:
                game.joined_players.remove(request.user)

            players = [
                {
                    "username": player.username,
                    "photo": player.profile.photo.url
                } for player in game.joined_players.all()
            ]

            return JsonResponse({
                "status": "ok",
                "players": players,
                "players_count": game.joined_players.count()
            })
        except Game.DoesNotExist:
            pass
    return JsonResponse({"status": "error"})


# соединить с redis
r = redis.Redis(
    host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB
)


@login_required
def game_ranking(request):
    # получить словарь рейтинга игр
    game_ranking = r.zrange("game_ranking", 0, -1, desc=True)[:10]
    game_ranking_ids = [int(id) for id in game_ranking]

    # получить наиболее просматриваемые изображения
    most_viewed = list(Game.objects.filter(id__in=game_ranking_ids))
    most_viewed.sort(key=lambda x: game_ranking_ids.index(x.id))
    return render(
        request,
        "games/game/ranking.html",
        {"section": "games", "most_viewed": most_viewed},
    )


@login_required
@require_POST
def game_delete(request, id):
    """Представление для удаления игры"""
    game = get_object_or_404(Game, id=id)
    # Проверяем, является ли текущий пользователь создателем игры
    if game.user == request.user:
        game.delete()
        messages.success(request, "Игра успешно удалена")
        return redirect('games:list')
    else:
        messages.error(request, "У вас нет прав для удаления этой игры")
        return redirect(game.get_absolute_url())
