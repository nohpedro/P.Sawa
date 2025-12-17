from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

# Import explícito (si falla aquí, es 100% un tema de rutas/INSTALLED_APPS)
from users.models import Cliente


class Command(BaseCommand):
    help = "Genera usuarios y un administrador para pruebas de API"

    def handle(self, *args, **options):
        User = get_user_model()

        # Admin
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin",
                email="admin@example.com",
                password="admin",
            )
            self.stdout.write(self.style.SUCCESS("Usuario administrador creado: admin / admin"))
        else:
            self.stdout.write(self.style.WARNING("Usuario administrador ya existe"))

        # Usuarios normales
        usuarios = [
            {"username": "juan", "email": "juan@example.com", "password": "123456"},
            {"username": "maria", "email": "maria@example.com", "password": "123456"},
            {"username": "pedro", "email": "pedro@example.com", "password": "123456"},
            {"username": "ana", "email": "ana@example.com", "password": "123456"},
        ]

        for data in usuarios:
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={"email": data["email"]},
            )
            if created:
                user.set_password(data["password"])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Usuario creado: {data['username']} / {data['password']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Usuario {data['username']} ya existe"))

            # La señal post_save crea el Cliente, pero validamos por si acaso:
            Cliente.objects.get_or_create(user=user)

        self.stdout.write(self.style.SUCCESS("Seed ejecutado correctamente"))
