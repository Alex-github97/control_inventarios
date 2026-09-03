"""
Crea los operarios de planta con su usuario de la plataforma.

    python tools/sembrar_operarios_mes.py --esquema cli_demoflota

POR QUÉ UN USUARIO POR OPERARIO
Porque es lo único que permite medir la productividad de cada quien. Con un
código compartido en la terminal, el sistema sabe cuánto produjo la línea pero no
quién lo produjo, y ese es justamente el dato por el que una planta compra un
MES.

El PIN de terminal no reemplaza la contraseña: la terminal queda abierta con la
sesión de la empresa y el PIN dice cuál de los operarios está reportando. Pedir
la contraseña completa en un teclado de planta, con guantes y prisa, termina en
que todos comparten una sesión — y ahí se pierde exactamente lo que se quería
medir.

Las contraseñas no se imprimen ni se guardan en ningún archivo: se generan, se
almacenan cifradas y se muestra solo el PIN, que es lo que el operario necesita
saber para usar la terminal.
"""
import argparse
import asyncio
import os
import secrets
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text                            # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession                # noqa: E402

import app.main                                                # noqa: F401,E402
from app.core.database import engine                           # noqa: E402
from app.core.security import hash_password                    # noqa: E402
from app.infrastructure.models.mes import MESOperario, MESPlanta  # noqa: E402
from app.infrastructure.models.usuario import Usuario          # noqa: E402

# (nombre, apellido, cargo, PIN)
#
# Los PIN son fijos y visibles acá a propósito: esto siembra una cuenta de
# DEMOSTRACIÓN, donde el valor está en poder entrar y probar. En un cliente real
# los genera el administrador desde la plataforma.
OPERARIOS = [
    ("Édinson", "Rincón Salazar",   "Operario de extrusión",   "1234"),
    ("Marcela", "Ospina Cárdenas",  "Operaria de mezclado",    "2345"),
    ("Jhon",    "Betancur Mejía",   "Operario de troquelado",  "3456"),
    ("Natalia", "Quintero Valencia","Operaria de empaque",     "4567"),
    ("Wilson",  "Zapata Arango",    "Operario de calidad",     "5678"),
    ("Paola",   "Cifuentes Bedoya", "Supervisora de línea",    "6789"),
]


def _sin_tildes(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


async def principal() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--esquema", default="public")
    args = ap.parse_args()

    async with AsyncSession(engine, expire_on_commit=False) as db:
        await db.execute(text(f'SET search_path TO "{args.esquema}"'))

        planta = (await db.execute(select(MESPlanta).limit(1))).scalar_one_or_none()
        if planta is None:
            print("No hay ninguna planta en este esquema. Créela primero.")
            return

        rol_id = (await db.execute(text(
            "SELECT id FROM roles WHERE nombre = 'OPERADOR_BODEGA' LIMIT 1"))).scalar()

        creados, existentes = [], []
        for i, (nombre, apellido, cargo, pin) in enumerate(OPERARIOS, start=1):
            usuario_nombre = _sin_tildes(
                f"{nombre[0]}{apellido.split()[0]}").lower()
            codigo = f"OP-{i:03d}"

            ya = (await db.execute(select(MESOperario).where(
                MESOperario.codigo == codigo))).scalar_one_or_none()
            if ya is not None:
                existentes.append(codigo)
                continue

            usuario = (await db.execute(select(Usuario).where(
                Usuario.username == usuario_nombre))).scalar_one_or_none()
            if usuario is None:
                usuario = Usuario(
                    nombre=nombre, apellido=apellido,
                    email=f"{usuario_nombre}@demo-tittanware.com",
                    username=usuario_nombre,
                    # Una contraseña larga y aleatoria que nadie necesita: al
                    # piso se entra con el PIN. Dejarla en blanco o previsible
                    # abriría una puerta de verdad al resto de la plataforma.
                    hashed_password=hash_password(secrets.token_urlsafe(24)),
                    rol="OPERADOR_BODEGA", rol_id=rol_id,
                    cargo=cargo, activo=True)
                db.add(usuario)
                await db.flush()

            db.add(MESOperario(
                codigo=codigo, nombre=f"{nombre} {apellido}",
                cedula=str(1_000_000_000 + i * 7_531_942),
                cargo=cargo, planta_id=planta.id,
                usuario_id=usuario.id, pin=pin, activo=True))
            creados.append((codigo, usuario_nombre, f"{nombre} {apellido}", pin))

        await db.commit()

        if existentes:
            print(f"Ya existían: {', '.join(existentes)}")
        if creados:
            print(f"\n{len(creados)} operarios creados en «{planta.nombre}»\n")
            print(f"  {'código':8s} {'usuario':14s} {'nombre':32s} PIN")
            print("  " + "─" * 62)
            for codigo, usuario_nombre, completo, pin in creados:
                print(f"  {codigo:8s} {usuario_nombre:14s} {completo:32s} {pin}")
            print("\n  Entran a la terminal con el usuario, el código o la cédula,")
            print("  y su PIN. Cada avance queda firmado con su cuenta.")

    await engine.dispose()


asyncio.run(principal())
