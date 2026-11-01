"""
Catálogo de daños de llantas para la empresa de prueba de carga, y el daño de
cada baja que todavía no lo tiene.

El generador (`sembrar_cmms.py`) anotaba el motivo de fin de vida de las bajas
pero no el daño, así que el tablero de la pila de descarte las mostraba todas
como «Sin motivo registrado». Este guion pone el catálogo (si está vacío) y
reparte las bajas sin daño entre los daños que corresponden a su motivo de fin
de vida, con las mismas proporciones que usa el generador. Es determinista:
correrlo dos veces deja lo mismo.

Uso, dentro del contenedor del backend:
    python tools/danos_descarte.py cli_carga
"""
import asyncio
import sys

# (código, nombre, severidad, acción, motivo de fin de vida al que pertenece, peso)
DANOS = [
    ("DES-NOR", "Desgaste normal", "LEVE", "DESCARTE", "DESGASTE", 70),
    ("DES-IRR", "Desgaste irregular", "MODERADO", "DESCARTE", "DESGASTE", 18),
    ("DES-PRE", "Desgaste por baja presión", "MODERADO", "DESCARTE", "DESGASTE", 12),
    ("COR-COS", "Corte en costado", "GRAVE", "DESCARTE", "CORTE", 40),
    ("COR-BAN", "Corte en banda", "GRAVE", "DESCARTE", "CORTE", 25),
    ("IMP-ABU", "Impacto / abultamiento", "GRAVE", "DESCARTE", "CORTE", 20),
    ("PER-NOR", "Perforación no reparable", "GRAVE", "DESCARTE", "CORTE", 15),
    ("SEP-CIN", "Separación de cinturones", "GRAVE", "DESCARTE", "RECHAZO", 35),
    ("DAN-TAL", "Daño en talón", "GRAVE", "DESCARTE", "RECHAZO", 25),
    ("CAR-FAT", "Carcasa fatigada", "MODERADO", "DESCARTE", "RECHAZO", 25),
    ("REP-INA", "Reparación anterior inadecuada", "MODERADO", "DESCARTE", "RECHAZO", 15),
    ("SEP-BAN", "Separación de banda", "GRAVE", "DESCARTE", "SEPARACION", 100),
]

# Palabras del nombre del motivo de fin de vida que lo identifican.
MOTIVO_POR_NOMBRE = {"DESGASTE": "desgaste", "CORTE": "corte", "RECHAZO": "rechaz", "SEPARACION": "separaci"}


def elegir(motivo: str, semilla: int) -> str:
    """El código de daño para una baja: reparto por pesos, fijo para cada llanta."""
    opciones = [(c, p) for c, _, _, _, m, p in DANOS if m == motivo] or [("DES-NOR", 1)]
    total = sum(p for _, p in opciones)
    x = (semilla * 2654435761) % total
    for codigo, peso in opciones:
        if x < peso:
            return codigo
        x -= peso
    return opciones[-1][0]


async def principal(esquema: str) -> None:
    sys.path.insert(0, "/app")
    from sqlalchemy import text
    from app.core.database import engine

    async with engine.begin() as conn:
        await conn.execute(text(f'SET LOCAL search_path TO "{esquema}"'))
        if (await conn.execute(text("SELECT count(*) FROM eam_dano_neumatico_catalogo"))).scalar() == 0:
            for codigo, nombre, sev, accion, _, _ in DANOS:
                await conn.execute(text(
                    "INSERT INTO eam_dano_neumatico_catalogo (codigo, nombre, severidad, accion, activo, created_at, updated_at) "
                    "VALUES (:c, :n, :s, :a, true, now(), now())"), {"c": codigo, "n": nombre, "s": sev, "a": accion})
        ids = {c: i for c, i in (await conn.execute(text("SELECT codigo, id FROM eam_dano_neumatico_catalogo"))).all()}
        motivos = {}
        for i, nombre in (await conn.execute(text("SELECT id, nombre FROM eam_motivo_fin_vida"))).all():
            motivos[i] = next((k for k, w in MOTIVO_POR_NOMBRE.items() if w in (nombre or "").lower()), "DESGASTE")
        filas = (await conn.execute(text(
            "SELECT id, motivo_fin_vida_id FROM eam_neumatico WHERE estado = 'BAJA' AND dano_id IS NULL"))).all()
        por_dano = {}
        for nid, motivo_id in filas:
            codigo = elegir(motivos.get(motivo_id, "DESGASTE"), nid)
            if codigo in ids:
                por_dano.setdefault(ids[codigo], []).append(nid)
        for dano_id, nids in por_dano.items():
            await conn.execute(text("UPDATE eam_neumatico SET dano_id = :d WHERE id = ANY(:ids)"),
                               {"d": dano_id, "ids": nids})
        print(f"{esquema}: {len(ids)} daños en el catálogo, {len(filas)} bajas con daño asignado")


if __name__ == "__main__":
    asyncio.run(principal(sys.argv[1] if len(sys.argv) > 1 else "cli_carga"))
