"""Listas por trozos con el total en la cabecera.

POR QUÉ EXISTE
Varias listas del CMMS se devolvían enteras. Con una flota grande eran decenas
de miles de filas —65 MB las llantas— y armar esa respuesta ocupa el proceso
varios segundos seguidos sin soltarlo. En producción uvicorn corre varios
procesos y el supervisor le pregunta a cada uno, cada pocos segundos, si sigue
vivo; el que no contesta en 5 segundos se da por colgado y se mata. Así una
sola pantalla abierta tumbaba los procesos y a todos los usuarios conectados.

Es la misma convención de `erp._pagina`: `limite` y `desplazamiento` en la
consulta, y el total en `X-Total-Count`. El cuerpo sigue siendo un arreglo, así
que quien ya consumía la ruta como lista sigue funcionando.
"""
from typing import Optional

from fastapi import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def contar(db: AsyncSession, consulta) -> int:
    """Cuántas filas devolvería la consulta, sin traerlas."""
    return (await db.execute(
        select(func.count()).select_from(consulta.order_by(None).subquery()))).scalar() or 0


def poner_total(respuesta: Response, total: int, limite: Optional[int], desplazamiento: int) -> None:
    respuesta.headers["X-Total-Count"] = str(total)
    if limite is not None:
        respuesta.headers["X-Limite"] = str(limite)
    respuesta.headers["X-Desplazamiento"] = str(desplazamiento)
    # Sin esto el navegador no deja leer las cabeceras desde otro origen.
    respuesta.headers["Access-Control-Expose-Headers"] = "X-Total-Count, X-Limite, X-Desplazamiento"


async def pagina(db: AsyncSession, consulta, respuesta: Response,
                 limite: Optional[int], desplazamiento: int):
    """Ejecuta un trozo de la consulta y deja el total en la cabecera."""
    poner_total(respuesta, await contar(db, consulta), limite, desplazamiento)
    if desplazamiento:
        consulta = consulta.offset(desplazamiento)
    if limite is not None:
        consulta = consulta.limit(limite)
    return (await db.execute(consulta)).scalars().all()
