from django.contrib import admin

from .models import Game, GameParticipationRequest, GameInvitation


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    """field for admin"""

    list_display = ["sport", "max_players", "place", "duration", "get_formatted_duration", "created_at", "slug"]
    list_filter = ["created_at", "sport", "duration"]
    
    def get_formatted_duration(self, obj):
        """Отображает продолжительность в читаемом формате в админ-панели"""
        return obj.get_formatted_duration()
    get_formatted_duration.short_description = "Продолжительность (формат)"


@admin.register(GameParticipationRequest)
class GameParticipationRequestAdmin(admin.ModelAdmin):
    list_display = ["game", "user", "status", "created"]
    list_filter = ["status", "created"]
    search_fields = ["game__place", "user__username"]


@admin.register(GameInvitation)
class GameInvitationAdmin(admin.ModelAdmin):
    list_display = ["game", "from_user", "to_user", "status", "created"]
    list_filter = ["status", "created"]
    search_fields = ["game__place", "from_user__username", "to_user__username"]
