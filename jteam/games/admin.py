from django.contrib import admin

from .models import Game


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    """field for admin"""

    list_display = ["sport", "max_players", "place", "duration", "get_formatted_duration", "created_at", "slug"]
    list_filter = ["created_at", "sport", "duration"]
    
    def get_formatted_duration(self, obj):
        """Отображает продолжительность в читаемом формате в админ-панели"""
        return obj.get_formatted_duration()
    get_formatted_duration.short_description = "Продолжительность (формат)"
