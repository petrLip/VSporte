#!/bin/sh

# Ждем, пока база данных станет доступной
/usr/local/bin/wait-for-it.sh database:5432 --strict --timeout=30 -- echo "Database is up"

# Переходим в директорию проекта
cd /jteam

# Запускаем Celery worker
celery -A jteam worker --loglevel=info 