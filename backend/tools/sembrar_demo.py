"""
Siembra la cuenta de demostración con volumen y mide lo que cuesta.

    python tools/sembrar_demo.py --esquema cli_demoflota --desde 2024-01-01 \
        --hasta 2026-08-31 --terceros 300 --por-dia 14

Después de sembrar corre los reportes contables y cronometra cada uno. Ese
cronómetro es el objetivo del ejercicio: sembrar sin medir solo llena la base.

`--limpiar` borra ANTES de sembrar y solo toca las tablas del ERP financiero del
esquema indicado. No se ofrece un «borrar todo» porque no hay ninguna razón para
que esta herramienta pueda tocar la operación de un cliente.
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
from app.core import erp_demo                                  # noqa: E402

# Solo las del ERP financiero, y en orden de dependencia. El orden importa
# porque `TRUNCATE` sin `CASCADE` es lo que impide borrar de más por accidente.
TABLAS = [
    "erp_comprobante_lineas", "erp_comprobantes", "erp_consecutivos",
    "erp_auditoria", "erp_eventos_contables", "erp_periodos",
    "erp_pagos", "erp_lineas_factura_cliente", "erp_facturas_cliente",
    "erp_facturas_proveedor", "erp_depreciacion_activos", "erp_activos_fijos",
    "erp_terceros",
]


def _fecha(t: str) -> date:
    return date.fromisoformat(t)


async def limpiar(db, esquema: str) -> None:
    print(f"Limpiando el ERP financiero de «{esquema}»…")
    for tabla in TABLAS:
        existe = (await db.execute(text("SELECT to_regclass(:t)"),
                                   {"t": f"{esquema}.{tabla}"})).scalar()
        if existe:
            await db.execute(text(f"TRUNCATE {tabla} RESTART IDENTITY CASCADE"))
    await db.commit()


async def medir(db, empresa_id: int, desde: date, hasta: date) -> None:
    """Cronometra los reportes, que es donde el volumen se siente."""
    from app.api.v1.endpoints import erp_contable as rep

    pruebas = [
        ("balance de comprobación (año)",
         lambda: rep.balance_comprobacion(
             empresa_id=empresa_id, hasta=hasta, desde=desde,
             centro_costo_id=None, solo_con_movimiento=True, db=db, usuario=None)),
        ("estado de situación financiera",
         lambda: rep.estado_situacion_financiera(
             empresa_id=empresa_id, hasta=hasta, comparar_con=None,
             db=db, usuario=None)),
        ("estado de resultados (año)",
         lambda: rep.estado_resultados(
             empresa_id=empresa_id, desde=desde, hasta=hasta,
             centro_costo_id=None, db=db, usuario=None)),
        ("libro diario (un mes, 500)",
         lambda: rep.libro_diario(
             empresa_id=empresa_id, desde=date(hasta.year, hasta.month, 1),
             hasta=hasta, limite=500, db=db, usuario=None)),
    ]

    print("\nTiempos de los reportes")
    print("─" * 56)
    for nombre, correr in pruebas:
        t0 = time.monotonic()
        try:
            r = await correr()
        except Exception as e:                                  # noqa: BLE001
            print(f"  {nombre:38s} FALLÓ: {type(e).__name__}: {e}")
            continue
        ms = (time.monotonic() - t0) * 1000
        detalle = ""
        if isinstance(r, dict):
            if "filas" in r:
                detalle = f"{len(r['filas'])} cuentas"
                if r.get("cuadra") is False:
                    detalle += "  ¡NO CUADRA!"
            elif "comprobantes" in r:
                detalle = f"{len(r['comprobantes'])} comprobantes"
        marca = "  " if ms < 1000 else " ←"
        print(f"  {nombre:38s} {ms:8.0f} ms  {detalle}{marca}")

    # El mayor de la cuenta con más movimiento: el peor caso realista.
    peor = (await db.execute(text(
        "SELECT l.cuenta_id, count(*) FROM erp_comprobante_lineas l "
        "JOIN erp_comprobantes c ON c.id = l.comprobante_id "
        "WHERE c.empresa_id = :e GROUP BY 1 ORDER BY 2 DESC LIMIT 1"),
        {"e": empresa_id})).first()
    if peor:
        t0 = time.monotonic()
        r = await rep.libro_mayor(
            empresa_id=empresa_id, cuenta_id=peor[0], desde=desde, hasta=hasta,
            limite=500, desplazamiento=0, db=db, usuario=None)
        ms = (time.monotonic() - t0) * 1000
        print(f"  {'libro mayor (primera página)':38s} {ms:8.0f} ms  "
              f"{len(r['lineas'])} de {r['total_lineas']} líneas")

        # La última página es el peor caso de la paginación: hay que arrastrar el
        # saldo de todo lo anterior.
        ultima = max(0, (r['total_lineas'] - 1) // 500 * 500)
        t0 = time.monotonic()
        r2 = await rep.libro_mayor(
            empresa_id=empresa_id, cuenta_id=peor[0], desde=desde, hasta=hasta,
            limite=500, desplazamiento=ultima, db=db, usuario=None)
        ms = (time.monotonic() - t0) * 1000
        print(f"  {'libro mayor (última página)':38s} {ms:8.0f} ms  "
              f"saldo final {r2['saldo_final']:,.2f}")


async def principal() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--esquema", default="public")
    ap.add_argument("--desde", type=_fecha, default=date(2024, 1, 1))
    ap.add_argument("--hasta", type=_fecha, default=date.today())
    ap.add_argument("--terceros", type=int, default=300)
    ap.add_argument("--por-dia", type=int, default=14,
                    help="facturas de venta por día hábil, antes de estacionalidad")
    ap.add_argument("--limpiar", action="store_true")
    ap.add_argument("--solo-medir", action="store_true")
    args = ap.parse_args()

    # `expire_on_commit=False`: al consolidar, la sesión por omisión invalida
    # todo lo cargado y el siguiente acceso a un activo dispara una recarga en
    # medio del bucle, fuera del contexto async.
    async with AsyncSession(engine, expire_on_commit=False) as db:
        await db.execute(text(f'SET search_path TO "{args.esquema}"'))

        if args.limpiar and not args.solo_medir:
            await limpiar(db, args.esquema)

        if args.solo_medir:
            eid = (await db.execute(text(
                "SELECT id FROM erp_empresas ORDER BY id LIMIT 1"))).scalar()
            if eid is None:
                print("No hay ninguna empresa en ese esquema.")
                return
            await medir(db, eid, args.desde, args.hasta)
            return

        print(f"Sembrando «{args.esquema}» del {args.desde} al {args.hasta}…")
        r = await erp_demo.sembrar_volumen(
            db, desde=args.desde, hasta=args.hasta, terceros=args.terceros,
            facturas_por_dia_habil=args.por_dia, esquema=args.esquema,
            avisar=print)

        c = r["conteo"]
        print("\nLo sembrado")
        print("─" * 56)
        for clave in ("facturas_cliente", "facturas_proveedor", "pagos",
                      "nomina", "depreciacion", "comprobantes",
                      "lineas_contables"):
            print(f"  {clave:24s} {c.get(clave, 0):>12,}".replace(",", "."))
        print(f"  {'débitos':24s} {c['debitos']:>16,.2f}")
        print(f"  {'créditos':24s} {c['creditos']:>16,.2f}")
        print(f"  {'cuadra':24s} {'sí' if c['cuadra'] else '¡NO!'}")
        print(f"\n  sembrado en {r['tiempos']['segundos']} s")

        await medir(db, r["empresa_id"], args.desde, args.hasta)

    await engine.dispose()


asyncio.run(principal())
