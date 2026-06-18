import os

from .settings import *

DEBUG = True
THUMBNAIL_DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "localhost:8000",
    "jteam.ru",
    "www.jteam.ru",
    ".ngrok-free.app",  # Разрешает все поддомены ngrok
    "3e15-192-119-10-202.ngrok-free.app",  # Конкретный домен
]

# В Docker хост БД — "database", локально — localhost.
DATABASES["default"]["HOST"] = os.environ.get(
    "LOCAL_DB_HOST",
    "localhost" if os.environ.get("POSTGRES_DB_HOST") == "database" else DATABASES["default"]["HOST"],
)

# В Docker хост Redis — "redis", локально — 127.0.0.1.
REDIS_HOST = os.environ.get("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("REDIS_PORT", REDIS_PORT))
CELERY_BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

# Настройки логирования для разработки
LOGGING["root"]["level"] = "DEBUG"
LOGGING["handlers"]["file"]["level"] = "DEBUG"

CSRF_TRUSTED_ORIGINS = [
    "https://jteam.ru",
    "https://www.jteam.ru",
    "https://*.ngrok-free.app",
    "https://3e15-192-119-10-202.ngrok-free.app"
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True

