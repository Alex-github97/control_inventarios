"""
Flota grande y coherente para el CMMS de la empresa de PRUEBA DE CARGA.

    python tools/sembrar_cmms.py --esquema cli_carga --activos 3000 --anios 3

Escribe directo en la base, con COPY, porque por la API serían días: unos
3 000 activos y tres años de operación son millones de filas. A cambio, aquí se
reproducen a mano las reglas que la API haría cumplir, y son las que hacen que
los datos sirvan:

- El odómetro de cada activo es UNA curva que solo sube; todo lo que trae una
  lectura (tanqueos, órdenes, movimientos e inspecciones de llantas, checklists,
  muestras de aceite) la lee de esa misma curva.
- Las llantas se gastan surco por surco y la profundidad nunca sube dentro de una
  vida; al llegar al mínimo se desmontan y van a reencauche (hasta dos veces) o
  se dan de baja. Cada vida guarda su costo y su contador propio de km, que es lo
  que usan los informes de rendimiento (CPK, km, km/mm).
- El inventario de repuestos cuadra: cada salida a una OT sale de una existencia
  que entró antes; las compras se dimensionan con el consumo (+35 %) y el costo
  de la OT es el costo promedio del momento en que salió el repuesto.
- Las preventivas salen de cruzar el umbral del plan con la curva del odómetro;
  las correctivas, de modos de falla con distribución Weibull en km.

SOLO para la empresa de prueba: antes de sembrar VACÍA todas las tablas `eam_*`
del esquema indicado (no las de otros módulos) y rechaza cualquier esquema que
no sea de prueba. Los catálogos de fábrica los vuelve a sembrar el arranque del
backend; lo que falta lo crea este guion.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

import app.main  # noqa: E402,F401 — registra los modelos
from app.core.database import engine  # noqa: E402

ESQUEMAS_PERMITIDOS = {"cli_carga"}
HOY = datetime.now().replace(minute=0, second=0, microsecond=0)

# ─── Composición de la flota ──────────────────────────────────────────────────
# (clase, tipo_activo, proporción, layout de llantas, repuestos, km/día, unidad)
CLASES = [
    dict(clase="TRACTO", tipo="VEHICULO", prop=0.50, layout=[2, 4, 4], rep=1, km=430, medidor="KM",
         marcas=[("Kenworth", ["T800", "T680", "T880", "W900"]), ("Freightliner", ["Cascadia", "Columbia", "M2 106"]),
                 ("International", ["ProStar", "LT"]), ("Volvo", ["VNL", "FH"]), ("Scania", ["R 450", "G 410"])],
         tanque=150, kpg=(6.2, 7.6), costo=(380e6, 620e6), nombre="Tractocamión"),
    dict(clase="CAMION", tipo="VEHICULO", prop=0.235, layout=[2, 4], rep=1, km=190, medidor="KM",
         marcas=[("Hino", ["500", "300"]), ("Chevrolet", ["NPR", "NHR"]), ("Isuzu", ["FTR", "NQR"]),
                 ("Foton", ["Aumark"]), ("JAC", ["1040"]), ("Mercedes-Benz", ["Atego"])],
         tanque=50, kpg=(11.0, 14.5), costo=(140e6, 260e6), nombre="Camión"),
    dict(clase="REMOLQUE", tipo="REMOLQUE", prop=0.165, layout=[4, 4, 4], rep=0, km=410, medidor="KM",
         marcas=[("Randon", ["Furgón", "Planchón"]), ("Fruehauf", ["Tanque"]), ("Bawer", ["Portacontenedor"])],
         tanque=0, kpg=None, costo=(90e6, 160e6), nombre="Remolque"),
    dict(clase="MONTACARGAS", tipo="MONTACARGAS", prop=0.067, layout=[2, 2], rep=0, km=7.0, medidor="HORAS",
         marcas=[("Hyster", ["H2.5FT", "H50FT"]), ("Crown", ["FC 4500"]), ("Linde", ["H25"]),
                 ("Toyota", ["8FGCU25"]), ("Yale", ["GLP050"])],
         tanque=9, kpg=(0.55, 0.75), costo=(95e6, 160e6), nombre="Montacargas"),
    dict(clase="LIVIANO", tipo="VEHICULO", prop=0.033, layout=[2, 2], rep=1, km=120, medidor="KM",
         marcas=[("Toyota", ["Hilux", "Land Cruiser"]), ("Mercedes-Benz", ["Sprinter"])],
         tanque=21, kpg=(28.0, 36.0), costo=(160e6, 280e6), nombre="Camioneta"),
]

SEDES = [  # (centro de costo, ciudad, bodega, peso)
    ("CC-BOG", "Bogotá", "BOG", 0.32), ("CC-MED", "Medellín", "MED", 0.22), ("CC-CAL", "Cali", "CAL", 0.18),
    ("CC-BAQ", "Barranquilla", "BAQ", 0.14), ("CC-BUC", "Bucaramanga", "BOG", 0.08), ("CC-CTG", "Cartagena", "BAQ", 0.06),
]

NOMBRES = ["Andrés", "Carlos", "Jorge", "Luis", "Diego", "Fabián", "Óscar", "Wilson", "Julián", "Camilo", "Edwin",
           "Hernán", "Mauricio", "Ricardo", "Sergio", "Alexander", "Fredy", "John", "Nelson", "Yesid"]
APELLIDOS = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Hernández", "Pérez", "Sánchez", "Ramírez",
             "Torres", "Díaz", "Vargas", "Moreno", "Rojas", "Castro", "Ortiz", "Jiménez", "Suárez", "Muñoz", "Ríos"]


# ─── Repuestos por clase (código, nombre, categoría, unidad, costo base) ─────
def _repuestos_base() -> List[Tuple]:
    pesado = [
        ("FIL-ACE", "Filtro de aceite motor", "FILTROS", "UND", 95_000), ("FIL-COM", "Filtro de combustible", "FILTROS", "UND", 110_000),
        ("FIL-SEP", "Filtro separador de agua", "FILTROS", "UND", 140_000), ("FIL-AIR", "Filtro de aire primario", "FILTROS", "UND", 260_000),
        ("FIL-SEC", "Filtro de aire secundario", "FILTROS", "UND", 150_000), ("ACE-15W40", "Aceite motor 15W40", "LUBRICANTES", "GAL", 68_000),
        ("ACE-TRANS", "Aceite de transmisión 80W90", "LUBRICANTES", "GAL", 72_000), ("REFRIG", "Refrigerante", "LUBRICANTES", "GAL", 38_000),
        ("GRASA", "Grasa multipropósito", "LUBRICANTES", "KG", 24_000), ("PAS-FRN", "Bandas de freno (juego eje)", "FRENOS", "JGO", 620_000),
        ("TAM-FRN", "Campana de freno", "FRENOS", "UND", 780_000), ("CAM-FRN", "Cámara de freno", "FRENOS", "UND", 310_000),
        ("SEC-AIR", "Secador de aire", "FRENOS", "UND", 1_150_000), ("ALT", "Alternador", "ELECTRICO", "UND", 2_400_000),
        ("ARR", "Motor de arranque", "ELECTRICO", "UND", 2_100_000), ("BAT", "Batería 4D", "ELECTRICO", "UND", 980_000),
        ("SEN-TEM", "Sensor de temperatura", "ELECTRICO", "UND", 260_000), ("EMB", "Kit de embrague", "TRANSMISION", "KIT", 6_800_000),
        ("CRU", "Cruceta cardán", "TRANSMISION", "UND", 340_000), ("AMO", "Amortiguador", "SUSPENSION", "UND", 520_000),
        ("BOL-AIR", "Bolsa de aire suspensión", "SUSPENSION", "UND", 690_000), ("BUJ", "Bujes de muelle (juego)", "SUSPENSION", "JGO", 280_000),
        ("ROD", "Rodamiento de rueda", "RODAMIENTOS", "UND", 420_000), ("RET", "Retenedor de rueda", "RODAMIENTOS", "UND", 95_000),
        ("COR", "Correa de accesorios", "MOTOR", "UND", 190_000), ("MAN-RAD", "Manguera de radiador", "MOTOR", "UND", 160_000),
        ("BOM-AGU", "Bomba de agua", "MOTOR", "UND", 1_350_000), ("TER", "Termostato", "MOTOR", "UND", 210_000),
        ("INY", "Inyector", "MOTOR", "UND", 2_900_000), ("TURBO", "Turbo cargador (remanufacturado)", "MOTOR", "UND", 7_500_000),
        ("BOMB", "Bombillo de cola", "ELECTRICO", "UND", 28_000), ("ESP", "Espejo lateral", "CARROCERIA", "UND", 380_000),
    ]
    clases = {"P": ("pesado", 1.0), "M": ("mediano", 0.55), "L": ("liviano", 0.35)}
    filas = []
    for pref, (nombre_clase, factor) in clases.items():
        for cod, nom, cat, und, costo in pesado:
            if pref == "L" and cod in ("SEC-AIR", "CAM-FRN", "BOL-AIR", "TURBO", "CRU"):
                continue
            if pref == "M" and cod in ("BOL-AIR",):
                continue
            filas.append((f"{pref}-{cod}", f"{nom} ({nombre_clase})", cat, und,
                          costo if und in ("GAL", "KG") else round(costo * factor, -3)))
    montacargas = [
        ("MC-FIL-ACE", "Filtro de aceite (montacargas)", "FILTROS", "UND", 65_000),
        ("MC-FIL-AIR", "Filtro de aire (montacargas)", "FILTROS", "UND", 90_000),
        ("MC-FIL-HID", "Filtro hidráulico", "FILTROS", "UND", 120_000),
        ("MC-ACE-HID", "Aceite hidráulico ISO 68", "LUBRICANTES", "GAL", 61_000),
        ("MC-ACE-MOT", "Aceite motor 10W30", "LUBRICANTES", "GAL", 64_000),
        ("MC-CAD", "Cadena de mástil", "HIDRAULICO", "UND", 1_450_000),
        ("MC-SEL", "Kit de sellos cilindro", "HIDRAULICO", "KIT", 420_000),
        ("MC-BAT", "Batería montacargas", "ELECTRICO", "UND", 760_000),
        ("MC-REG", "Regulador GLP", "COMBUSTIBLE", "UND", 980_000),
        ("MC-FRN", "Bandas de freno montacargas", "FRENOS", "JGO", 310_000),
    ]
    return filas + montacargas


# Modos de falla por clase: (código falla, descripción, β, η en km u horas, repuestos [(sufijo, cant)], horas MO)
MODOS = {
    "TRACTO": [("FRN", "Desgaste de frenos", 2.4, 110_000, [("PAS-FRN", 2), ("TAM-FRN", 1)], 5),
               ("ALT", "Falla de alternador", 3.0, 260_000, [("ALT", 1)], 3),
               ("ARR", "Falla del motor de arranque", 2.6, 320_000, [("ARR", 1)], 3),
               ("SUS", "Falla de suspensión", 2.0, 180_000, [("BOL-AIR", 2), ("AMO", 2)], 4),
               ("REF", "Fuga en sistema de refrigeración", 1.6, 210_000, [("MAN-RAD", 2), ("REFRIG", 4), ("TER", 1)], 3),
               ("ELE", "Falla eléctrica", 0.9, 160_000, [("SEN-TEM", 1), ("BOMB", 2)], 2),
               ("EMB", "Desgaste de embrague", 3.2, 420_000, [("EMB", 1)], 9),
               ("ROD", "Falla de rodamiento de rueda", 2.2, 300_000, [("ROD", 2), ("RET", 2)], 4),
               ("INY", "Falla de inyector", 1.8, 380_000, [("INY", 2)], 6)],
    "CAMION": [("FRN", "Desgaste de frenos", 2.3, 70_000, [("PAS-FRN", 2)], 4),
               ("ALT", "Falla de alternador", 3.0, 190_000, [("ALT", 1)], 3),
               ("SUS", "Falla de suspensión", 2.0, 140_000, [("AMO", 2), ("BUJ", 1)], 4),
               ("REF", "Fuga en sistema de refrigeración", 1.6, 160_000, [("MAN-RAD", 2), ("REFRIG", 2)], 3),
               ("ELE", "Falla eléctrica", 0.9, 120_000, [("SEN-TEM", 1), ("BOMB", 2)], 2),
               ("EMB", "Desgaste de embrague", 3.2, 260_000, [("EMB", 1)], 7)],
    "REMOLQUE": [("FRN", "Desgaste de frenos", 2.4, 150_000, [("PAS-FRN", 3), ("TAM-FRN", 1)], 5),
                 ("ROD", "Falla de rodamiento de rueda", 2.2, 260_000, [("ROD", 2), ("RET", 2)], 4),
                 ("SUS", "Falla de suspensión", 2.0, 240_000, [("BUJ", 2)], 4),
                 ("ELE", "Falla eléctrica (luces)", 0.9, 90_000, [("BOMB", 4)], 1)],
    "MONTACARGAS": [("HID", "Fuga hidráulica", 1.7, 2_600, [("MC-SEL", 1), ("MC-ACE-HID", 3)], 4),
                    ("CAD", "Desgaste de cadena de mástil", 2.8, 7_000, [("MC-CAD", 1)], 5),
                    ("ELE", "Falla eléctrica", 0.9, 3_000, [("MC-BAT", 1)], 2),
                    ("GLP", "Falla del regulador de GLP", 2.0, 5_500, [("MC-REG", 1)], 3),
                    ("FRN", "Desgaste de frenos", 2.2, 4_000, [("MC-FRN", 1)], 3)],
    "LIVIANO": [("FRN", "Desgaste de frenos", 2.3, 60_000, [("PAS-FRN", 2)], 3),
                ("SUS", "Falla de suspensión", 2.0, 120_000, [("AMO", 2)], 3),
                ("ELE", "Falla eléctrica", 0.9, 110_000, [("SEN-TEM", 1), ("BOMB", 2)], 2),
                ("ALT", "Falla de alternador", 3.0, 200_000, [("ALT", 1)], 2)],
}
PREFIJO_CLASE = {"TRACTO": "P", "CAMION": "M", "REMOLQUE": "P", "LIVIANO": "L", "MONTACARGAS": ""}

# Planes preventivos por clase: (nivel, frecuencia, unidad, repuestos [(sufijo, cant)], horas MO, cambia aceite)
PLANES = {
    "TRACTO": [("A", 15_000, "KM", [("FIL-ACE", 1), ("FIL-COM", 1), ("FIL-SEP", 1), ("ACE-15W40", 11), ("GRASA", 2)], 3, True),
               ("B", 45_000, "KM", [("FIL-ACE", 1), ("FIL-COM", 1), ("FIL-SEP", 1), ("FIL-AIR", 1), ("ACE-15W40", 11), ("COR", 1), ("GRASA", 2)], 6, True),
               ("C", 90_000, "KM", [("FIL-ACE", 1), ("FIL-COM", 1), ("FIL-SEP", 1), ("FIL-AIR", 1), ("FIL-SEC", 1), ("ACE-15W40", 11),
                                    ("ACE-TRANS", 6), ("REFRIG", 6), ("COR", 1), ("GRASA", 3)], 10, True)],
    "CAMION": [("A", 10_000, "KM", [("FIL-ACE", 1), ("FIL-COM", 1), ("ACE-15W40", 4), ("GRASA", 1)], 2, True),
               ("B", 30_000, "KM", [("FIL-ACE", 1), ("FIL-COM", 1), ("FIL-AIR", 1), ("ACE-15W40", 4), ("ACE-TRANS", 3), ("GRASA", 1)], 4, True)],
    "REMOLQUE": [("A", 30_000, "KM", [("GRASA", 3), ("RET", 2)], 3, False),
                 ("B", 90_000, "KM", [("GRASA", 4), ("ROD", 2), ("RET", 4), ("PAS-FRN", 3)], 7, False)],
    "MONTACARGAS": [("A", 250, "HORAS", [("MC-FIL-ACE", 1), ("MC-FIL-AIR", 1), ("MC-ACE-MOT", 1)], 2, True),
                    ("B", 1_000, "HORAS", [("MC-FIL-ACE", 1), ("MC-FIL-AIR", 1), ("MC-FIL-HID", 1), ("MC-ACE-MOT", 1), ("MC-ACE-HID", 5)], 4, True)],
    "LIVIANO": [("A", 10_000, "KM", [("FIL-ACE", 1), ("FIL-AIR", 1), ("ACE-15W40", 2)], 2, True)],
}

# Llantas por clase: (medida, profundidad de diseño, costo nueva, desgaste mm/1000 km dirección, tracción/libre)
LLANTA_CLASE = {
    "TRACTO": ("295/80R22.5", 2_050_000, 0.17, 0.21), "CAMION": ("215/75R17.5", 980_000, 0.20, 0.24),
    "REMOLQUE": ("11R22.5", 1_750_000, 0.13, 0.13), "MONTACARGAS": ("28x9-15", 640_000, 0.0035, 0.0035),
    "LIVIANO": ("265/70R16", 520_000, 0.18, 0.18),
}
MARCAS_LLANTA = {
    "Michelin": ["X Multi Z", "X Multi D", "X Multi T"], "Bridgestone": ["R268", "M729", "R197"],
    "Goodyear": ["G686", "G622", "KMAX D"], "Continental": ["HSR2", "HDR2", "HTR2"],
    "Hankook": ["AL10", "DL10", "TL10"], "Double Coin": ["RR202", "RLB490", "RT500"],
}
PROF_MIN = 3.0          # mm: a este labrado se retira la llanta
MAX_REENCAUCHES = 2


@dataclass
class Activo:
    id: int
    clase: str
    tipo: str
    codigo: str
    marca: str
    linea: str
    anio: int
    sede: Tuple
    medidor: str
    lectura: np.ndarray            # lectura al FIN de cada día (km u horas), solo sube
    layout: List[int]
    rep: int
    kpg: Optional[float]
    tanque: float
    posiciones: List[Tuple[str, str]] = field(default_factory=list)   # (código, tipo de uso)


class Sembrador:
    def __init__(self, esquema: str, n_activos: int, anios: int, semilla: int):
        self.esq, self.n, self.anios = esquema, n_activos, anios
        self.rng = np.random.default_rng(semilla)
        self.inicio = (HOY - timedelta(days=int(365 * anios))).replace(hour=0)
        self.dias = (HOY - self.inicio).days
        self.ids: Dict[str, int] = defaultdict(int)
        self.pg = None
        self.columnas: Dict[str, List[str]] = {}
        self.cuenta: Dict[str, int] = defaultdict(int)

    # ── utilidades ────────────────────────────────────────────────────────────
    def nid(self, tabla: str) -> int:
        self.ids[tabla] += 1
        return self.ids[tabla]

    def dia(self, d: int, hora: float = 8.0) -> datetime:
        return self.inicio + timedelta(days=int(d), hours=float(hora))

    def persona(self) -> str:
        r = self.rng
        return f"{NOMBRES[r.integers(len(NOMBRES))]} {APELLIDOS[r.integers(len(APELLIDOS))]}"

    async def copiar(self, tabla: str, filas: List[dict]) -> None:
        """COPY con las columnas de la primera fila; rellena created_at/updated_at."""
        if not filas:
            return
        # Unión de las columnas de TODAS las filas: una vida que se cerró trae
        # fecha_fin y una abierta no; tomar solo la primera fila las perdería.
        cols = list(dict.fromkeys(k for f in filas for k in f))
        tiene = self.columnas[tabla]
        if "created_at" in tiene and "created_at" not in cols:
            cols += ["created_at", "updated_at"]
            ahora = HOY
            for f in filas:
                marca = f.get("_fecha") or ahora
                f["created_at"] = f["updated_at"] = marca
        cols = [c for c in cols if not c.startswith("_")]
        registros = [tuple(f.get(c) for c in cols) for f in filas]
        await self.pg.copy_records_to_table(tabla, records=registros, columns=cols, schema_name=self.esq)
        self.cuenta[tabla] += len(registros)

    async def sql(self, consulta: str, *args):
        return await self.pg.fetch(consulta, *args)

    # ── 0. preparación ────────────────────────────────────────────────────────
    async def preparar(self) -> None:
        filas = await self.sql(
            "SELECT c.relname, array_agg(a.attname::text ORDER BY a.attnum) FROM pg_class c "
            "JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid "
            "AND a.attnum > 0 AND NOT a.attisdropped WHERE n.nspname = $1 AND c.relkind = 'r' "
            "AND c.relname LIKE 'eam%' GROUP BY c.relname", self.esq)
        self.columnas = {r[0]: list(r[1]) for r in filas}
        # Los catálogos de fábrica se conservan; lo operativo se vacía. Se
        # guarda el máximo id de cada catálogo para seguir numerando.
        for t in self.columnas:
            m = (await self.sql(f'SELECT coalesce(max(id), 0) FROM "{self.esq}"."{t}"'))[0][0]
            self.ids[t] = m

    async def vaciar_operacion(self) -> None:
        """Vacía todo lo que este guion siembra; deja lo que siembra el arranque."""
        conservar = {"eam_tipo_activo", "eam_esquema_vehiculo", "eam_marca_activo", "eam_linea_activo",
                     "eam_motor_activo", "eam_tipo_trabajo", "eam_falla_catalogo", "eam_actividad",
                     "eam_causa_catalogo", "eam_solucion_catalogo", "eam_tipo_combustible",
                     "eam_lube_parametro", "eam_lube_tipo_compartimento", "eam_lube_limite",
                     "eam_lube_metodo_muestreo", "eam_lube_motivo_drenaje", "eam_lube_modo_falla",
                     "eam_lube_ajuste_norma", "eam_parametro"}
        vaciar = [t for t in self.columnas if t not in conservar]
        lista = ", ".join(f'"{self.esq}"."{t}"' for t in vaciar)
        await self.pg.execute(f"TRUNCATE {lista} RESTART IDENTITY CASCADE")
        for t in vaciar:
            self.ids[t] = 0
        # Repuestos de fábrica: se dejan y se suman los del guion.

    # ── 1. catálogos que el arranque no siembra ───────────────────────────────
    async def catalogos(self) -> None:
        r = self.rng
        self.cc = {}
        filas = []
        for cc, ciudad, _, _ in SEDES:
            i = self.nid("eam_centro_costo")
            self.cc[cc] = i
            filas.append(dict(id=i, codigo=cc, nombre=f"Operación {ciudad}", ciudad=ciudad, plataforma=ciudad, activo=True))
        await self.copiar("eam_centro_costo", filas)

        self.bodegas = {}
        filas = []
        for cod, nombre in (("BOG", "Bogotá"), ("MED", "Medellín"), ("CAL", "Cali"), ("BAQ", "Barranquilla")):
            i = self.nid("eam_inv_bodega")
            self.bodegas[cod] = i
            filas.append(dict(id=i, codigo=f"BOD-{cod}", nombre=f"Almacén de repuestos {nombre}", direccion=f"Centro logístico {nombre}",
                              responsable=self.persona(), por_defecto=cod == "BOG", activo=True))
        await self.copiar("eam_inv_bodega", filas)

        self.motivo_compra = self.nid("eam_inv_motivo")
        self.motivo_ot = self.nid("eam_inv_motivo")
        await self.copiar("eam_inv_motivo", [
            dict(id=self.motivo_compra, codigo="COMPRA", nombre="Compra a proveedor", sentido="ENTRADA", activo=True),
            dict(id=self.motivo_ot, codigo="CONSUMO_OT", nombre="Consumo en orden de trabajo", sentido="SALIDA", activo=True)])

        self.contratistas = []
        filas = []
        for nombre, esp in (("Taller Diesel Andino", "Motor"), ("Frenos y Suspensiones del Norte", "Frenos"),
                            ("Electro Autos Pesados", "Eléctrico"), ("Lubricentro La 80", "Lubricación"),
                            ("Hidráulicos Industriales", "Hidráulico"), ("Servitécnica Montacargas", "Montacargas"),
                            ("Rectificadora Central", "Motor"), ("Alineación y Balanceo Express", "Llantas")):
            i = self.nid("eam_contratista")
            self.contratistas.append(i)
            filas.append(dict(id=i, nombre=nombre, nit=f"900{r.integers(100000, 999999)}-{r.integers(1, 9)}", tipo="TALLER",
                              especialidad=esp, contacto=self.persona(), telefono=f"60{r.integers(10000000, 99999999)}",
                              ciudad=SEDES[r.integers(len(SEDES))][1], calificacion=round(float(r.uniform(3.4, 4.9)), 1), activo=True))
        await self.copiar("eam_contratista", filas)

        # Repuestos: los de fábrica se conservan; se suman los del guion.
        existentes = {row[0] for row in await self.sql(f'SELECT codigo FROM "{self.esq}".eam_repuesto')}
        self.repuestos: Dict[str, Tuple[int, float, str]] = {}
        filas = []
        for cod, nom, cat, und, costo in _repuestos_base():
            if cod in existentes:
                continue
            i = self.nid("eam_repuesto")
            self.repuestos[cod] = (i, float(costo), und)
            filas.append(dict(id=i, codigo=cod, nombre=nom, categoria=cat, unidad_medida=und, costo_unitario=float(costo),
                              stock_minimo=4, stock_actual=0, proveedor_ppal="Distribuidora de Repuestos Pesados SAS", activo=True))
        await self.copiar("eam_repuesto", filas)

        # Fallas, causas y soluciones por modo.
        # Se conservan entre corridas: se reutilizan las que ya existen.
        ya = {row[0]: row[1] for row in await self.sql(f'SELECT codigo, id FROM "{self.esq}".eam_falla_catalogo WHERE codigo LIKE \'F-%\'')}
        self.fallas = {c[2:]: i for c, i in ya.items()}
        filas = []
        for clase, modos in MODOS.items():
            for cod, desc, *_ in modos:
                if cod in self.fallas:
                    continue
                i = self.nid("eam_falla_catalogo")
                self.fallas[cod] = i
                filas.append(dict(id=i, codigo=f"F-{cod}", descripcion=desc, activo=True))
        await self.copiar("eam_falla_catalogo", filas)
        self.causas = [row[0] for row in await self.sql(f'SELECT id FROM "{self.esq}".eam_causa_catalogo')]
        self.soluciones = [row[0] for row in await self.sql(f'SELECT id FROM "{self.esq}".eam_solucion_catalogo')]
        tipos = {row[1]: row[0] for row in await self.sql(f'SELECT id, nombre FROM "{self.esq}".eam_tipo_trabajo')}
        self.tt_prev = next((v for k, v in tipos.items() if "revent" in k.lower()), next(iter(tipos.values())))
        self.tt_corr = next((v for k, v in tipos.items() if "orrect" in k.lower()), next(iter(tipos.values())))

        # Modelos por línea (el arranque siembra marcas y líneas, no modelos).
        lineas = await self.sql(f'SELECT l.id, l.nombre, m.nombre FROM "{self.esq}".eam_linea_activo l '
                                f'JOIN "{self.esq}".eam_marca_activo m ON m.id = l.marca_id')
        self.lineas = {(m, l): i for i, l, m in lineas}
        filas = []
        for (marca, linea), lid in self.lineas.items():
            i = self.nid("eam_modelo_activo")
            filas.append(dict(id=i, linea_id=lid, nombre=f"{linea} 2016-2026", anio_desde=2016, anio_hasta=2026, activo=True))
        await self.copiar("eam_modelo_activo", filas)

        # Esquema de llantas que corresponde a cada layout.
        esquemas = await self.sql(f'SELECT id, layout::text, coalesce(tiene_repuesto, false) FROM "{self.esq}".eam_esquema_vehiculo')
        self.esquema_de = {}
        for eid, lay, _ in esquemas:
            self.esquema_de.setdefault(lay.replace(" ", ""), eid)

        # Metas de rendimiento por marca y línea.
        filas = []
        self.metas = {}
        for c in CLASES:
            if not c["kpg"]:
                continue
            for marca, lineas_ in c["marcas"]:
                for linea in lineas_:
                    meta = round(float(r.uniform(*c["kpg"])), 2)
                    self.metas[(marca, linea)] = meta
                    i = self.nid("eam_meta_rendimiento")
                    filas.append(dict(id=i, tipo_activo=c["tipo"], marca=marca, linea=linea, meta_km_gal=meta,
                                      tolerancia_pct=8.0, tipo_combustible="GLP" if c["clase"] == "MONTACARGAS" else "ACPM",
                                      nota=f"{c['nombre']} — meta de la flota", activo=True))
        await self.copiar("eam_meta_rendimiento", filas)

        await self.catalogos_llantas()
        await self.catalogos_checklist()
        await self.catalogos_lubricacion()

    async def catalogos_llantas(self) -> None:
        r = self.rng
        filas_m, filas_r, filas_d = [], [], []
        self.refs_llanta = []   # (marca, referencia, tipo_uso)
        for marca, refs in MARCAS_LLANTA.items():
            mid = self.nid("eam_marca_neumatico")
            filas_m.append(dict(id=mid, nombre=marca, ambito="LLANTA", activo=True))
            for ref, uso in zip(refs, ("DIRECCIONAL", "TRACCION", "LIBRE")):
                filas_r.append(dict(id=self.nid("eam_referencia_neumatico"), marca_id=mid, nombre=ref, ambito="LLANTA",
                                    tipo_uso=uso, activo=True))
                self.refs_llanta.append((marca, ref, uso))
        for med, *_ in LLANTA_CLASE.values():
            filas_d.append(dict(id=self.nid("eam_dimension_neumatico"), nombre=med, ambito="LLANTA", activo=True))
        await self.copiar("eam_marca_neumatico", filas_m)
        await self.copiar("eam_referencia_neumatico", filas_r)
        await self.copiar("eam_dimension_neumatico", filas_d)

        self.motivo_fin = {}
        filas = []
        for clave, nombre, descarte in (("DESGASTE", "Desgaste normal (fin de vida útil)", False),
                                        ("CORTE", "Corte o impacto irreparable", True),
                                        ("RECHAZO", "Carcasa rechazada en reencauche", True),
                                        ("SEPARACION", "Separación de banda", True)):
            i = self.nid("eam_motivo_fin_vida")
            self.motivo_fin[clave] = i
            filas.append(dict(id=i, nombre=nombre, aplica_descarte=descarte, aplica_fin_vida=True, activo=True))
        await self.copiar("eam_motivo_fin_vida", filas)

        self.bandas = []
        filas = []
        for marca, ref, prof, costo in (("Vipal", "VT110", 17.0, 640_000), ("Bandag", "BDR-HT", 19.0, 720_000),
                                        ("Vipal", "VZY", 16.0, 590_000), ("Bandag", "FM", 15.0, 560_000)):
            i = self.nid("eam_banda_reencauche")
            self.bandas.append((i, f"{marca} {ref}", prof, costo))
            filas.append(dict(id=i, marca=marca, referencia=ref, dimension="295/80R22.5", profundidad_original=prof,
                              profundidad_minima=PROF_MIN, tipo_posicion="TRACCION", reesculturable=False,
                              costo_defecto=float(costo), presion_minima=100, presion_maxima=120, activo=True))
        await self.copiar("eam_banda_reencauche", filas)

        self.zonas = {}
        filas = []
        for cc, ciudad, _, _ in SEDES:
            i = self.nid("eam_zona_neumatico")
            self.zonas[cc] = i
            filas.append(dict(id=i, codigo=cc.replace("CC-", "Z-"), nombre=f"Zona {ciudad}", activo=True))
        await self.copiar("eam_zona_neumatico", filas)

        self.bodega_llantas = {}
        filas = []
        for cod, nombre in (("BOG", "Bogotá"), ("MED", "Medellín"), ("CAL", "Cali"), ("BAQ", "Barranquilla")):
            i = self.nid("eam_bodega_neumatico")
            self.bodega_llantas[cod] = i
            filas.append(dict(id=i, codigo=f"BLL-{cod}", nombre=f"Bodega de llantas {nombre}", ubicacion=nombre,
                              capacidad=1500, activo=True))
        await self.copiar("eam_bodega_neumatico", filas)
        await self.copiar("eam_neumatico_config", [dict(
            id=self.nid("eam_neumatico_config"), montaje_estricto=False, profundidad_minima=PROF_MIN,
            presion_min=95, presion_max=125, umbral_desalineacion=3.0, tolerancia_profundidad=1.0)])

    async def catalogos_checklist(self) -> None:
        sis = {}
        filas = []
        for orden, nombre in enumerate(("Motor", "Frenos", "Llantas", "Luces y eléctrico", "Seguridad", "Hidráulico", "Cabina"), start=1):
            i = self.nid("eam_chk_sistema")
            sis[nombre] = i
            filas.append(dict(id=i, codigo=f"SIS-{orden:02d}", nombre=nombre, orden=orden, activo=True))
        await self.copiar("eam_chk_sistema", filas)
        cla = self.nid("eam_chk_clasificacion")
        await self.copiar("eam_chk_clasificacion", [dict(id=cla, nombre="Cumple / No cumple", tipo="OPCIONES", activo=True)])
        self.op_si, self.op_no = self.nid("eam_chk_opcion"), self.nid("eam_chk_opcion")
        await self.copiar("eam_chk_opcion", [
            dict(id=self.op_si, clasificacion_id=cla, nombre="Cumple", orden=1, conforme=True, puntaje=1.0, color="#059669", activo=True),
            dict(id=self.op_no, clasificacion_id=cla, nombre="No cumple", orden=2, conforme=False, puntaje=0.0, color="#DC2626", activo=True)])
        cat = self.nid("eam_chk_categoria")
        await self.copiar("eam_chk_categoria", [dict(id=cat, codigo="PREOP", nombre="Inspección preoperacional", activo=True)])
        preguntas = {
            "VEHICULO": [("Motor", "Nivel de aceite de motor correcto", True), ("Motor", "Nivel de refrigerante correcto", True),
                         ("Motor", "Sin fugas visibles bajo el vehículo", True), ("Frenos", "Freno de servicio responde", True),
                         ("Frenos", "Freno de parqueo sostiene", True), ("Frenos", "Presión de aire en rango", True),
                         ("Llantas", "Llantas sin cortes ni protuberancias", True), ("Llantas", "Presión de llantas visualmente correcta", False),
                         ("Luces y eléctrico", "Luces delanteras y de freno funcionan", True), ("Luces y eléctrico", "Direccionales y estacionarias", False),
                         ("Seguridad", "Extintor vigente y cargado", True), ("Seguridad", "Botiquín y kit de carretera", False),
                         ("Cabina", "Cinturón de seguridad en buen estado", True), ("Cabina", "Pito y alarma de reversa", False)],
            "MONTACARGAS": [("Motor", "Nivel de aceite de motor", True), ("Hidráulico", "Nivel de aceite hidráulico", True),
                            ("Hidráulico", "Sin fugas en cilindros y mangueras", True), ("Hidráulico", "Cadenas del mástil lubricadas", False),
                            ("Frenos", "Freno de servicio y parqueo", True), ("Llantas", "Llantas sin desprendimientos", True),
                            ("Seguridad", "Cinturón y protector de techo", True), ("Seguridad", "Pito y luz de advertencia", True),
                            ("Seguridad", "Conexión de GLP sin olor a gas", True), ("Cabina", "Horquillas sin fisuras", True)],
        }
        self.plantillas = {}
        fp, fq, fpp = [], [], []
        for tipo, lista in preguntas.items():
            pid = self.nid("eam_chk_plantilla")
            fp.append(dict(id=pid, codigo=f"PRE-{tipo[:4]}", nombre=f"Preoperacional {'vehículos' if tipo == 'VEHICULO' else 'montacargas'}",
                           categoria_id=cat, descripcion="Inspección antes de iniciar la jornada.", version=1, periodicidad_dias=14,
                           requiere_firma=True, umbral_aprobacion=85.0, critico_reprueba=True, genera_ot=True, pide_medidor=True, activo=True))
            ids = []
            for orden, (s, texto, critico) in enumerate(lista, start=1):
                qid = self.nid("eam_chk_pregunta")
                fq.append(dict(id=qid, sistema_id=sis[s], clasificacion_id=cla, texto=texto, orden=orden, critico=critico,
                               requiere_foto=False, exige_observacion_no_conforme=True, peso=2.0 if critico else 1.0, activo=True))
                fpp.append(dict(id=self.nid("eam_chk_plantilla_pregunta"), plantilla_id=pid, pregunta_id=qid, orden=orden,
                                obligatorio=True, activo=True))
                ids.append((qid, critico, 2.0 if critico else 1.0))
            self.plantillas[tipo] = (pid, ids)
        await self.copiar("eam_chk_plantilla", fp)
        await self.copiar("eam_chk_pregunta", fq)
        await self.copiar("eam_chk_plantilla_pregunta", fpp)

    def _extra(self, tabla: str, **valores) -> dict:
        """Solo las columnas que existen en la tabla (varían entre versiones)."""
        return {k: v for k, v in valores.items() if k in self.columnas.get(tabla, [])}

    async def catalogos_lubricacion(self) -> None:
        marca = self.nid("eam_lube_marca")
        await self.copiar("eam_lube_marca", [dict(id=marca, nombre="Mobil", activo=True)])
        self.prod_motor = self.nid("eam_lube_producto")
        await self.copiar("eam_lube_producto", [dict(id=self.prod_motor, marca_id=marca, nombre="Delvac MX 15W-40", familia="MOTOR",
                                                     grado_sae="15W-40", base="MINERAL", activo=True)])
        self.lab = self.nid("eam_lube_laboratorio")
        await self.copiar("eam_lube_laboratorio", [dict(id=self.lab, nombre="Laboratorio de Análisis de Aceites SAS",
                                                        contacto=self.persona(), dias_respuesta=4, activo=True)])
        self.tipo_motor = (await self.sql(f"SELECT id FROM \"{self.esq}\".eam_lube_tipo_compartimento WHERE codigo='MOT'"))[0][0]
        self.motivo_drenaje = (await self.sql(f'SELECT min(id) FROM "{self.esq}".eam_lube_motivo_drenaje'))[0][0]
        self.metodo = (await self.sql(f'SELECT min(id) FROM "{self.esq}".eam_lube_metodo_muestreo'))[0][0]
        # Límites del motor: se generan valores dentro y, a veces, fuera de ellos.
        lim = await self.sql(
            f'SELECT p.id, p.codigo, l.tipo, l.marginal_min, l.marginal_max, l.critico_min, l.critico_max '
            f'FROM "{self.esq}".eam_lube_limite l JOIN "{self.esq}".eam_lube_parametro p ON p.id = l.parametro_id '
            f"WHERE (l.tipo_compartimento_id = $1 OR l.tipo_compartimento_id IS NULL) AND l.activo AND NOT p.es_texto "
            f"AND l.tipo = 'ABSOLUTO'",
            self.tipo_motor)
        self.limites = [tuple(x) for x in lim]

    # ── 2. activos y su curva de lectura ──────────────────────────────────────
    def crear_activos(self) -> List[Activo]:
        r = self.rng
        activos: List[Activo] = []
        pesos = np.array([s[3] for s in SEDES])
        conteo = {c["clase"]: int(round(self.n * c["prop"])) for c in CLASES}
        conteo["TRACTO"] += self.n - sum(conteo.values())
        dias = np.arange(self.dias)
        semana = (np.array([(self.inicio + timedelta(days=int(d))).weekday() for d in dias]))
        factor_dia = np.where(semana == 6, 0.25, np.where(semana == 5, 0.7, 1.0))
        consecutivo = defaultdict(int)
        for c in CLASES:
            for _ in range(conteo[c["clase"]]):
                marca, lineas = c["marcas"][r.integers(len(c["marcas"]))]
                linea = lineas[r.integers(len(lineas))]
                # Todos existen desde el inicio de la historia: un activo comprado
                # después tendría lecturas anteriores a su compra.
                anio = int(r.integers(2013, self.inicio.year + 1))
                edad = max(0.3, (self.inicio.year - anio) + float(r.uniform(0, 1)))
                base = c["km"] * float(r.uniform(0.75, 1.25))
                if c["medidor"] == "KM":
                    l0 = edad * base * 300 * float(r.uniform(0.8, 1.1))
                else:
                    l0 = edad * base * 290
                # Días con taller o sin despacho: el 4 % no se mueve.
                quieto = r.random(self.dias) < 0.04
                diario = base * factor_dia * r.lognormal(0, 0.18, self.dias) * ~quieto
                lectura = l0 + np.cumsum(diario)
                consecutivo[c["clase"]] += 1
                sede = SEDES[r.choice(len(SEDES), p=pesos / pesos.sum())]
                aid = self.nid("eam_activo")
                pref = {"TRACTO": "TC", "CAMION": "CM", "REMOLQUE": "RM", "MONTACARGAS": "MC", "LIVIANO": "CL"}[c["clase"]]
                a = Activo(id=aid, clase=c["clase"], tipo=c["tipo"], codigo=f"{pref}-{consecutivo[c['clase']]:04d}", marca=marca,
                           linea=linea, anio=anio, sede=sede, medidor=c["medidor"], lectura=lectura, layout=c["layout"], rep=c["rep"],
                           kpg=self.metas.get((marca, linea)), tanque=c["tanque"])
                a.posiciones = self._posiciones(a)
                a.costo = float(r.uniform(*c["costo"]))
                a.nombre = f"{c['nombre']} {marca} {linea}"
                activos.append(a)
        return activos

    def _posiciones(self, a: Activo) -> List[Tuple[str, str]]:
        pos = []
        for eje, cantidad in enumerate(a.layout, start=1):
            uso = "DIRECCIONAL" if eje == 1 and a.clase != "REMOLQUE" else ("TRACCION" if a.clase in ("TRACTO", "CAMION") else "LIBRE")
            if cantidad == 2:
                pos += [(f"E{eje}-IZQ", uso), (f"E{eje}-DER", uso)]
            else:
                pos += [(f"E{eje}-IZQ-EXT", uso), (f"E{eje}-IZQ-INT", uso), (f"E{eje}-DER-INT", uso), (f"E{eje}-DER-EXT", uso)]
        for k in range(a.rep):
            pos.append(("REPUESTO" if k == 0 else f"REPUESTO{k + 1}", "LIBRE"))
        return pos

    def lectura_en(self, a: Activo, d: int, frac: float = 0.5) -> float:
        """Lectura del medidor en el día d (antes del cierre del día)."""
        d = max(0, min(self.dias - 1, int(d)))
        antes = a.lectura[d - 1] if d > 0 else a.lectura[0] - (a.lectura[1] - a.lectura[0])
        return round(float(antes + (a.lectura[d] - antes) * frac), 1)

    def lect(self, a: Activo, fecha: datetime) -> float:
        """Lectura a la hora exacta del evento: así dos registros del mismo día
        quedan en el orden de la hora y ninguno «retrocede» el medidor."""
        d = (fecha - self.inicio).days
        frac = (fecha - self.dia(d, 0)).total_seconds() / 86400
        return self.lectura_en(a, d, frac)

    def dia_de_lectura(self, a: Activo, valor: float) -> int:
        return int(np.searchsorted(a.lectura, valor))

    async def escribir_activos(self, activos: List[Activo]) -> None:
        r = self.rng
        filas, esq, docs, gar = [], [], [], []
        for a in activos:
            lay = json.dumps(a.layout)
            final = float(a.lectura[-1])
            filas.append(dict(
                id=a.id, codigo=a.codigo, nombre=a.nombre, tipo_activo=a.tipo, estado="OPERATIVO",
                criticidad="ALTA" if a.clase == "TRACTO" else "MEDIA", marca=a.marca, linea=a.linea, modelo=f"{a.linea} {a.anio}",
                anio=a.anio, numero_serie=f"SN{a.id:07d}", numero_motor=f"MT{r.integers(10**8, 10**9)}" if a.clase != "REMOLQUE" else None,
                numero_chasis=f"9BM{r.integers(10**12, 10**13)}", placa=self._placa(a), color=["Blanco", "Rojo", "Azul", "Gris"][r.integers(4)],
                centro_costo=a.sede[0], ubicacion=a.sede[1], sede=a.sede[1], area="Operación de transporte",
                responsable=self.persona(),
                fecha_adquisicion=min(date(a.anio, int(r.integers(1, 13)), int(r.integers(1, 28))), self.inicio.date() - timedelta(days=20)),
                costo_adquisicion=round(a.costo, -3), vida_util_anios=10, vida_util_km=1_200_000 if a.medidor == "KM" else None,
                odometro_actual=round(final, 1) if a.medidor == "KM" else None,
                horometro_actual=round(final, 1) if a.medidor == "HORAS" else None,
                tipo_combustible=("GLP" if a.clase == "MONTACARGAS" else "ACPM") if a.tanque else None,
                capacidad_combustible=float(a.tanque) if a.tanque else None, numero_ejes=len(a.layout), layout_llantas=lay,
                tiene_repuesto=a.rep > 0, cantidad_repuestos=a.rep, activo=True, _fecha=self.inicio))
            eid = self.esquema_de.get(lay.replace(" ", ""))
            if eid:
                esq.append(dict(id=self.nid("eam_esquema_asignacion"), activo_id=a.id, esquema_id=eid,
                                fecha_vigencia=self.inicio.date(), _fecha=self.inicio))
            if a.clase != "MONTACARGAS":
                for anio_doc in range(self.inicio.year, HOY.year + 1):
                    for tipo, nombre in (("SOAT", "SOAT"), ("RTM", "Revisión técnico-mecánica"), ("POLIZA", "Póliza todo riesgo")):
                        if a.clase == "REMOLQUE" and tipo == "SOAT":
                            continue
                        exp = date(anio_doc, int(r.integers(1, 13)), int(r.integers(1, 28)))
                        if exp > HOY.date():
                            continue
                        docs.append(dict(id=self.nid("eam_documento_activo"), activo_id=a.id, tipo=tipo, nombre=nombre,
                                         numero=f"{tipo}-{r.integers(10**6, 10**7)}", fecha_expedicion=exp,
                                         fecha_vencimiento=exp + timedelta(days=365), activo=True,
                                         _fecha=datetime.combine(exp, datetime.min.time())))
            if a.anio >= HOY.year - 3:
                ini = date(a.anio, 3, 1)
                gar.append(dict(id=self.nid("eam_garantia"), activo_id=a.id, tipo="FABRICANTE", descripcion=f"Garantía de fábrica {a.marca}",
                                proveedor=f"Concesionario {a.marca}", numero_garantia=f"GAR-{a.id:06d}", fecha_inicio=ini,
                                fecha_fin=ini + timedelta(days=3 * 365), estado="VIGENTE" if ini + timedelta(days=3 * 365) > HOY.date() else "VENCIDA",
                                valor_cubierto=round(a.costo * 0.15, -3), reclamaciones=0, cobertura="Tren motriz y sistema eléctrico",
                                _fecha=datetime.combine(ini, datetime.min.time())))
        await self.copiar("eam_activo", filas)
        await self.copiar("eam_esquema_asignacion", esq)
        await self.copiar("eam_documento_activo", docs)
        await self.copiar("eam_garantia", gar)

    def _placa(self, a: Activo) -> Optional[str]:
        if a.clase == "MONTACARGAS":
            return None
        # Derivada del id: única sin tener que comprobar choques.
        if a.clase == "REMOLQUE":
            return f"R{a.id:05d}"
        letras = "ABCDEFGHJKLMNPRSTUVWXYZ"
        n = a.id // 1000 + 1
        pref = "T" + letras[(n // 23) % 23] + letras[n % 23]
        return f"{pref}{a.id % 1000:03d}"

    # ── 3. combustible ────────────────────────────────────────────────────────
    async def combustible(self, lote: List[Activo]) -> None:
        r = self.rng
        filas = []
        for a in lote:
            if not a.tanque or not a.kpg:
                continue
            autonomia = a.tanque * a.kpg
            precio0 = 9_800 if a.clase != "MONTACARGAS" else 7_200
            desde = a.lectura[0] - (a.lectura[1] - a.lectura[0])
            objetivo = autonomia * float(r.uniform(0.55, 0.85))
            for d in range(self.dias):
                recorrido = a.lectura[d] - desde
                if recorrido < objetivo:
                    continue
                fecha = self.dia(d, float(r.uniform(5, 20)))
                lectura = self.lect(a, fecha)
                km = round(float(lectura - desde), 1)
                if km <= 0:
                    continue
                rendimiento = a.kpg * float(r.normal(1.0, 0.07))
                if r.random() < 0.03:
                    rendimiento *= 0.72          # fugas, robo o mal registro: lo que la meta debe delatar
                cantidad = round(km / max(rendimiento, 0.1), 2)
                precio = round(precio0 * (1 + 0.07 * d / 365) * float(r.normal(1, 0.015)), 0)
                lleno = r.random() < 0.93
                rend = round(km / cantidad, 2) if lleno and cantidad else None
                cumple = None if rend is None else rend >= a.kpg * 0.92
                filas.append(dict(
                    id=self.nid("eam_registro_combustible"), activo_id=a.id, fecha=fecha,
                    tipo_combustible="GLP" if a.clase == "MONTACARGAS" else "ACPM", cantidad=cantidad,
                    unidad="GAL", precio_unitario=precio, subtotal=round(cantidad * precio, 0), iva_pct=0.0, iva_valor=0.0,
                    costo_total=round(cantidad * precio, 0),
                    odometro=lectura if a.medidor == "KM" else None, horometro=lectura if a.medidor == "HORAS" else None,
                    km_recorridos=km, rendimiento=rend, tanque_lleno=lleno, meta_km_gal=a.kpg, cumple_meta=cumple,
                    desviacion_pct=None if rend is None else round((rend - a.kpg) / a.kpg * 100, 2),
                    proveedor=["Terpel", "Primax", "Biomax", "Texaco"][r.integers(4)], factura=f"FE{r.integers(10**6, 10**7)}",
                    conductor=self.persona(), estacion=f"EDS {a.sede[1]}", registrado_por="carga", _fecha=fecha))
                desde = lectura
                objetivo = autonomia * float(r.uniform(0.55, 0.85))
        await self.copiar("eam_registro_combustible", filas)

    # ── 4. mantenimiento (en memoria hasta el kárdex) ─────────────────────────
    def mantenimiento(self, a: Activo) -> None:
        r = self.rng
        planes = PLANES[a.clase]
        base = planes[0][1]
        l0, lf = float(a.lectura[0]), float(a.lectura[-1])
        k = int(l0 // base) + 1
        while k * base <= lf:
            umbral = k * base
            nivel = max((p for p in planes if umbral % p[1] == 0), key=lambda p: p[1])
            d = self.dia_de_lectura(a, umbral) + int(r.integers(0, 3))
            if d < self.dias:
                self._ot(a, d, "PREVENTIVA", nivel=nivel)
            k += 1
        for cod, desc, beta, eta, reps, horas in MODOS[a.clase]:
            prox = l0 + eta * float(r.weibull(beta)) * float(r.uniform(0.2, 1.0))
            while prox < lf:
                d = self.dia_de_lectura(a, prox)
                if d < self.dias:
                    self._ot(a, d, "CORRECTIVA", modo=(cod, desc, reps, horas))
                prox += eta * float(r.weibull(beta))

    def _ot(self, a: Activo, d: int, tipo: str, nivel=None, modo=None) -> None:
        r = self.rng
        oid = self.nid("eam_orden_trabajo")
        inicio = self.dia(d, float(r.uniform(6, 15)))
        if tipo == "PREVENTIVA":
            letra, frec, unidad, reps, horas, aceite = nivel
            desc = f"Mantenimiento preventivo {letra} cada {frec:,} {unidad.lower()}".replace(",", ".")
            plan_id = self.planes_id[(a.clase, letra)]
            falla = causa = sol = None
            prioridad = "MEDIA"
        else:
            cod, desc0, reps, horas = modo
            desc = f"{desc0} reportada en operación"
            plan_id = None
            falla, causa, sol = self.fallas[cod], self.causas[r.integers(len(self.causas))], self.soluciones[r.integers(len(self.soluciones))]
            prioridad = "ALTA" if r.random() < 0.35 else "MEDIA"
            aceite = False
        horas_real = round(horas * float(r.lognormal(0, 0.25)), 1)
        fin = inicio + timedelta(hours=horas_real + float(r.uniform(0.5, 30 if tipo == "CORRECTIVA" else 4)))
        dias_atras = (HOY - inicio).days
        if dias_atras <= 2 and r.random() < 0.6:
            estado = "EN_PROCESO" if r.random() < 0.5 else "PENDIENTE"
        elif dias_atras <= 14:
            estado = "COMPLETADA"
        else:
            estado = "CANCELADA" if r.random() < 0.008 else "CERRADA"
        abierta = estado in ("PENDIENTE", "EN_PROCESO")
        contratista = self.contratistas[r.integers(len(self.contratistas))] if r.random() < 0.18 else None
        tecnico = self.persona()
        lectura = self.lect(a, inicio)
        self.ots.append(dict(
            id=oid, numero=f"OT-{oid:07d}", activo_id=a.id, tipo_ot=tipo, tipo_trabajo_id=self.tt_prev if tipo == "PREVENTIVA" else self.tt_corr,
            estado=estado, prioridad=prioridad, descripcion=desc, falla_id=falla, causa_id=causa, solucion_id=sol, plan_id=plan_id,
            contratista_id=contratista, tecnico_asignado=tecnico, fecha_requerida=inicio,
            fecha_inicio=None if estado == "PENDIENTE" else inicio, fecha_fin=None if abierta or estado == "CANCELADA" else fin,
            odometro=lectura if a.medidor == "KM" else None, horometro=lectura if a.medidor == "HORAS" else None,
            tiempo_estimado_horas=float(horas), tiempo_real_horas=None if abierta else horas_real, creado_por="carga",
            centro_costo=a.sede[0], ciudad=a.sede[1], afecta_disponibilidad=tipo == "CORRECTIVA", es_falla=tipo == "CORRECTIVA",
            _fecha=inicio, _activo=a, _horas=horas_real, _contratista=contratista, _aceite=aceite, _dia=d))
        if estado != "CANCELADA":
            pref = PREFIJO_CLASE[a.clase]
            for sufijo, cant in reps:
                cod = sufijo if sufijo.startswith("MC-") else f"{pref}-{sufijo}"
                if cod not in self.repuestos:
                    continue
                mid = self.nid("eam_ot_material")
                self.materiales.append([mid, oid, cod, float(cant), self.bodegas[a.sede[2]], inicio, contratista])
        if a.medidor and plan_id:
            clave = (plan_id, a.id)
            prev = self.ultimo_plan.get(clave)
            if prev is None or prev[0] < inicio:
                self.ultimo_plan[clave] = (inicio, lectura, oid)

    async def planes(self) -> None:
        self.planes_id = {}
        filas, det, rep = [], [], []
        for clase, lista in PLANES.items():
            tipo = next(c["tipo"] for c in CLASES if c["clase"] == clase)
            nombre_clase = next(c["nombre"] for c in CLASES if c["clase"] == clase)
            for letra, frec, unidad, reps, horas, _ in lista:
                pid = self.nid("eam_plan_mantenimiento")
                self.planes_id[(clase, letra)] = pid
                filas.append(dict(id=pid, nombre=f"Preventivo {letra} — {nombre_clase}", tipo_activo=tipo, tipo_mant="PREVENTIVO",
                                  frecuencia=frec, unidad=unidad, tipo_ot="PREVENTIVA",
                                  descripcion=f"Rutina {letra} para {nombre_clase.lower()}s cada {frec} {unidad.lower()}.",
                                  costo_estimado=None, activo=True, _fecha=self.inicio))
                det.append(dict(id=self.nid("eam_plan_detalle"), plan_id=pid, descripcion="Inspección general y ajuste",
                                tiempo_estimado=float(horas), costo_mano_obra=float(horas) * 55_000, orden=1, _fecha=self.inicio))
                pref = PREFIJO_CLASE[clase]
                for orden, (sufijo, cant) in enumerate(reps, start=1):
                    cod = sufijo if sufijo.startswith("MC-") else f"{pref}-{sufijo}"
                    if cod in self.repuestos:
                        rid, costo, und = self.repuestos[cod]
                        rep.append(dict(id=self.nid("eam_plan_repuesto"), plan_id=pid, repuesto_id=rid, descripcion=cod,
                                        cantidad=float(cant), unidad=und, costo_unitario=costo, orden=orden, _fecha=self.inicio))
        await self.copiar("eam_plan_mantenimiento", filas)
        await self.copiar("eam_plan_detalle", det)
        await self.copiar("eam_plan_repuesto", rep)

    # ── 5. kárdex: compras dimensionadas por el consumo y costo promedio ──────
    async def kardex_y_ots(self, activos: Dict[int, Activo]) -> None:
        r = self.rng
        consumo_mes = defaultdict(float)          # (cod, bodega, año-mes) -> cantidad
        for mid, oid, cod, cant, bod, fecha, _ in self.materiales:
            consumo_mes[(cod, bod, fecha.year * 12 + fecha.month - 1)] += cant
        eventos = []
        for (cod, bod, mes), cant in consumo_mes.items():
            # Compra el día 1 del mes anterior por lo que se va a consumir +35 %.
            y, m = divmod(mes - 1, 12)
            fecha = max(datetime(y, m + 1, 1, 7), self.inicio - timedelta(days=30))
            eventos.append((fecha, 0, cod, bod, math.ceil(cant * 1.35), None))
        for mat in self.materiales:
            eventos.append((mat[5], 1, mat[2], mat[4], mat[3], mat))
        eventos.sort(key=lambda e: (e[0], e[1]))

        saldo = defaultdict(float)
        promedio: Dict[Tuple[str, int], float] = {}
        movs, ultimo = [], {}
        for fecha, sentido, cod, bod, cant, mat in eventos:
            rid, base, und = self.repuestos[cod]
            clave = (cod, bod)
            if sentido == 1 and saldo[clave] < cant:
                # Compra urgente: el taller no espera la compra del mes.
                faltan = math.ceil(cant - saldo[clave])
                self._entrada(movs, saldo, promedio, clave, rid, bod, fecha - timedelta(hours=2), faltan, base, "Compra urgente")
            if sentido == 0:
                self._entrada(movs, saldo, promedio, clave, rid, bod, fecha, cant, base, "Compra mensual")
            else:
                costo = promedio[clave]
                saldo[clave] -= cant
                mat.append(round(costo, 2))
                movs.append(dict(id=self.nid("eam_inv_movimiento"), fecha=fecha, repuesto_id=rid, bodega_id=bod, tipo="SALIDA",
                                 cantidad=cant, costo_unitario=round(costo, 2), costo_total=round(costo * cant, 2),
                                 saldo_cantidad=round(saldo[clave], 4), saldo_costo_promedio=round(costo, 2), ot_id=mat[1],
                                 ot_material_id=mat[0], motivo_id=self.motivo_ot, documento=f"OT-{mat[1]:07d}",
                                 registrado_por="carga", _fecha=fecha))
            ultimo[clave] = fecha
        exist = []
        for (cod, bod), cant in saldo.items():
            rid, base, und = self.repuestos[cod]
            exist.append(dict(id=self.nid("eam_inv_existencia"), repuesto_id=rid, bodega_id=bod, cantidad=round(cant, 4),
                              costo_promedio=round(promedio[(cod, bod)], 2), stock_minimo=4.0, stock_maximo=60.0,
                              ultimo_movimiento=ultimo[(cod, bod)]))
        await self.copiar("eam_inv_existencia", exist)
        stock = defaultdict(float)
        for (cod, _), cant in saldo.items():
            stock[self.repuestos[cod][0]] += cant
        await self.pg.executemany(f'UPDATE "{self.esq}".eam_repuesto SET stock_actual = $1 WHERE id = $2',
                                  [(int(round(v)), k) for k, v in stock.items()])

        # Materiales, mano de obra y costos de cada OT.
        rep_ot = defaultdict(float)
        filas_mat = []
        for mid, oid, cod, cant, bod, fecha, contr, costo in self.materiales:
            rid, base, und = self.repuestos[cod]
            rep_ot[oid] += costo * cant
            filas_mat.append(dict(id=mid, ot_id=oid, repuesto_id=rid, descripcion=cod, cantidad=cant, unidad=und,
                                  costo_unit=costo, costo_total=round(costo * cant, 2), contratista_id=contr, bodega_id=bod, _fecha=fecha))
        filas_mo = []
        for ot in self.ots:
            horas = ot.pop("_horas")
            contr = ot.pop("_contratista")
            ot.pop("_activo"); ot.pop("_aceite"); ot.pop("_dia")
            if ot["estado"] == "CANCELADA" or ot["estado"] == "PENDIENTE":
                mo = 0.0
            else:
                tarifa = float(r.uniform(42_000, 68_000))
                mo = round(horas * tarifa, 0)
                filas_mo.append(dict(id=self.nid("eam_ot_mano_obra"), ot_id=ot["id"], tecnico=ot["tecnico_asignado"],
                                     actividad=ot["descripcion"][:200], fecha=ot["fecha_inicio"], horas=horas, tarifa_hora=round(tarifa, 0),
                                     costo_total=mo, tipo_trabajo_id=ot["tipo_trabajo_id"], contratista_id=contr, _fecha=ot["_fecha"]))
            serv = round(mo * float(r.uniform(0.3, 0.8)), 0) if contr else 0.0
            repuestos = round(rep_ot.get(ot["id"], 0.0), 2)
            ot.update(costo_mano_obra=mo, costo_repuestos=repuestos, costo_servicios=serv, costo_total=round(mo + repuestos + serv, 2))
        await self.copiar("eam_orden_trabajo", self.ots)
        await self.copiar("eam_ot_material", filas_mat)
        await self.copiar("eam_ot_mano_obra", filas_mo)
        # El kárdex va después de las órdenes: cada salida apunta a su OT.
        await self.copiar("eam_inv_movimiento", movs)

        # Estado del plan por activo: última ejecución y próxima.
        filas = []
        for (pid, aid), (fecha, lectura, oid) in self.ultimo_plan.items():
            frec = next(p[1] for cl, lista in PLANES.items() for p in lista if self.planes_id[(cl, p[0])] == pid)
            filas.append(dict(id=self.nid("eam_plan_activo"), plan_id=pid, activo_id=aid, ultima_ejecucion_fecha=fecha,
                              ultima_ejecucion_odometro=lectura if activos[aid].medidor == "KM" else None,
                              ultima_ejecucion_horometro=lectura if activos[aid].medidor == "HORAS" else None, ultima_ot_id=oid,
                              proximo_odometro=(lectura + frec) if activos[aid].medidor == "KM" else None,
                              proximo_horometro=(lectura + frec) if activos[aid].medidor == "HORAS" else None, _fecha=fecha))
        await self.copiar("eam_plan_activo", filas)
        abiertos = {ot["activo_id"] for ot in self.ots if ot["estado"] in ("EN_PROCESO",)}
        if abiertos:
            await self.pg.execute(f"UPDATE \"{self.esq}\".eam_activo SET estado = 'EN_MANTENIMIENTO' WHERE id = ANY($1::int[])",
                                  list(abiertos))

    def _entrada(self, movs, saldo, promedio, clave, rid, bod, fecha, cant, base, nota):
        r = self.rng
        dias = (fecha - self.inicio).days
        costo = base * (1 + 0.075 * dias / 365) * float(r.normal(1, 0.03))
        anterior = max(saldo[clave], 0.0)
        prom = promedio.get(clave, costo)
        nuevo = (anterior * prom + cant * costo) / (anterior + cant) if anterior + cant else costo
        saldo[clave] += cant
        promedio[clave] = nuevo
        movs.append(dict(id=self.nid("eam_inv_movimiento"), fecha=fecha, repuesto_id=rid, bodega_id=bod, tipo="ENTRADA", cantidad=float(cant),
                         costo_unitario=round(costo, 2), costo_total=round(costo * cant, 2), saldo_cantidad=round(saldo[clave], 4),
                         saldo_costo_promedio=round(nuevo, 2), motivo_id=self.motivo_compra, documento=f"FC-{r.integers(10**6, 10**7)}",
                         proveedor="Distribuidora de Repuestos Pesados SAS", observaciones=nota, registrado_por="carga", _fecha=fecha))

    # ── 6. llantas ─────────────────────────────────────────────────────────────
    async def llantas(self, lote: List[Activo]) -> None:
        r = self.rng
        neus, movs, insp, vidas, reenc = [], [], [], [], []
        for a in lote:
            medida, costo_nueva, desg_dir, desg_tra = LLANTA_CLASE[a.clase]
            bodega_ll = self.bodega_llantas[a.sede[2]]
            zona = self.zonas[a.sede[0]]
            almacen: List[dict] = []          # reencauchadas listas para volver a montar
            for pos, uso in a.posiciones:
                d = 0
                llanta = None
                while d < self.dias:
                    if llanta is None:
                        # Del almacén si hay una reencauchada apta (no van en dirección); si no, nueva.
                        if uso != "DIRECCIONAL" and almacen and almacen[0]["_listo"] <= d:
                            llanta = almacen.pop(0)
                        else:
                            llanta = self._llanta_nueva(a, uso, medida, costo_nueva, bodega_ll, zona, d, neus, vidas)
                        m = self._mov(llanta, "INSTALACION", a, pos, d, 0.1)
                        movs.append(m)
                        llanta["_montaje_lect"] = m["km_odometro"] if m["km_odometro"] is not None else m["horometro"]
                        llanta["_montaje_dia"] = d
                        llanta["estado"], llanta["activo_id"], llanta["posicion"] = "INSTALADO", a.id, pos
                        llanta["bodega_id"] = None
                        llanta["fecha_instalacion"] = self.dia(d).date()
                    # Desgaste de esta vida, en mm por unidad del medidor.
                    tasa = (desg_dir if uso == "DIRECCIONAL" else desg_tra) / (1000 if a.medidor == "KM" else 1)
                    tasa *= float(r.lognormal(0, 0.15)) * (0.25 if pos.startswith("REPUESTO") else 1.0)
                    sesgo = np.array([float(r.normal(1, 0.06)) for _ in range(3)])
                    prof = llanta["_prof_vida"]
                    utilizable = prof - PROF_MIN
                    lect0 = llanta["_montaje_lect"]
                    # Día en que el surco más gastado llega al mínimo.
                    limite = lect0 + utilizable / (tasa * sesgo.max())
                    corte = r.random() < 0.035 and not pos.startswith("REPUESTO")
                    if corte:
                        limite = lect0 + (limite - lect0) * float(r.uniform(0.1, 0.8))
                    d_fin = self.dia_de_lectura(a, limite)
                    ultimo = [prof, prof, prof]
                    for di in range(d + 30, min(d_fin, self.dias), 30):
                        lect = self.lect(a, self.dia(di, 9))
                        usado = (lect - lect0) * tasa
                        vals = [round(max(PROF_MIN, min(ultimo[k], prof - usado * sesgo[k] + float(r.normal(0, 0.15)))), 1) for k in range(3)]
                        ultimo = vals
                        insp.append(dict(id=self.nid("eam_inspeccion_neumatico"), neumatico_id=llanta["id"], fecha=self.dia(di, 9),
                                         profundidad_izq=vals[0], profundidad_centro=vals[1], profundidad_der=vals[2],
                                         presion_psi=round(float(r.normal(110 if a.medidor == "KM" else 90, 5)), 0),
                                         km_odometro=lect if a.medidor == "KM" else None, posicion=pos,
                                         estado_visual="BUENO" if min(vals) > 6 else "REGULAR", tecnico=self.persona(),
                                         _fecha=self.dia(di, 9)))
                    if d_fin >= self.dias:
                        # Sigue montada hoy.
                        lect = self.lectura_en(a, self.dias - 1, 1.0)
                        usado = (lect - lect0) * tasa
                        llanta["profundidad_actual"] = round(max(PROF_MIN, prof - usado * float(sesgo.max())), 1)
                        llanta["profundidad_externa"] = round(max(PROF_MIN, prof - usado * float(sesgo[0])), 1)
                        llanta["profundidad_interna"] = round(max(PROF_MIN, prof - usado * float(sesgo[2])), 1)
                        llanta["_cont"] += lect - lect0
                        llanta["km_actual"] = round(llanta["_cont"], 1)
                        llanta["km_total"] = round(llanta["_cont"] - llanta["km_inicio"], 1)
                        break
                    # Se retira.
                    lect_fin = self.lect(a, self.dia(d_fin, 7 + 9 * 0.6))   # la misma hora del movimiento
                    recorrido = lect_fin - lect0
                    llanta["_cont"] += recorrido
                    prof_fin = round(max(PROF_MIN, prof - recorrido * tasa * float(sesgo.max())), 1) if corte else PROF_MIN
                    vida = llanta["_vida"]
                    vida.update(fecha_fin=self.dia(d_fin, 16), km_fin=round(llanta["_cont"], 1), profundidad_final=prof_fin)
                    llanta.update(profundidad_actual=prof_fin, km_actual=round(llanta["_cont"], 1), activo_id=None, posicion=None)
                    # Si ya hay dos reencauchadas esperando, la carcasa no se manda:
                    # las de dirección no usan reencauche y el sobrante se acumularía.
                    sobra = len(almacen) >= 2
                    if corte or sobra or llanta["reencauches"] >= MAX_REENCAUCHES or (r.random() < 0.10):
                        motivo = "CORTE" if corte else ("DESGASTE" if sobra or llanta["reencauches"] >= MAX_REENCAUCHES else "RECHAZO")
                        vida["motivo_cierre_id"] = self.motivo_fin[motivo]
                        movs.append(self._mov(llanta, "BAJA", a, pos, d_fin, 0.6))
                        llanta.update(estado="BAJA", fecha_baja=self.dia(d_fin).date(), motivo_fin_vida_id=self.motivo_fin[motivo],
                                      motivo_baja=self.motivos_txt[motivo], bodega_id=None)
                        if motivo == "RECHAZO":
                            reenc.append((llanta, d_fin, "RECHAZO", None))
                    else:
                        movs.append(self._mov(llanta, "DESMONTAJE", a, pos, d_fin, 0.6, bodega=bodega_ll))
                        movs.append(self._mov(llanta, "REENCAUCHE", None, None, d_fin + 1, 0.0, bodega=bodega_ll, lectura=False))
                        banda = self.bandas[r.integers(len(self.bandas))]
                        vuelve = d_fin + int(r.integers(10, 25))
                        llanta["reencauches"] += 1
                        llanta["estado"] = "REENCAUCHE"
                        reenc.append((llanta, d_fin, "REENCAUCHADA", banda))
                        if vuelve < self.dias:
                            nueva = dict(id=self.nid("eam_vida_neumatico"), neumatico_id=llanta["id"], numero_vida=vida["numero_vida"] + 1,
                                         tipo="REENCAUCHADA", fecha_inicio=self.dia(vuelve, 10), km_inicio=0.0, costo=float(banda[3]),
                                         profundidad_inicial=banda[2], _fecha=self.dia(vuelve, 10))
                            vidas.append(nueva)
                            llanta.update(_vida=nueva, _prof_vida=banda[2], profundidad_diseño=banda[2], profundidad_actual=banda[2],
                                          costo=float(banda[3]), estado="ALMACENADO", bodega_id=bodega_ll, km_inicio=round(llanta["_cont"], 1),
                                          km_total=0.0, _listo=vuelve)
                            almacen.append(llanta)
                    llanta = None
                    d = d_fin + 1
                # Fin del horizonte para esta posición.
            for sobrante in almacen:
                sobrante["estado"] = "ALMACENADO"
        # Lotes de reencauche: uno por bodega y semana.
        lotes, detalle = {}, []
        for llanta, d, resultado, banda in reenc:
            semana = (self.dia(d).isocalendar()[0], self.dia(d).isocalendar()[1], llanta["_bodega_origen"])
            if semana not in lotes:
                lid = self.nid("eam_reencauche_lote")
                lotes[semana] = dict(id=lid, codigo=f"RE-{lid:05d}", fecha_envio=self.dia(d).date(), proveedor="Reencauchadora Andina SAS",
                                     remision=f"REM-{lid:05d}", estado="CERRADO" if (HOY - self.dia(d)).days > 30 else "ABIERTO",
                                     _fecha=self.dia(d))
            detalle.append(dict(id=self.nid("eam_reencauche_detalle"), lote_id=lotes[semana]["id"], neumatico_id=llanta["id"],
                                banda=banda[1] if banda else None, banda_id=banda[0] if banda else None, resultado=resultado,
                                profundidad_nueva=banda[2] if banda else None, costo=float(banda[3]) if banda else None,
                                _fecha=self.dia(d)))
        for n in neus:
            for k in [k for k in n if k.startswith("_")]:
                n.pop(k)
        for v in vidas:
            v.pop("_listo", None)
        await self.copiar("eam_neumatico", neus)
        await self.copiar("eam_vida_neumatico", vidas)
        await self.copiar("eam_movimiento_neumatico", movs)
        await self.copiar("eam_inspeccion_neumatico", insp)
        await self.copiar("eam_reencauche_lote", list(lotes.values()))
        await self.copiar("eam_reencauche_detalle", detalle)

    def _llanta_nueva(self, a, uso, medida, costo, bodega, zona, d, neus, vidas) -> dict:
        r = self.rng
        candidatas = [x for x in self.refs_llanta if x[2] == uso] or self.refs_llanta
        marca, ref, _ = candidatas[r.integers(len(candidatas))]
        nid = self.nid("eam_neumatico")
        prof = {"DIRECCIONAL": 16.0, "TRACCION": 22.0, "LIBRE": 16.0}[uso]
        if a.clase == "MONTACARGAS":
            prof = 14.0
        precio = round(costo * float(r.normal(1, 0.06)), -3)
        fecha = self.dia(d, 7)
        llanta = dict(id=nid, codigo=f"LL-{nid:07d}", marca=marca, referencia=ref, medida=medida, tipo="RADIAL" if a.clase != "MONTACARGAS" else "MACIZA",
                      estado="ALMACENADO", activo_id=None, posicion=None, fecha_instalacion=None, km_inicio=0.0, km_actual=0.0, km_total=0.0,
                      vida_util_km=120_000.0 if a.medidor == "KM" else None, profundidad_diseño=prof, profundidad_actual=prof, costo=precio,
                      proveedor=f"Llantas {marca} Colombia", reencauches=0, es_usada=False, bodega_id=bodega, tipo_uso=uso,
                      presion_recomendada=110.0 if a.medidor == "KM" else 90.0, orientacion="NORMAL", profundidad_externa=prof,
                      profundidad_interna=prof, zona_id=zona, dot=f"{r.integers(10, 52):02d}{(fecha.year - 1) % 100:02d}",
                      tipo_rin="ACERO", _prof_vida=prof, _cont=0.0, _bodega_origen=bodega, _fecha=fecha)
        vida = dict(id=self.nid("eam_vida_neumatico"), neumatico_id=nid, numero_vida=1, tipo="NUEVA", fecha_inicio=fecha, km_inicio=0.0,
                    costo=precio, profundidad_inicial=prof, _fecha=fecha)
        llanta["_vida"] = vida
        neus.append(llanta)
        vidas.append(vida)
        return llanta

    def _mov(self, llanta, tipo, a, pos, d, frac, bodega=None, lectura=True) -> dict:
        fecha = self.dia(d, 7 + 9 * frac)
        lect = self.lect(a, fecha) if (a is not None and lectura) else None
        return dict(id=self.nid("eam_movimiento_neumatico"), neumatico_id=llanta["id"], tipo_movimiento=tipo,
                    activo_id=a.id if a is not None else None, posicion=pos, bodega_id=bodega,
                    km_odometro=lect if (a is not None and a.medidor == "KM") else None,
                    horometro=lect if (a is not None and a.medidor == "HORAS") else None,
                    fecha=fecha, tecnico=self.persona(), _fecha=fecha)

    # ── 7. checklists ─────────────────────────────────────────────────────────
    async def checklists(self, lote: List[Activo]) -> None:
        r = self.rng
        ejec, resp, prog = [], [], []
        for a in lote:
            if a.clase == "REMOLQUE":
                continue
            pid, preguntas = self.plantillas["MONTACARGAS" if a.clase == "MONTACARGAS" else "VEHICULO"]
            ultima = None
            for d in range(int(r.integers(0, 14)), self.dias, 14):
                eid = self.nid("eam_chk_ejecucion")
                fecha = self.dia(d, float(r.uniform(4.5, 7)))
                no_conf = criticos = 0
                puntaje_total = puntaje = 0.0
                for qid, critico, peso in preguntas:
                    conforme = r.random() > (0.004 if critico else 0.025)
                    puntaje_total += peso
                    if conforme:
                        puntaje += peso
                    else:
                        no_conf += 1
                        criticos += int(critico)
                    resp.append(dict(id=self.nid("eam_chk_respuesta"), ejecucion_id=eid, pregunta_id=qid,
                                     opcion_id=self.op_si if conforme else self.op_no, conforme=conforme,
                                     puntaje=peso if conforme else 0.0, observacion=None if conforme else "Reportado al taller",
                                     no_aplica=False, _fecha=fecha))
                pct = round(puntaje / puntaje_total * 100, 1)
                resultado = "RECHAZADO" if criticos or pct < 85 else "APROBADO"
                lect = self.lect(a, fecha)
                ejec.append(dict(id=eid, numero=f"CHK-{eid:08d}", plantilla_id=pid, plantilla_version=1, activo_id=a.id,
                                 ejecutado_por=self.persona(), fecha_inicio=fecha, fecha_fin=fecha + timedelta(minutes=12),
                                 estado="COMPLETADA", resultado=resultado, pct_conforme=pct, total_items=len(preguntas),
                                 no_conformes=no_conf, criticos_no_conformes=criticos,
                                 odometro=lect if a.medidor == "KM" else None, horometro=lect if a.medidor == "HORAS" else None,
                                 ubicacion=f"Patio {a.sede[1]}", firma_nombre="Conductor", firma_fecha=fecha + timedelta(minutes=12),
                                 _fecha=fecha))
                ultima = (fecha, eid)
            if ultima:
                prog.append(dict(id=self.nid("eam_chk_programacion"), plantilla_id=pid, activo_id=a.id, ultima_fecha=ultima[0],
                                 ultima_ejecucion_id=ultima[1], proxima_fecha=ultima[0] + timedelta(days=14), activo=True, _fecha=ultima[0]))
        await self.copiar("eam_chk_ejecucion", ejec)
        await self.copiar("eam_chk_respuesta", resp)
        await self.copiar("eam_chk_programacion", prog)

    # ── 8. lubricación: una carga por cambio de aceite, muestras en el 40 % ──
    async def lubricacion(self, activos: Dict[int, Activo]) -> None:
        r = self.rng
        comp, cargas, muestras, resultados = [], [], [], []
        por_activo = defaultdict(list)
        for ot in self.ots_aceite:
            por_activo[ot[0]].append(ot)
        for aid, lista in por_activo.items():
            a = activos[aid]
            cid = self.nid("eam_lube_compartimento")
            cap = {"TRACTO": 40.0, "CAMION": 15.0, "LIVIANO": 7.0, "MONTACARGAS": 5.0}[a.clase]
            frec = PLANES[a.clase][0][1]
            comp.append(dict(id=cid, activo_id=aid, tipo_compartimento_id=self.tipo_motor, codigo=f"{a.codigo}-MOT", nombre="Motor diésel",
                             capacidad_litros=cap, producto_recomendado_id=self.prod_motor, frecuencia_muestreo=float(frec),
                             metodo_muestreo_id=self.metodo, tiene_puerto_muestreo=True, critico=a.clase == "TRACTO", activo=True,
                             _fecha=self.inicio))
            muestrea = a.clase in ("TRACTO", "CAMION") and r.random() < 0.4
            lista.sort(key=lambda x: x[2])
            previa = None
            for _, oid, fecha, lect in lista:
                if previa:
                    previa.update(estado="DRENADA", fecha_drenaje=fecha, medidor_fin=lect, motivo_drenaje_id=self.motivo_drenaje,
                                  vida_lograda=round(lect - previa["medidor_inicio"], 1))
                    if muestrea:
                        self._muestra(previa, cid, fecha, lect, muestras, resultados)
                carga = dict(id=self.nid("eam_lube_carga"), compartimento_id=cid, producto_id=self.prod_motor, fecha_llenado=fecha,
                             medidor_inicio=lect, volumen_litros=cap, costo_aceite=round(cap / 3.785 * 68_000, 0),
                             costo_filtro=95_000.0, costo_mano_obra=60_000.0, estado="ACTIVA", orden_trabajo_id=oid,
                             registrado_por="carga", _fecha=fecha)
                cargas.append(carga)
                previa = carga
        await self.copiar("eam_lube_compartimento", comp)
        await self.copiar("eam_lube_carga", cargas)
        await self.copiar("eam_lube_muestra", muestras)
        await self.copiar("eam_lube_resultado", resultados)

    def _muestra(self, carga, cid, fecha, lect, muestras, resultados) -> None:
        r = self.rng
        mid = self.nid("eam_lube_muestra")
        peor = 0
        filas = []
        # Una muestra anormal lo es por uno o dos parámetros, no por todos: el
        # 8 % sale marginal y el 2 % crítica.
        sorteo = r.random()
        nivel = 2 if sorteo < 0.02 else (1 if sorteo < 0.10 else 0)
        malos = set(r.choice(len(self.limites), size=min(len(self.limites), int(r.integers(1, 3))), replace=False)) \
            if nivel and self.limites else set()
        for idx, (pid, cod, tipo, mmin, mmax, cmin, cmax) in enumerate(self.limites):
            malo = (0.01 if nivel == 2 else 0.05) if idx in malos else 1.0
            if mmin is not None and mmax is not None:
                # Con rango (viscosidad): normal adentro, fuera por arriba o por abajo.
                if malo < 0.02:
                    v = (cmax or mmax * 1.15) * float(r.uniform(1.0, 1.08)); est = 2
                elif malo < 0.10:
                    v = mmax * float(r.uniform(1.0, (cmax or mmax * 1.1) / mmax)); est = 1
                else:
                    v = float(r.uniform(mmin * 1.03, mmax * 0.97)); est = 0
            elif mmax is not None:
                if malo < 0.02:
                    v = (cmax or mmax * 1.5) * float(r.uniform(1.0, 1.3)); est = 2
                elif malo < 0.10:
                    v = mmax * float(r.uniform(1.0, 1.25)); est = 1
                else:
                    v = mmax * float(r.uniform(0.15, 0.85)); est = 0
            elif mmin is not None:
                if malo < 0.02:
                    v = (cmin or mmin * 0.6) * float(r.uniform(0.7, 1.0)); est = 2
                elif malo < 0.10:
                    v = mmin * float(r.uniform(0.8, 1.0)); est = 1
                else:
                    v = mmin * float(r.uniform(1.1, 1.6)); est = 0
            else:
                continue
            peor = max(peor, est)
            filas.append(dict(id=self.nid("eam_lube_resultado"), muestra_id=mid, parametro_id=pid, valor=round(float(v), 2),
                              estado=["NORMAL", "MARGINAL", "CRITICO"][est], _fecha=fecha))
        muestras.append(dict(id=mid, numero=f"LUB-{mid:07d}", carga_id=carga["id"], compartimento_id=cid, fecha_toma=fecha - timedelta(hours=2),
                             fecha_recepcion=fecha + timedelta(days=2), fecha_resultado=fecha + timedelta(days=5), medidor_equipo=lect,
                             horas_aceite=round(lect - carga["medidor_inicio"], 1), laboratorio_id=self.lab, metodo_id=self.metodo,
                             severidad=["NORMAL", "MARGINAL", "CRITICO"][peor], severidad_manual=False, estado="CON_RESULTADO",
                             registrado_por="carga", _fecha=fecha))
        resultados.extend(filas)

    async def secuencias(self) -> None:
        for t in self.columnas:
            await self.pg.execute(
                f"SELECT setval(pg_get_serial_sequence('\"{self.esq}\".\"{t}\"', 'id'), "
                f"GREATEST((SELECT coalesce(max(id), 0) FROM \"{self.esq}\".\"{t}\"), 1))")

    # ── orquestación ─────────────────────────────────────────────────────────
    async def correr(self) -> None:
        t0 = time.time()
        async with engine.connect() as conn:
            raw = await conn.get_raw_connection()
            self.pg = raw.driver_connection
            await self.pg.execute(f'SET search_path TO "{self.esq}"')
            await self.preparar()
            print("Vaciando la operación del CMMS…", flush=True)
            await self.vaciar_operacion()
            # El CASCADE del vaciado arrastra catálogos que cuelgan de tablas
            # operativas (p. ej. los límites de lubricación): se vuelve a correr
            # la siembra de fábrica del esquema, la misma del arranque.
            from app.main import _migrar_esquema
            await _migrar_esquema(self.esq)
            await self.preparar()
            print("Catálogos…", flush=True)
            await self.catalogos()
            self.motivos_txt = {"CORTE": "Corte irreparable", "RECHAZO": "Rechazada en reencauche", "DESGASTE": "Fin de vida útil"}
            await self.planes()
            print(f"Activos ({self.n})…", flush=True)
            activos = self.crear_activos()
            await self.escribir_activos(activos)
            por_id = {a.id: a for a in activos}
            self.ots, self.materiales, self.ultimo_plan = [], [], {}
            tam = 150
            for i in range(0, len(activos), tam):
                lote = activos[i:i + tam]
                await self.combustible(lote)
                await self.llantas(lote)
                await self.checklists(lote)
                for a in lote:
                    self.mantenimiento(a)
                print(f"  {min(i + tam, len(activos))}/{len(activos)} activos · {sum(self.cuenta.values()):,} filas · "
                      f"{time.time() - t0:,.0f} s", flush=True)
            self.ots_aceite = [(ot["activo_id"], ot["id"], ot["fecha_inicio"] or ot["_fecha"], ot["odometro"] or ot["horometro"])
                               for ot in self.ots if ot["_aceite"] and ot["estado"] != "CANCELADA"]
            print(f"Kárdex y órdenes ({len(self.ots):,} OT, {len(self.materiales):,} materiales)…", flush=True)
            await self.kardex_y_ots(por_id)
            print("Lubricación…", flush=True)
            await self.lubricacion(por_id)
            await self.secuencias()
            await self.pg.execute(f'ANALYZE')
        print("\nVolumen del CMMS")
        for t, n in sorted(self.cuenta.items(), key=lambda x: -x[1]):
            print(f"  {t:34s} {n:>12,}")
        print(f"  {'TOTAL':34s} {sum(self.cuenta.values()):>12,}")
        print(f"\nListo en {time.time() - t0:,.0f} s.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--esquema", default="cli_carga")
    p.add_argument("--activos", type=int, default=3000)
    p.add_argument("--anios", type=float, default=3)
    p.add_argument("--semilla", type=int, default=20261028)
    a = p.parse_args()
    if a.esquema not in ESQUEMAS_PERMITIDOS:
        sys.exit(f"Este guion vacía el CMMS del esquema: solo se permite en {sorted(ESQUEMAS_PERMITIDOS)}.")
    asyncio.run(Sembrador(a.esquema, a.activos, a.anios, a.semilla).correr())


if __name__ == "__main__":
    main()
