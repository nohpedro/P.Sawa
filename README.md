# Proy-Volley
Requisitos:
- Docker
## Levantar el proyecto:
docker compose up --build
Puerto:
http://localhost:7000

__Seeds:__
- docker compose exec app python manage.py seed
- docker compose exec app python manage.py seed_espacios
## <sub> Swagger: </sub>
http://localhost:7000/api/schema/swagger-ui/
### __Estructura:__
- core/ configuración principal
- auth_vap/ autenticación JWT
- users/ usuarios y clientes
- espacios/ espacios, reglas, reservas
- common_vap/ utilidades compartidas