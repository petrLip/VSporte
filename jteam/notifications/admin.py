from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "recipient",
        "actor",
        "notification_type",
        "target",
        "read_at",
        "created",
    ]
    list_filter = ["notification_type", "read_at", "created"]
    search_fields = ["recipient__username", "actor__username"]
    readonly_fields = ["created"]
