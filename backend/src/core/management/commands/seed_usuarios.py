from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

from users.models import Cliente


class Command(BaseCommand):
    help = "Genera un usuario administrador y usuarios cliente para pruebas"

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # =========================
        # ADMINISTRADOR ÚNICO
        # =========================
        admin_username = "admin"
        admin_email = "admin@example.com"
        admin_password = "admin"

        admin, created = User.objects.get_or_create(
            username=admin_username,
            defaults={"email": admin_email},
        )

        # Asegurar flags de admin (si ya existía pero no era superuser)
        changed = False
        if admin.email != admin_email:
            admin.email = admin_email
            changed = True
        if not admin.is_staff:
            admin.is_staff = True
            changed = True
        if not admin.is_superuser:
            admin.is_superuser = True
            changed = True

        if created:
            admin.set_password(admin_password)
            admin.save()
            self.stdout.write(self.style.SUCCESS("Administrador creado: admin / admin"))
        else:
            if changed:
                admin.save(update_fields=["email", "is_staff", "is_superuser"])
            self.stdout.write(self.style.WARNING("Administrador ya existe (verificado)"))

        # Nota: tu signal crea Cliente para cualquier user.
        # No intentamos borrarlo porque se recreará; solo lo dejamos.
        Cliente.objects.get_or_create(user=admin)

        # =========================
        # USUARIOS CLIENTE
        # =========================
        clientes = [
            {
                "username": "juan",
                "email": "juan@example.com",
                "password": "123456",
                "nombre": "Juan",
                "apellido": "Pérez",
                "telefono": "70000001",
                "documento": "CI-1000001",
            },
            {
                "username": "maria",
                "email": "maria@example.com",
                "password": "123456",
                "nombre": "María",
                "apellido": "Gómez",
                "telefono": "70000002",
                "documento": "CI-1000002",
            },
            {
                "username": "pedro",
                "email": "pedro@example.com",
                "password": "123456",
                "nombre": "Pedro",
                "apellido": "Rojas",
                "telefono": "70000003",
                "documento": "CI-1000003",
            },
            {
                "username": "ana",
                "email": "ana@example.com",
                "password": "123456",
                "nombre": "Ana",
                "apellido": "Flores",
                "telefono": "70000004",
                "documento": "CI-1000004",
            },
        ]

        for data in clientes:
            username = data["username"]
            email = data["email"]
            password = data["password"]

            user, user_created = User.objects.get_or_create(
                username=username,
                defaults={"email": email},
            )

            # Asegurar que sean clientes (no staff / no superuser)
            user_changed = False
            if user.email != email:
                user.email = email
                user_changed = True
            if user.is_staff:
                user.is_staff = False
                user_changed = True
            if user.is_superuser:
                user.is_superuser = False
                user_changed = True

            if user_created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Cliente creado: {username} / {password}"))
            else:
                # opcional: resetear password si quieres que siempre sea el mismo en seed
                # user.set_password(password)
                # user_changed = True

                if user_changed:
                    user.save(update_fields=["email", "is_staff", "is_superuser"])
                self.stdout.write(self.style.WARNING(f"Usuario {username} ya existe (verificado como cliente)"))

            # Perfil Cliente (tu signal normalmente lo crea; aquí solo garantizamos y llenamos datos)
            cliente, _ = Cliente.objects.get_or_create(user=user)
            cliente_changed = False

            for field in ("nombre", "apellido", "telefono", "documento"):
                if hasattr(cliente, field) and getattr(cliente, field) != data.get(field, ""):
                    setattr(cliente, field, data.get(field, ""))
                    cliente_changed = True

            if cliente_changed:
                cliente.save()

        self.stdout.write(self.style.SUCCESS("Seed ejecutado correctamente"))
