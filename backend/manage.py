#!/usr/bin/env python
import os
import sys
from pathlib import Path


# === Asegurar que /src esté en el sys.path ===
BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / 'src'
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def main():
    """
    Punto de entrada del proyecto Django.
    Se asegura de que el entorno de settings esté configurado
    correctamente tanto dentro de Docker como en ejecución local.
    """
    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE",
        os.getenv("DJANGO_SETTINGS_MODULE", "core.settings.dev"),
    )

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "No se pudo importar Django. "
            "Asegúrate de tenerlo instalado y disponible en tu entorno."
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
