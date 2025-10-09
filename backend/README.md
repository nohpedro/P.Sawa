# Proy Volley – Backend Django

API modular en Django + DRF para gestionar espacios, tipos de actividad y reservas.  
Incluye documentación OpenAPI (drf-spectacular) y entorno Docker con Postgres.

## Requisitos
- Docker 24+ y Docker Compose v2
- (Opcional) Python 3.11+ para ejecutar localmente sin Docker

## Estructura
- compose/ # variables de entorno (local/prod)
- docker/ # Dockerfiles y scripts
- src/ # código Django (core, common, users, espacios, reservas)