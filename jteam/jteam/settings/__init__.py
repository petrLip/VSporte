import os
from .settings import *

ENVIRONMENT = os.getenv("DJANGO_ENV", "local").lower()
if ENVIRONMENT not in ("local", "prod"):
    raise RuntimeError(f"Unknown DJANGO_ENV={ENVIRONMENT}")

if ENVIRONMENT == "prod":
    from .prod import *
else:
    from .local import *
