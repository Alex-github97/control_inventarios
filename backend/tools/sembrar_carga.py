"""
Siembra una empresa de PRUEBA DE CARGA con volumen en todos los módulos.

    python tools/sembrar_carga.py --codigo carga --clave 'Carga2026*'

Hace tres cosas, en este orden y cada una idempotente:

1. Da de alta la empresa (esquema `cli_<codigo>`), su administrador y todos los
   módulos contratados. Si ya existe, la deja como está.
2. Corre los generadores coherentes que ya existen (`demo_hcm`, `demo_tms`,
   `demo_dms`, `demo_qms`, `demo_crm`, `demo_scm`, `demo_wms`, `erp_demo`) para
   los módulos que los tienen, solo si su tabla principal está vacía. Esos datos
   cuadran: inventario contra movimientos, nómina, costos, contabilidad.
3. Rellena TODA tabla del esquema que siga vacía con un generador guiado por el
   esquema real de la base: llaves foráneas a filas existentes, únicos sin
   repetir, enumeraciones y los valores que los modelos documentan en sus
   comentarios (`# ABIERTO / CERRADO`). Las tablas que otras referencian
   (maestros) reciben `--maestros` filas y las demás `--filas`.

El relleno del paso 3 es para medir volumen, no para enseñar a un cliente: los
textos son verosímiles pero no hay reglas de negocio detrás. Por eso vive en su
propia empresa y nunca toca una tabla con datos.

No existe un «borrar»: para repetir desde cero se elimina el esquema entero
(`DROP SCHEMA cli_carga CASCADE`) y su fila en `public.plataforma_cliente`.
"""
import argparse
import asyncio
import json
import os
import random
import re
import string
import sys
import time
import uuid
from collections import defaultdict
from datetime import date, datetime, time as hora, timedelta, timezone
from decimal import Decimal
from glob import glob

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import MetaData, text, types as T              # noqa: E402
from sqlalchemy.dialects import postgresql as PG               # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession                # noqa: E402

import app.main                                                # noqa: F401,E402
from app.core.database import engine                           # noqa: E402
from app.core.modulos import MODULOS                           # noqa: E402

SEMILLA = 20261027
USUARIOS = 200
USUARIOS_PORTAL = 20

# Tablas cuyas filas cambian lo que su usuario puede hacer. Ligar al azar a
# cualquiera, admin incluido, a un depositante lo encierra en el portal 3PL.
SOLO_PORTAL = {"wms_depositante_usuarios"}
VALORES_FIJOS: dict = {}


def valores_fijos() -> dict:
    """Columnas de texto cuyos valores válidos viven en el código, no en un
    comentario del modelo. El servidor los usa como llave (`esperado[medio]`,
    `NIVELES.index(nivel)`), así que un valor inventado es un 500, no un dato raro."""
    from app.api.v1.endpoints.wms_cubicaje import NIVELES
    from app.infrastructure.models.pos import MedioPagoPOS
    medios = [m.value for m in MedioPagoPOS]
    return {
        ("pos_pago", "medio"): medios,
        ("pos_devolucion", "medio_reembolso"): medios,
        ("pos_movimiento_caja", "tipo"): ["INGRESO", "EGRESO"],
        ("wms_producto_empaques", "nivel"): list(NIVELES),
    }

# Prefijo de tabla → módulo, solo para el informe. Lo que no aparece cae en
# «base» (usuarios, roles, catálogos, alertas…).
MODULO_DE_PREFIJO = [
    ("tarifax_", "tarifax"), ("grc_", "grc"), ("qms_", "qms"), ("dms_", "dms"),
    ("tms_", "tms"), ("fletes", "tms"), ("vehiculos_flete", "tms"),
    ("generadores_carga", "tms"), ("enturnamiento", "tms"),
    ("conductores", "tms"), ("transportadoras", "tms"), ("contratos", "tms"),
    ("eam_", "eam"), ("fleet_", "eam"), ("vehiculos", "eam"),
    ("mantenimientos_estiba", "control"), ("actividades_mantenimiento", "eam"),
    ("ags_", "ags"), ("pos_", "pos"), ("wms_", "wms"), ("hcm_", "gh"),
    ("lms_", "lms"), ("crm_", "crm"), ("mes_", "mes"), ("aps_", "aps"),
    ("erp_", "erp"), ("scm_", "scm"), ("proveedores", "scm"),
    ("tipos_proveedor", "scm"), ("sst_", "sst"), ("loca_", "locativa"),
    ("gp_", "gestion"), ("mkp_", "marketplace"),
    ("estiba", "control"), ("movimientos", "control"), ("manifiesto", "control"),
    ("clientes_manifiestos", "control"), ("codigos_dano", "control"),
    ("eventos_dano", "control"), ("ubicaciones", "control"),
]

# Ni el registro de sesiones del celular ni lo que se usa para numerar: un
# consecutivo inventado haría que el siguiente documento real choque.
EXCLUIR = re.compile(r"(^scan_sesion$|consecutivo|^alembic)")


def modulo_de(tabla: str) -> str:
    for prefijo, modulo in MODULO_DE_PREFIJO:
        if tabla.startswith(prefijo):
            return modulo
    return "base"


# ─── 1. Alta de la empresa ──────────────────────────────────────────────────

async def alta(codigo: str, nombre: str, clave: str) -> str:
    from app.core.security import hash_password
    from app.core.tenant import nombre_esquema
    from app.main import _CANDADO_MIGRACION, _migrar_esquema

    esquema = nombre_esquema(codigo)
    async with engine.begin() as conn:
        await conn.execute(text('SET search_path TO "public"'))
        cid = (await conn.execute(text(
            "SELECT id FROM public.plataforma_cliente WHERE codigo = :c"),
            {"c": codigo})).scalar()
        if cid is None:
            cid = (await conn.execute(text(
                "INSERT INTO public.plataforma_cliente "
                "(codigo, nombre, esquema, nit, activo, es_operador, created_at, updated_at) "
                "VALUES (:c, :n, :e, '900000000-1', true, false, now(), now()) RETURNING id"),
                {"c": codigo, "n": nombre, "e": esquema})).scalar()
            print(f"  empresa «{codigo}» dada de alta (id {cid})")
        else:
            print(f"  empresa «{codigo}» ya existía (id {cid})")
        # Todos los módulos: la idea es probar la aplicación entera.
        for m in MODULOS:
            ya = (await conn.execute(text(
                "SELECT 1 FROM public.plataforma_modulo_cliente "
                "WHERE cliente_id = :c AND modulo = :m"), {"c": cid, "m": m.clave})).scalar()
            if not ya:
                await conn.execute(text(
                    "INSERT INTO public.plataforma_modulo_cliente (cliente_id, modulo, activo, desde) "
                    "VALUES (:c, :m, true, current_date)"), {"c": cid, "m": m.clave})

    # El mismo candado del arranque: si el servidor se reinicia mientras tanto
    # (con recarga automática basta guardar un archivo), los dos migrarían el
    # esquema a la vez y la base corta a uno por interbloqueo.
    async with engine.begin() as candado:
        await candado.execute(text(f"SELECT pg_advisory_lock({_CANDADO_MIGRACION})"))
        try:
            await _migrar_esquema(esquema)
        finally:
            await candado.execute(text(f"SELECT pg_advisory_unlock({_CANDADO_MIGRACION})"))

    async with engine.begin() as conn:
        await conn.execute(text(f'SET search_path TO "{esquema}"'))
        ya = (await conn.execute(text(
            "SELECT 1 FROM usuarios WHERE username = 'admin'"))).scalar()
        if not ya:
            await conn.execute(text(
                "INSERT INTO usuarios (nombre, apellido, email, username, hashed_password, "
                "rol, rol_id, activo, created_at, updated_at) VALUES ('Administrador', 'Carga', "
                "'admin@carga.example.com', 'admin', :h, 'ADMINISTRADOR', "
                "(SELECT id FROM roles WHERE nombre = 'ADMINISTRADOR'), true, now(), now())"),
                {"h": hash_password(clave)})
            print("  usuario «admin» creado")
        # Usuarios de operación, con la misma clave, para probar sesiones
        # concurrentes contra el servidor; y los del portal 3PL aparte, porque
        # quien queda ligado a un depositante solo puede ver su portal.
        if (await conn.execute(text("SELECT count(*) FROM usuarios"))).scalar() < 2:
            h = hash_password(clave)
            roles = ["SUPERVISOR_LOGISTICO", "OPERADOR_BODEGA", "AUDITOR", "CONSULTA"]
            cuentas = [(f"usuario{k:03d}", roles[k % len(roles)]) for k in range(1, USUARIOS + 1)]
            cuentas += [(f"portal{k:03d}", "CONSULTA") for k in range(1, USUARIOS_PORTAL + 1)]
            for k, (username, rol) in enumerate(cuentas, start=1):
                await conn.execute(text(
                    "INSERT INTO usuarios (nombre, apellido, email, username, hashed_password, "
                    "rol, rol_id, activo, created_at, updated_at) VALUES (:n, :a, :e, :u, :h, "
                    "CAST(:r AS VARCHAR), (SELECT id FROM roles WHERE nombre = CAST(:r AS VARCHAR)), "
                    "true, now(), now())"),
                    {"n": NOMBRES[k % len(NOMBRES)], "a": APELLIDOS[k * 7 % len(APELLIDOS)],
                     "e": f"{username}@carga.example.com", "u": username, "h": h, "r": rol})
            print(f"  {USUARIOS} usuarios de operación (usuario001…usuario{USUARIOS:03d}) y "
                  f"{USUARIOS_PORTAL} del portal 3PL (portal001…)")
    return esquema


# ─── 2. Generadores coherentes ──────────────────────────────────────────────

async def vacia(db, tabla: str) -> bool:
    return not (await db.execute(text(f'SELECT EXISTS (SELECT 1 FROM "{tabla}")'))).scalar()


async def generadores(esquema: str, desde: date, hasta: date, solo: set) -> dict:
    from app.core import (demo_crm, demo_dms, demo_hcm, demo_qms, demo_scm,
                          demo_tms, demo_wms, erp_demo)

    # (clave, tabla que dice si ya se sembró, cómo sembrar, cómo comprobar).
    # El orden importa: el TMS asigna sus viajes a conductores de Gestión Humana.
    pasos = [
        ("gh", "hcm_colaborador",
         lambda db: demo_hcm.sembrar_hcm(db, desde=desde, hasta=hasta, esquema=esquema, avisar=print),
         demo_hcm.verificar),
        ("tms", "tms_viaje",
         lambda db: demo_tms.sembrar_tms(db, desde=desde, hasta=hasta, viajes_por_dia_habil=18,
                                         esquema=esquema, avisar=print),
         demo_tms.verificar),
        ("dms", "dms_documento",
         lambda db: demo_dms.sembrar_dms(db, desde=desde, hasta=hasta, documentos_por_semana=100,
                                         esquema=esquema, avisar=print),
         demo_dms.verificar),
        ("qms", "qms_proceso",
         lambda db: demo_qms.sembrar_qms(db, desde=desde, hasta=hasta, esquema=esquema, avisar=print),
         demo_qms.verificar),
        ("crm", "crm_cliente",
         lambda db: demo_crm.sembrar_crm(db, desde=desde, hasta=hasta, leads_por_semana=100,
                                         esquema=esquema, avisar=print),
         demo_crm.verificar),
        ("scm", "scm_solicitudes_compra",
         lambda db: demo_scm.sembrar_scm(db, desde=desde, hasta=hasta, solicitudes_por_semana=100,
                                         esquema=esquema, avisar=print),
         demo_scm.verificar),
        ("wms", "wms_productos",
         lambda db: demo_wms.sembrar_wms(db, desde=desde, hasta=hasta, salidas_por_dia_habil=18,
                                         esquema=esquema, avisar=print),
         demo_wms.verificar),
        ("erp", "erp_comprobantes",
         lambda db: erp_demo.sembrar_volumen(db, desde=desde, hasta=hasta, terceros=500,
                                             facturas_por_dia_habil=18, esquema=esquema,
                                             avisar=print),
         None),
    ]
    informe = {}
    for clave, tabla, sembrar, comprobar in pasos:
        if solo and clave not in solo:
            continue
        async with AsyncSession(engine, expire_on_commit=False) as db:
            await db.execute(text(f'SET search_path TO "{esquema}"'))
            if not await vacia(db, tabla):
                print(f"\n«{clave}»: ya sembrado, se deja como está")
                continue
            print(f"\n«{clave}»: sembrando con su generador…")
            t0 = time.monotonic()
            try:
                await sembrar(db)
                await db.commit()
            except Exception as e:                                  # noqa: BLE001
                await db.rollback()
                print(f"  FALLÓ: {type(e).__name__}: {str(e)[:300]}")
                informe[clave] = f"falló: {type(e).__name__}"
                continue
            await db.execute(text(f'SET search_path TO "{esquema}"'))
            v = await comprobar(db) if comprobar else {}
            informe[clave] = f"{time.monotonic() - t0:.0f} s"
            for k, val in v.items():
                print(f"  {k:28s} {val:>14,.2f}")
    return informe


# ─── 3. Relleno guiado por el esquema ───────────────────────────────────────

NOMBRES = ("Andrés Camila Juan Valentina Carlos Daniela Luis Mariana Jorge Laura "
           "Felipe Natalia Santiago Paula Diego Sofía Alejandro Juliana Mateo Carolina "
           "Sebastián Diana Ricardo Lorena Óscar Ximena Hernán Gloria Wilson Patricia").split()
APELLIDOS = ("Rodríguez Gómez González Martínez López García Pérez Sánchez Ramírez Torres "
             "Díaz Vargas Moreno Rojas Jiménez Herrera Castro Ortiz Muñoz Suárez Romero "
             "Ríos Mejía Cárdenas Ospina Restrepo Zapata Quintero Arango Salazar").split()
CIUDADES = ("Bogotá Medellín Cali Barranquilla Cartagena Bucaramanga Pereira Manizales "
            "Cúcuta Ibagué Santa Marta Villavicencio Pasto Neiva Armenia Montería Tunja "
            "Popayán Sincelejo Valledupar Buenaventura Funza Mosquera Yumbo").split(" ")
DEPARTAMENTOS = ("Cundinamarca Antioquia Valle Atlántico Bolívar Santander Risaralda "
                 "Caldas Tolima Meta Nariño Huila Quindío Córdoba Boyacá Cauca").split()
EMPRESAS_RAIZ = ("Andina Logística Pacífico Caribe Orión Cóndor Altiplano Nexo Vértice "
                 "Cordillera Delta Horizonte Atlas Magdalena Sabana Aurora Faro Titán Prisma "
                 "Cumbre").split()
EMPRESAS_TIPO = ("S.A.S.", "Ltda.", "S.A.", "& Cía. S.A.S.", "Group S.A.S.")
PALABRAS = ("revisión entrega bodega carga despacho inventario estiba muelle ruta cliente "
            "proveedor calidad mantenimiento preventivo correctivo inspección turno operación "
            "lote pedido orden factura soporte cumplimiento auditoría riesgo control "
            "documento vehículo conductor almacén zona ubicación conteo recepción "
            "capacitación seguimiento novedad ajuste programación planta línea").split()
PERSONAS = re.compile(r"(usuario|colaborador|conductor|personal|contacto|estudiante|"
                      r"empleado|tecnico|instructor|participante|asistente|miembro|"
                      r"responsable|cliente_pos|aprendiz|paciente|trabajador)")
COMPANIAS = re.compile(r"(proveedor|cliente|empresa|transportadora|tercero|aseguradora|"
                       r"contratista|depositante|generador|aliado|laboratorio)")
ESTADOS = ["ACTIVO", "PENDIENTE", "EN_PROCESO", "CERRADO"]
PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "CRITICA"]
DESPUES = re.compile(r"(fin|cierre|cerrad|vence|vencimiento|hasta|salida|entrega|"
                     r"completad|resuelt|terminad|real|devoluc|actualizad|updated)")
BORRADO = re.compile(r"(deleted|eliminad|borrad|anulad|fecha_baja|dado_de_baja|is_deleted)")
# Calificaciones de matriz de riesgo y encuestas: de 1 a 5, no de 1 a 500.
ESCALA = re.compile(r"(probabilidad|impacto|severidad|ocurrencia|deteccion|calificacion|"
                    r"puntaje|likelihood|satisfaccion|criticidad|valoracion)")


def opciones_documentadas() -> dict:
    """{(tabla, columna): [valores]} leídos de los comentarios de los modelos.

    Los modelos documentan los valores válidos de sus columnas de texto en un
    comentario al final de la línea (`# ABIERTO / CERRADO`). Usarlos es lo que
    hace que los filtros y las insignias de la interfaz tengan algo que mostrar.
    """
    raiz = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "app", "infrastructure", "models")
    col = re.compile(r"^\s*(\w+)\s*=\s*Column\(.*#\s*(.+)$")
    tab = re.compile(r"""__tablename__\s*=\s*["'](\w+)["']""")
    valor = re.compile(r"^[A-Z][A-Z0-9_]{1,40}$")
    salida = {}
    for ruta in glob(os.path.join(raiz, "*.py")):
        tabla = None
        with open(ruta, encoding="utf-8") as f:
            for linea in f:
                m = tab.search(linea)
                if m:
                    tabla = m.group(1)
                    continue
                m = col.match(linea)
                if m and tabla:
                    vals = [v.strip() for v in re.split(r"[,/|]", m.group(2))]
                    vals = [v for v in vals if valor.match(v)]
                    if len(vals) >= 2:
                        salida[(tabla, m.group(1))] = vals
    return salida


def opciones_por_defecto() -> dict:
    """{(tabla, columna): valor} con el `default=` de texto de cada modelo."""
    from app.infrastructure.models.base import Base
    salida = {}
    for t in Base.metadata.tables.values():
        for c in t.columns:
            d = c.default
            if d is not None and getattr(d, "is_scalar", False) and isinstance(d.arg, str):
                salida[(t.name, c.name)] = d.arg
            elif d is not None and getattr(d, "is_callable", False) \
                    and isinstance(c.type, T.JSON):
                # default=list / default=dict: el JSON que la aplicación espera.
                try:
                    v = d.arg(None)
                except Exception:                                   # noqa: BLE001
                    continue
                if isinstance(v, (list, dict)):
                    salida[(t.name, c.name)] = v
    return salida


def sigla(tabla: str) -> str:
    partes = [p for p in tabla.split("_") if p]
    return "".join(p[0] for p in partes[1:] or partes).upper()[:4] or "X"


def etiqueta(tabla: str) -> str:
    partes = tabla.split("_")
    base = partes[1:] if len(partes) > 1 else partes
    return " ".join(base).capitalize()


class Generador:
    def __init__(self, esquema, desde, hasta, documentadas, por_defecto):
        self.esquema = esquema
        self.desde = desde
        self.dias = max(1, (hasta - desde).days)
        self.az = random.Random(SEMILLA)
        self.documentadas = documentadas
        self.por_defecto = por_defecto

    # Cada fila tiene una fecha base: las columnas de «fin» caen después de ella
    # y así un cierre no queda antes de su apertura.
    def fecha_base(self) -> datetime:
        d = self.desde + timedelta(days=self.az.randrange(self.dias))
        return datetime.combine(d, hora(self.az.randint(6, 19), self.az.randrange(60)))

    def momento(self, nombre: str, base: datetime) -> datetime:
        if DESPUES.search(nombre):
            return base + timedelta(days=self.az.randint(0, 30), hours=self.az.randint(1, 8))
        return base

    def texto(self, tabla, nombre, largo, i, unico, base):
        az = self.az
        n = nombre.lower()
        if (tabla, nombre) in VALORES_FIJOS:
            # Únicos que llevan uno de estos (nivel por producto) los resuelve
            # el reintento de fila: no se les pega sufijo.
            return az.choice(VALORES_FIJOS[(tabla, nombre)])
        if n == "periodo" or n.endswith("_periodo"):
            v = f"{base.year}-{base.month:02d}"
            return v if not unico else f"{v}-{i}"[:largo or None]
        if (tabla, nombre) in self.documentadas and not unico:
            v = az.choice(self.documentadas[(tabla, nombre)])
        elif (tabla, nombre) in self.por_defecto and isinstance(self.por_defecto[(tabla, nombre)], str) \
                and not unico and n in ("estado", "tipo", "prioridad", "nivel", "clase",
                                        "categoria", "moneda", "unidad", "origen", "canal"):
            v = self.por_defecto[(tabla, nombre)]
            if n == "estado" and az.random() < 0.6:
                v = az.choice(ESTADOS + [v])
            elif n == "prioridad":
                v = az.choice(PRIORIDADES)
        elif "email" in n or "correo" in n:
            v = (f"{az.choice(NOMBRES)}.{az.choice(APELLIDOS)}{i}@carga.example.com").lower()
        elif any(k in n for k in ("telefono", "celular", "movil", "whatsapp")):
            v = "3" + "".join(az.choice(string.digits) for _ in range(9))
        elif any(k in n for k in ("nit", "cedula", "identificacion", "num_documento",
                                  "numero_documento", "documento_identidad")):
            v = str(10_000_000 + i * 7919 % 89_999_999)
        elif "placa" in n:
            v = "".join(az.choice(string.ascii_uppercase) for _ in range(3)) + f"{i % 1000:03d}"
        elif "departamento" in n:
            v = az.choice(DEPARTAMENTOS)
        elif any(k in n for k in ("ciudad", "municipio", "origen", "destino")):
            v = az.choice(CIUDADES)
        elif n == "pais":
            v = "Colombia"
        elif "direccion" in n:
            v = f"Calle {az.randint(1, 180)} # {az.randint(1, 99)}-{az.randint(1, 99)}"
        elif n in ("apellido", "apellidos"):
            v = f"{az.choice(APELLIDOS)} {az.choice(APELLIDOS)}"
        elif n in ("nombre", "nombres", "nombre_completo", "razon_social") or n.startswith("nombre_"):
            if PERSONAS.search(tabla) or n.startswith("nombre_contacto") or "responsable" in n:
                v = f"{az.choice(NOMBRES)} {az.choice(APELLIDOS)}"
            elif COMPANIAS.search(tabla) or n == "razon_social":
                v = f"{az.choice(EMPRESAS_RAIZ)} {az.choice(EMPRESAS_RAIZ)} {az.choice(EMPRESAS_TIPO)}"
            else:
                v = f"{etiqueta(tabla)} {az.choice(PALABRAS)} {i}"
        elif any(k in n for k in ("codigo", "referencia", "sku", "numero", "consecutivo",
                                  "serial", "serie", "radicado", "folio", "lote")):
            v = f"{sigla(tabla)}-{i:06d}"
        elif any(k in n for k in ("titulo", "asunto", "nombre")):
            v = f"{az.choice(PALABRAS).capitalize()} de {az.choice(PALABRAS)} {i}"
        elif any(k in n for k in ("url", "ruta", "archivo", "path", "enlace", "foto", "imagen", "logo")):
            v = f"/uploads/carga/{sigla(tabla).lower()}/{i}.pdf"
        elif "color" in n:
            v = "#%06x" % az.randrange(0xFFFFFF)
        elif n == "moneda":
            v = "COP"
        elif "unidad" in n:
            v = az.choice(["UND", "KG", "CAJA", "M3", "LT", "M", "PAR"])
        elif n == "estado":
            v = az.choice(ESTADOS)
        elif n == "prioridad":
            v = az.choice(PRIORIDADES)
        elif any(k in n for k in ("hash", "token", "huella", "firma")):
            v = uuid.UUID(int=az.getrandbits(128)).hex
        elif n in ("tipo", "clase", "categoria", "nivel", "canal", "modalidad"):
            v = az.choice(["GENERAL", "ESPECIAL", "ESTANDAR", "URGENTE"])
        elif n in ("rol",):
            v = az.choice(["ADMINISTRADOR", "SUPERVISOR", "OPERADOR", "CONSULTA"])
        else:
            v = " ".join(az.choice(PALABRAS) for _ in range(az.randint(3, 12))).capitalize()
        if unico and not v.endswith(f"{i:06d}"):
            sufijo = f"-{i}"
            v = (v[: max(0, (largo or 200) - len(sufijo))] + sufijo) if largo else v + sufijo
        return v[:largo] if largo else v

    def valor(self, tabla, col, i, unico, base):
        """Un valor que la columna acepta, o `NotImplemented` si no se sabe."""
        az = self.az
        tipo = col.type
        n = col.name.lower()

        # Una fila con fecha de borrado es una fila que la aplicación no muestra.
        if col.nullable and BORRADO.search(n) and not isinstance(tipo, T.Boolean):
            return None
        if isinstance(tipo, T.Boolean) and BORRADO.search(n):
            return False
        if isinstance(tipo, (T.Enum, PG.ENUM)) and getattr(tipo, "enums", None):
            return az.choice(list(tipo.enums))
        if isinstance(tipo, T.Boolean):
            return az.random() < (0.85 if n in ("activo", "activa", "vigente", "habilitado") else 0.5)
        if isinstance(tipo, (T.Integer,)):
            if unico:
                return i
            if "anio" in n or n in ("ano", "year", "vigencia"):
                return az.randint(self.desde.year, self.desde.year + self.dias // 365)
            if ESCALA.search(n):
                return az.randint(1, 5)
            if n == "mes" or n.endswith("_mes"):
                return az.randint(1, 12)
            if n in ("dia", "dia_semana"):
                return az.randint(1, 7 if "semana" in n else 28)
            if any(k in n for k in ("orden", "secuencia", "nivel", "version", "prioridad", "paso")):
                return az.randint(1, 10)
            if "porcentaje" in n or n.startswith("pct"):
                return az.randint(0, 100)
            if any(k in n for k in ("minutos", "horas", "dias", "duracion")):
                return az.randint(1, 120)
            return az.randint(1, 500)
        if isinstance(tipo, (T.Numeric, T.Float)):
            p = getattr(tipo, "precision", None)
            s = getattr(tipo, "scale", None)
            if isinstance(tipo, T.Float) and not isinstance(tipo, T.Numeric):
                p, s = None, None
            tope = 10 ** (p - (s or 0)) - 1 if p else 10 ** 9
            if "latitud" in n or n == "lat":
                x = az.uniform(1.2, 11.0)
            elif "longitud" in n or n in ("lng", "lon"):
                x = az.uniform(-77.5, -72.5)
            elif ESCALA.search(n):
                x = az.randint(1, 5)
            elif "porcentaje" in n or n.startswith("pct") or "tasa" in n or "cumplimiento" in n:
                x = az.uniform(0, 100)
            elif any(k in n for k in ("valor", "costo", "precio", "total", "monto", "salario",
                                      "subtotal", "importe", "tarifa", "saldo", "flete",
                                      "presupuesto", "iva", "descuento", "debito", "credito")):
                x = round(az.uniform(10_000, 5_000_000), -2)
            elif any(k in n for k in ("peso", "volumen", "cantidad", "stock", "kilometr", "horometro")):
                x = az.uniform(1, 5_000)
            else:
                x = az.uniform(0, 1_000)
            x = min(x, tope)
            if isinstance(tipo, T.Numeric) and tipo.asdecimal:
                return Decimal(str(round(x, s if s is not None else 2)))
            return float(round(x, 4))
        if isinstance(tipo, T.DateTime):
            m = self.momento(n, base)
            return m.replace(tzinfo=timezone.utc) if tipo.timezone else m
        if isinstance(tipo, T.Date):
            return self.momento(n, base).date()
        if isinstance(tipo, T.Time):
            return hora(az.randint(6, 20), az.choice((0, 15, 30, 45)))
        if isinstance(tipo, T.Interval):
            return timedelta(hours=az.randint(1, 72))
        if isinstance(tipo, (T.JSON, PG.JSON, PG.JSONB)):
            v = self.por_defecto.get((tabla, col.name))
            if not isinstance(v, (list, dict)):
                v = None if col.nullable else {}
            return None if v is None else json.dumps(v)
        if isinstance(tipo, (PG.UUID, T.Uuid)):
            return uuid.UUID(int=az.getrandbits(128))
        if isinstance(tipo, T.ARRAY):
            return []
        if isinstance(tipo, (T.String, T.Text)):
            return self.texto(tabla, col.name, getattr(tipo, "length", None), i, unico, base)
        if isinstance(tipo, T.LargeBinary):
            return None if col.nullable else b""
        return NotImplemented


async def esquema_reflejado(esquema: str):
    md = MetaData()
    async with engine.connect() as conn:
        await conn.run_sync(lambda c: md.reflect(c, schema=esquema))
        particiones = set((await conn.execute(text(
            "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = :e AND c.relispartition"), {"e": esquema})).scalars())
        # Los únicos de la base, no los del modelo: las migraciones crean índices
        # que los modelos no declaran, y un COPY que choca con uno pierde la tabla.
        # La llave primaria entra también: cuando no es autoincremental (uno a
        # uno con su padre) es un único más que el generador debe respetar.
        unicos = defaultdict(list)
        for tabla, cols, definicion in (await conn.execute(text("""
            SELECT t.relname, array_agg(a.attname ORDER BY k.ord),
                   pg_get_indexdef(i.indexrelid)
            FROM pg_index i
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN unnest(i.indkey) WITH ORDINALITY k(attnum, ord) ON true
            LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
            WHERE n.nspname = :e AND i.indisunique
            GROUP BY i.indexrelid, t.relname
        """), {"e": esquema})).all():
            if all(cols):
                unicos[tabla].append(tuple(cols))
            else:
                # Índice por expresión (`COALESCE(almacen_id, 0)`): se toman las
                # columnas que menciona. Es más estricto que el índice, y basta.
                unicos[tabla].append(("expr", definicion))
    tablas = {t.name: t for t in md.tables.values() if t.name not in particiones}
    for nombre, grupos in unicos.items():
        if nombre not in tablas:
            continue
        resueltos = []
        for g in grupos:
            if g[0] == "expr":
                cuerpo = g[1].split(" USING ", 1)[-1]
                g = tuple(c.name for c in tablas[nombre].columns
                          if re.search(rf"\b{re.escape(c.name)}\b", cuerpo))
            if g:
                resueltos.append(g)
        unicos[nombre] = resueltos
    return tablas, unicos


def orden_de_llenado(tablas: dict) -> list:
    """Padres antes que hijos. En un ciclo se rompe por una llave anulable."""
    deps = {}
    for nombre, t in tablas.items():
        deps[nombre] = {fk.referred_table.name for fk in t.foreign_key_constraints
                        if fk.referred_table.name in tablas and fk.referred_table.name != nombre}
    hechas, orden = set(), []
    pendientes = set(tablas)
    while pendientes:
        listas = sorted(n for n in pendientes if deps[n] <= hechas)
        if not listas:
            # Ciclo: entra la que menos dependencias pendientes tenga.
            listas = [min(sorted(pendientes), key=lambda n: len(deps[n] - hechas))]
        for n in listas:
            orden.append(n)
            hechas.add(n)
            pendientes.discard(n)
    return orden


def guess_destino(tabla: str, columna: str, tablas: dict):
    """La tabla a la que apunta un `<algo>_id` declarado sin llave foránea."""
    raiz = columna[:-3]
    prefijo = tabla.split("_")[0] + "_"
    candidatos = [t for t in tablas if t in (raiz, raiz + "s", raiz + "es")
                  or t.endswith("_" + raiz) or t.endswith("_" + raiz + "s")
                  or t.endswith("_" + raiz + "es")]
    propios = [t for t in candidatos if t.startswith(prefijo)]
    elegido = (propios or candidatos or [None])[0]
    if elegido and "id" in tablas[elegido].columns:
        return elegido
    return None


async def rellenar(esquema: str, desde: date, hasta: date, filas: int, maestros: int,
                   solo: set) -> dict:
    tablas, unicos = await esquema_reflejado(esquema)
    VALORES_FIJOS.update(valores_fijos())
    gen = Generador(esquema, desde, hasta, opciones_documentadas(), opciones_por_defecto())
    referenciadas = {fk.referred_table.name for t in tablas.values()
                     for fk in t.foreign_key_constraints if fk.referred_table.name != t.name}
    cache_llaves: dict = {}
    informe = {}

    async with engine.connect() as conn:
        await conn.execute(text(f'SET search_path TO "{esquema}"'))
        await conn.commit()
        crudo = (await conn.get_raw_connection()).driver_connection

        async def llaves(tabla_obj, columnas) -> list:
            clave = (tabla_obj.schema, tabla_obj.name, tuple(columnas))
            if clave not in cache_llaves:
                sch = tabla_obj.schema or esquema
                cols = ", ".join(f'"{c}"' for c in columnas)
                no_nulas = " AND ".join(f'"{c}" IS NOT NULL' for c in columnas)
                lista = await crudo.fetch(
                    f'SELECT {cols} FROM "{sch}"."{tabla_obj.name}" '
                    f"WHERE {no_nulas} LIMIT 20000")
                cache_llaves[clave] = [tuple(r) for r in lista]
            return cache_llaves[clave]

        for nombre in orden_de_llenado(tablas):
            t = tablas[nombre]
            modulo = modulo_de(nombre)
            if EXCLUIR.search(nombre) or (solo and modulo not in solo):
                continue
            ya = await crudo.fetchval(f'SELECT count(*) FROM "{esquema}"."{nombre}"')
            if ya:
                informe[nombre] = (modulo, ya, "existente")
                continue
            meta = maestros if nombre in referenciadas else filas

            # Columnas que el COPY no lleva: la llave autoincremental y las que
            # la base calcula.
            pk = [c.name for c in t.primary_key.columns]
            omitir = set()
            for c in t.columns:
                if c.computed is not None or c.identity is not None:
                    omitir.add(c.name)
                elif c.name in pk and len(pk) == 1 and isinstance(c.type, T.Integer) \
                        and c.server_default is not None:
                    omitir.add(c.name)

            # Llaves foráneas: cada restricción se elige como una tupla de su padre.
            grupos = []
            cubiertas = set()
            falta_padre = None
            for fk in t.foreign_key_constraints:
                locales = [c.name for c in fk.columns]
                remotas = [e.column.name for e in fk.elements]
                padre = fk.referred_table
                autorref = padre.name == nombre and (padre.schema or esquema) == esquema
                opciones = [] if autorref else await llaves(padre, remotas)
                if nombre in SOLO_PORTAL and padre.name == "usuarios":
                    opciones = [tuple(r) for r in await crudo.fetch(
                        f'SELECT {", ".join(remotas)} FROM "{esquema}".usuarios '
                        f"WHERE username LIKE 'portal%'")]
                anulable = all(t.c[c].nullable for c in locales)
                if not opciones and not anulable:
                    falta_padre = padre.name
                    break
                grupos.append((locales, opciones, anulable))
                cubiertas.update(locales)
            if falta_padre:
                informe[nombre] = (modulo, 0, f"sin filas en «{falta_padre}»")
                continue

            # `<algo>_id` sin llave foránea: se apunta a la tabla que parezca.
            adivinadas = {}
            for c in t.columns:
                if c.name.endswith("_id") and c.name not in cubiertas and c.name not in omitir \
                        and isinstance(c.type, T.Integer):
                    destino = guess_destino(nombre, c.name, tablas)
                    if destino:
                        adivinadas[c.name] = [k[0] for k in await llaves(tablas[destino], ["id"])]

            grupos_unicos = [g for g in unicos.get(nombre, [])]
            en_unico = {c for g in grupos_unicos for c in g}
            # Si un único es exactamente una llave foránea (uno a uno), no puede
            # haber más hijos que padres.
            for locales, opciones, _ in grupos:
                if tuple(locales) in grupos_unicos or tuple(sorted(locales)) in \
                        [tuple(sorted(g)) for g in grupos_unicos]:
                    meta = min(meta, len(opciones)) if opciones else meta
            vistos = defaultdict(set)
            columnas = [c for c in t.columns if c.name not in omitir]
            registros = []
            no_se = None
            intentos = 0
            i = 0
            while len(registros) < meta and intentos < meta * 3:
                intentos += 1
                i += 1
                base = gen.fecha_base()
                fila = {}
                for locales, opciones, anulable in grupos:
                    if not opciones or (anulable and gen.az.random() < 0.1):
                        for c in locales:
                            fila[c] = None
                    else:
                        tupla = gen.az.choice(opciones)
                        for c, v in zip(locales, tupla):
                            fila[c] = v
                for c in columnas:
                    if c.name in fila:
                        continue
                    if c.name in adivinadas and adivinadas[c.name]:
                        fila[c.name] = gen.az.choice(adivinadas[c.name])
                        continue
                    # Nada de nulos al azar: la aplicación llena estas columnas
                    # con su valor por omisión al crear, y sus respuestas las
                    # exigen. Un nulo inventado es un 500 que en producción no
                    # puede ocurrir. Las únicas vacías son llaves foráneas.
                    if c.name in pk and len(pk) > 1 and isinstance(c.type, T.Integer):
                        fila[c.name] = i
                        continue
                    v = gen.valor(nombre, c, i, c.name in en_unico, base)
                    if v is NotImplemented:
                        if c.nullable:
                            v = None
                        else:
                            no_se = f"{c.name}: {c.type}"
                            break
                    fila[c.name] = v
                if no_se:
                    break
                choca = False
                for g in grupos_unicos:
                    k = tuple(fila.get(c) for c in g)
                    if None not in k and k in vistos[g]:
                        choca = True
                        break
                if choca:
                    continue
                for g in grupos_unicos:
                    k = tuple(fila.get(c) for c in g)
                    if None not in k:
                        vistos[g].add(k)
                registros.append(tuple(fila[c.name] for c in columnas))

            if no_se:
                informe[nombre] = (modulo, 0, f"tipo no soportado ({no_se})")
                continue
            try:
                async with crudo.transaction():
                    await crudo.copy_records_to_table(
                        nombre, records=registros, columns=[c.name for c in columnas],
                        schema_name=esquema)
                informe[nombre] = (modulo, len(registros), "relleno")
            except Exception as e:                                  # noqa: BLE001
                informe[nombre] = (modulo, 0, f"falló: {type(e).__name__}: {str(e)[:160]}")
            # Lo recién escrito ya puede ser padre de las que siguen.
            for k in [k for k in cache_llaves if k[1] == nombre]:
                del cache_llaves[k]

        # Las secuencias de las llaves con valor explícito quedan atrás: el
        # siguiente alta desde la aplicación chocaría con la fila 1.
        for nombre, t in tablas.items():
            for c in t.primary_key.columns:
                if isinstance(c.type, T.Integer):
                    seq = await crudo.fetchval(
                        "SELECT pg_get_serial_sequence($1, $2)", f'"{esquema}"."{nombre}"', c.name)
                    if seq:
                        await crudo.execute(
                            f"SELECT setval('{seq}', GREATEST(COALESCE((SELECT max(\"{c.name}\") "
                            f'FROM "{esquema}"."{nombre}"), 0), 1))')
    return informe


def imprimir(informe: dict) -> None:
    por_modulo = defaultdict(lambda: [0, 0, 0])   # filas, tablas con datos, tablas
    problemas = []
    for tabla, (modulo, n, como) in sorted(informe.items()):
        por_modulo[modulo][0] += n
        por_modulo[modulo][1] += 1 if n else 0
        por_modulo[modulo][2] += 1
        if not n:
            problemas.append((tabla, como))
    print("\nVolumen por módulo")
    print("─" * 56)
    print(f"  {'módulo':14s} {'filas':>12s} {'tablas con datos':>20s}")
    for modulo, (n, con, todas) in sorted(por_modulo.items()):
        print(f"  {modulo:14s} {n:>12,} {con:>12d} de {todas:<4d}".replace(",", "."))
    total = sum(v[0] for v in por_modulo.values())
    print(f"  {'TOTAL':14s} {total:>12,}".replace(",", "."))
    if problemas:
        print(f"\nTablas que quedaron vacías ({len(problemas)})")
        print("─" * 56)
        for tabla, como in problemas:
            print(f"  {tabla:40s} {como}")


async def principal() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--codigo", default="carga")
    ap.add_argument("--nombre", default="Prueba de carga")
    ap.add_argument("--clave", default=os.environ.get("CLAVE_CARGA", "Carga2026*"))
    ap.add_argument("--desde", type=date.fromisoformat, default=date(2025, 1, 1))
    ap.add_argument("--hasta", type=date.fromisoformat, default=date.today())
    ap.add_argument("--filas", type=int, default=5000,
                    help="filas por tabla de movimiento en el relleno")
    ap.add_argument("--maestros", type=int, default=500,
                    help="filas por tabla que otras referencian, en el relleno")
    ap.add_argument("--solo", default="",
                    help="módulos separados por coma (gh,tms,wms…); vacío = todos")
    ap.add_argument("--sin-generadores", action="store_true")
    ap.add_argument("--sin-relleno", action="store_true")
    args = ap.parse_args()
    solo = {s.strip() for s in args.solo.split(",") if s.strip()}

    t0 = time.monotonic()
    print("Alta de la empresa de prueba…")
    esquema = await alta(args.codigo, args.nombre, args.clave)
    if not args.sin_generadores:
        await generadores(esquema, args.desde, args.hasta, solo)
    if not args.sin_relleno:
        print(f"\nRelleno guiado por el esquema de «{esquema}»…")
        informe = await rellenar(esquema, args.desde, args.hasta, args.filas,
                                 args.maestros, solo)
        imprimir(informe)
    print(f"\nListo en {time.monotonic() - t0:.0f} s. Entrar con empresa «{args.codigo}», "
          f"usuario «admin».")
    await engine.dispose()


asyncio.run(principal())
