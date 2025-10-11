# Imagen ligera de Python 3.11
FROM python:3.11-slim

# Variables y directorio de trabajo
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    PYTHONPATH=/app/src

WORKDIR /app

# Dependencias del sistema (psycopg2, pillow, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY manage.py ./manage.py
COPY src ./src
COPY docker/app/gunicorn_conf.py /app/gunicorn_conf.py

# Puerto expuesto por la app
EXPOSE 8000

# Comando por defecto (sobrescrito por docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
