from .services import get_unread_count


def notifications(request):
    if request.user.is_authenticated:
        return {"notifications_unread_count": get_unread_count(request.user)}
    return {"notifications_unread_count": 0}
