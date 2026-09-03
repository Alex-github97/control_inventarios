"""
Siembra los módulos operativos de la cuenta de demostración.

    python tools/sembrar_operacion.py --esquema cli_demoflota --modulo wms \
        --desde 2025-09-01 --hasta 2026-09-02

Cada módulo se siembra por separado y a propósito: son horas de datos y querer
sembrarlo todo de una vez obliga a empezar de nuevo cuando falla el último.

`--limpiar` borra ANTES de sembrar y solo toca las tablas del módulo indicado en
el esquema indicado. No hay un «borrar todo» porque no existe ninguna razón para
que esta herramienta pueda tocar la operación de un cliente.

Al terminar corre la comprobación del módulo. Sembrar sin comprobar solo llena la
base: lo que hace utilizables estos datos es que el inventario cuadre con los
movimientos, y eso se dice acá o no se sabe.
"""
import argparse
import asyncio
import os
import sys
import time
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text                                    # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession                # noqa: E402

import app.main                                                # noqa: F401,E402
from app.core.database import engine                           # noqa: E402
from app.core import demo_wms                                  # noqa: E402

# En orden de dependencia: `TRUNCATE` sin `CASCADE` es justamente lo que impide
# borrar de más por accidente, y para eso el orden tiene que ser correcto.
TABLAS = {
    "wms": [
        "wms_kpi_diario", "wms_eventos_trazabilidad",
        "wms_devoluciones_detalle", "wms_devoluciones",
        "wms_despachos_detalle", "wms_despachos", "wms_historial_estado",
        "wms_picking_detalles", "wms_picking_tareas",
        "wms_ordenes_salida_detalle", "wms_ordenes_salida",
        "wms_conteos_detalle", "wms_conteos_inventario",
        "wms_movimientos_inventario", "wms_inventario_ubicacion",
        "wms_recepciones_detalle", "wms_recepciones",
        "wms_ordenes_compra_detalle", "wms_ordenes_compra",
        "wms_series", "wms_lotes", "wms_productos",
        "wms_transportadoras", "wms_clientes", "wms_proveedores",
        "wms_ubicaciones", "wms_zonas", "wms_almacenes",
        "wms_familias_producto", "wms_categorias_producto",
        "wms_ciudades", "wms_paises", "wms_motivos_movimiento",
        "wms_unidades_medida", "wms_tipos_ubicacion", "wms_tipos_zona",
    ],
}


def _fecha(t: str) -> date:
    return date.fromisoformat(t)


async def limpiar(db, esquema: str, modulo: str) -> None:
    print(f"Limpiando «{modulo}» de «{esquema}»…")
    borradas = 0
    for tabla in TABLAS[modulo]:
        existe = (await db.execute(text("SELECT to_regclass(:t)"),
                                   {"t": f"{esquema}.{tabla}"})).scalar()
        if existe:
            await db.execute(text(f'TRUNCATE TABLE "{esquema}"."{tabla}" CASCADE'))
            borradas += 1
    await db.commit()
    await db.execute(text(f'SET search_path TO "{esquema}"'))
    print(f"  {borradas} tablas vaciadas")


async def principal() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--esquema", default="public")
    ap.add_argument("--modulo", required=True, choices=sorted(TABLAS))
    ap.add_argument("--desde", type=_fecha, default=date(2025, 9, 1))
    ap.add_argument("--hasta", type=_fecha, default=date.today())
    ap.add_argument("--por-dia", type=int, default=12,
                    help="órdenes de salida por día hábil, antes de estacionalidad")
    ap.add_argument("--limpiar", action="store_true")
    args = ap.parse_args()

    # `expire_on_commit=False`: al consolidar, la sesión por omisión invalida
    # todo lo cargado y el siguiente acceso dispara una recarga en medio del
    # bucle, fuera del contexto async, que revienta con MissingGreenlet.
    async with AsyncSession(engine, expire_on_commit=False) as db:
        await db.execute(text(f'SET search_path TO "{args.esquema}"'))

        if args.limpiar:
            await limpiar(db, args.esquema, args.modulo)

        print(f"Sembrando «{args.modulo}» en «{args.esquema}» "
              f"del {args.desde} al {args.hasta}…")
        t0 = time.monotonic()
        resumen = await demo_wms.sembrar_wms(
            db, desde=args.desde, hasta=args.hasta,
            salidas_por_dia_habil=args.por_dia, esquema=args.esquema,
            avisar=print)
        segundos = round(time.monotonic() - t0, 1)

        print("\nLo sembrado")
        print("─" * 52)
        for clave, valor in resumen.items():
            print(f"  {clave:24s} {valor:>12,}".replace(",", "."))
        print(f"\n  sembrado en {segundos} s")

        print("\nComprobación")
        print("─" * 52)
        v = await demo_wms.verificar(db)
        for clave, valor in v.items():
            print(f"  {clave:24s} {valor:>16,.2f}")
        cuadra = abs(v["diferencia"]) < 0.5 and v["posiciones_negativas"] == 0
        print(f"\n  el inventario {'CUADRA' if cuadra else '¡NO CUADRA!'} "
              f"con los movimientos")
        if not cuadra:
            sys.exit(1)

    await engine.dispose()


asyncio.run(principal())
