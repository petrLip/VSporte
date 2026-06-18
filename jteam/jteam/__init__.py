try:
    from .celery import app as app_celery
except ModuleNotFoundError:
    app_celery = None

__all__ = ("app_celery",)  # использование кортежа вместо списка
