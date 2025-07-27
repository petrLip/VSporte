from .settings import *

DEBUG = True
THUMBNAIL_DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "jteam.ru",
    "www.jteam.ru",
    ".ngrok-free.app",  # Разрешает все поддомены ngrok
    "3e15-192-119-10-202.ngrok-free.app",  # Конкретный домен
]

# # Локальная БД для разработки
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": BASE_DIR / "db.sqlite3",
#     }
# }

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

