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
from app.core import demo_hcm, demo_scm, demo_tms, demo_wms    # noqa: E402

# En orden de dependencia: `TRUNCATE` sin `CASCADE` es justamente lo que impide
# borrar de más por accidente, y para eso el orden tiene que ser correcto.
TABLAS = {
    # Gestión Humana. Va primero porque otros módulos cuelgan de ella: el TMS
    # asigna sus viajes a `hcm_conductor`, y ese a su vez a `hcm_colaborador`.
    # Se limpia de las hojas hacia la raíz.
    "hcm": [
        "hcm_kpi_diario", "hcm_sst_inspeccion", "hcm_sst_riesgo",
        "hcm_sst_incidente", "hcm_colaborador_capacitacion", "hcm_capacitacion",
        "hcm_entrevista", "hcm_postulacion", "hcm_vacante",
        "hcm_evaluacion_detalle", "hcm_evaluacion", "hcm_vacacion",
        "hcm_incapacidad", "hcm_liquidacion", "hcm_novedad",
        "hcm_nomina_detalle", "hcm_nomina_periodo",
        "hcm_conductor_accidente", "hcm_conductor_documento",
        "hcm_conductor_cobertura", "hcm_conductor_vehiculo_tipo",
        "hcm_conductor", "hcm_contrato", "hcm_colaborador_historial",
        "hcm_colaborador", "hcm_centro_costo", "hcm_cargo", "hcm_area",
        "hcm_sede", "hcm_empresa",
    ],
    # Transporte. Cuelga de `hcm_conductor`, así que se siembra después de «hcm».
    "tms": [
        "tms_kpi_diario", "tms_alerta", "tms_otif_registro", "tms_liquidacion",
        "tms_costo_viaje", "tms_pod", "tms_documento", "tms_evento",
        "tms_parada", "tms_viaje", "tms_punto_ruta", "tms_ruta",
        "tms_vehiculo", "tms_tipo_servicio", "tms_zona",
    ],
    # Abastecimiento. Cuelga de `proveedores` y de `usuarios`.
    "scm": [
        "scm_evaluaciones_proveedor", "scm_orden_items", "scm_ordenes_compra",
        "scm_solicitud_items", "scm_solicitudes_compra", "proveedores",
    ],
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
                    help="documentos por día hábil (salidas en WMS, "
                         "viajes en TMS), antes de estacionalidad")
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
        if args.modulo == "wms":
            resumen = await demo_wms.sembrar_wms(
                db, desde=args.desde, hasta=args.hasta,
                salidas_por_dia_habil=args.por_dia, esquema=args.esquema,
                avisar=print)
            comprobar = demo_wms.verificar
            regla = "el inventario CUADRA con los movimientos"
            falla = "¡el inventario NO CUADRA con los movimientos!"
        elif args.modulo == "tms":
            resumen = await demo_tms.sembrar_tms(
                db, desde=args.desde, hasta=args.hasta,
                viajes_por_dia_habil=args.por_dia, esquema=args.esquema,
                avisar=print)
            comprobar = demo_tms.verificar
            regla = "los costos CUADRAN y el OTIF coincide con las fechas"
            falla = "¡los costos o el OTIF NO CUADRAN!"
        elif args.modulo == "scm":
            resumen = await demo_scm.sembrar_scm(
                db, desde=args.desde, hasta=args.hasta,
                solicitudes_por_semana=args.por_dia, esquema=args.esquema,
                avisar=print)
            comprobar = demo_scm.verificar
            regla = "el total de cada orden es la suma de sus renglones"
            falla = "¡las órdenes de compra NO CUADRAN!"
        else:
            resumen = await demo_hcm.sembrar_hcm(
                db, desde=args.desde, hasta=args.hasta, esquema=args.esquema,
                avisar=print)
            comprobar = demo_hcm.verificar
            regla = "la nómina CUADRA: cada neto es su devengado menos su deducido"
            falla = "¡la nómina NO CUADRA!"
        segundos = round(time.monotonic() - t0, 1)

        print("\nLo sembrado")
        print("─" * 52)
        for clave, valor in resumen.items():
            print(f"  {clave:24s} {valor:>12,}".replace(",", "."))
        print(f"\n  sembrado en {segundos} s")

        print("\nComprobación")
        print("─" * 52)
        v = await comprobar(db)
        for clave, valor in v.items():
            print(f"  {clave:26s} {valor:>16,.2f}")
        # Cuadra si toda medida de descuadre está en cero. Los demás valores del
        # informe son totales, no comprobaciones.
        cuadra = all(
            abs(valor) < 0.5
            for clave, valor in v.items()
            if clave in ("diferencia", "posiciones_negativas",
                         "detalles_descuadrados", "periodos_descuadrados",
                         "costos_descuadrados", "otif_descuadrados",
                         "kpis_descuadrados", "ordenes_descuadradas",
                         "ordenes_sin_solicitud_aprobada")
        )
        print(f"\n  {regla if cuadra else falla}")
        if not cuadra:
            sys.exit(1)

    await engine.dispose()


asyncio.run(principal())
