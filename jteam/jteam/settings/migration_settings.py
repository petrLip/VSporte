from .settings import *  # noqa

# Минимальный набор для запуска миграций в локальном окружении без optional-пакетов.
_required_apps = {
    "account.apps.AccountConfig",
    "games.apps.GamesConfig",
    "actions.apps.ActionsConfig",
    "location.apps.LocationConfig",
    "cart.apps.CartConfig",
    "orders.apps.OrdersConfig",
    "payment.apps.PaymentConfig",
    "coupons.apps.CouponsConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
}

INSTALLED_APPS = [app for app in INSTALLED_APPS if app in _required_apps]  # noqa: F405

MIDDLEWARE = [  # noqa: F405
    middleware
    for middleware in MIDDLEWARE  # noqa: F405
    if not middleware.startswith("social_django.")
    and not middleware.startswith("debug_toolbar.")
]

for template in TEMPLATES:  # noqa: F405
    cps = template.get("OPTIONS", {}).get("context_processors", [])
    template["OPTIONS"]["context_processors"] = [
        cp for cp in cps if not cp.startswith("social_django.")
    ]

AUTHENTICATION_BACKENDS = [  # noqa: F405
    "django.contrib.auth.backends.ModelBackend",
    "account.authentication.EmailAuthBackend",
]
