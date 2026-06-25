from django.contrib import admin
from .models import Profile, Friendship


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "date_of_birth", "photo"]
    raw_id_fields = ["user"]


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ["from_user", "to_user", "status", "created"]
    list_filter = ["status"]
    raw_id_fields = ["from_user", "to_user"]
