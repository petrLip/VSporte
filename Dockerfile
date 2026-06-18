FROM python:3.11-alpine3.18

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Установка необходимых пакетов
RUN apk update && \
    apk add --no-cache postgresql-libs gcc musl-dev \
    pango-dev zlib-dev jpeg-dev openjpeg-dev g++ libffi-dev \
    font-liberation netcat-openbsd

# Копирование requirements.txt и кода проекта
COPY requirements.txt /temp/requirements.txt
COPY jteam /jteam

WORKDIR /jteam
EXPOSE 8000

# Установка зависимостей из requirements.txt
RUN pip install -r /temp/requirements.txt
