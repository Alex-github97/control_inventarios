"""
Lo que una planta de reencauche trae desde el primer día.

La ruta en frío con sus quince etapas, los defectos por zona, los motivos de
rechazo y unos límites de reparación de PLANTILLA. Todo es editable: el
objetivo es no arrancar en blanco, no imponer criterios. Los límites quedan
marcados como plantilla para que se note cuáles faltan por reemplazar con los
del fabricante.

No se siembran recetas de vulcanización: temperaturas y tiempos dependen del
fabricante de la banda y del autoclave, y un valor por defecto equivocado
vulcanizaría mal sin que nadie lo notara.

Se siembra una sola vez por empresa (`rtm_planta_config.sembrado`): si la
empresa borra un defecto, no vuelve a aparecer al reiniciar.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models.reencauche import (
    RTMDefecto, RTMEtapa, RTMLimiteReparacion, RTMMotivoRechazo, RTMPlantaConfig, RTMRuta, RTMRutaEtapa,
)

N = "NUMERO"
SI_NO = "SI_NO"

# (código, nombre, tipo, decisión, decisión final, mediciones, reparaciones,
#  insumos, tipos de equipo, obligatoria en la ruta en frío)
ETAPAS = [
    ("RECEPCION", "Recepción y registro de carcasas", "RECEPCION", False, False, [], False, [], [], True),
    ("INSP_INICIAL", "Inspección inicial y selección", "INSPECCION", True, False,
     [{"clave": "profundidad_remanente", "nombre": "Profundidad remanente", "unidad": "mm", "tipo": N}],
     False, [], ["INSPECCION", "SHEAROGRAFO"], True),
    ("DESTALONADO", "Destalonado y preparación inicial", "PROCESO", False, False, [], False, [],
     ["DESTALONADORA"], False),
    ("RASPADO", "Raspado de la banda antigua", "PROCESO", False, False,
     [{"clave": "diametro", "nombre": "Diámetro de raspado", "unidad": "mm", "tipo": N},
      {"clave": "ancho", "nombre": "Ancho de raspado", "unidad": "mm", "tipo": N},
      {"clave": "radio", "nombre": "Radio del perfil de corona", "unidad": "mm", "tipo": N}],
     False, [], ["RASPADORA"], True),
    ("INSP_RASPADO", "Inspección posterior al raspado", "INSPECCION", True, False, [], False, [],
     ["INSPECCION", "SHEAROGRAFO"], True),
    ("ESCARIADO", "Escariado y reparación", "PROCESO", False, False, [], True, ["PARCHE", "RELLENO", "COMPUESTO"],
     ["ESCARIADORA", "EXTRUSORA"], False),
    ("CEMENTADO", "Preparación de superficie y cementado", "PROCESO", False, False, [], False, ["CEMENTO"],
     ["CEMENTADORA"], True),
    ("PREP_BANDA", "Preparación y corte de banda y cojín", "PROCESO", False, False,
     [{"clave": "longitud_banda", "nombre": "Longitud de banda cortada", "unidad": "m", "tipo": N}],
     False, ["BANDA", "COJIN"], ["CORTADORA"], True),
    ("EMBANDADO", "Embandado o armado", "PROCESO", False, False,
     [{"clave": "centrado", "nombre": "Desviación de centrado", "unidad": "mm", "tipo": N}],
     False, [], ["EMBANDADORA"], True),
    ("ENVELOPADO", "Envelopado y prueba de vacío", "PROCESO", False, False,
     [{"clave": "vacio_conforme", "nombre": "Conserva el vacío", "unidad": "", "tipo": SI_NO}],
     False, [], ["ENVELOPADORA"], True),
    ("VULCANIZACION", "Vulcanización en autoclave", "VULCANIZACION", False, False, [], False, [], ["AUTOCLAVE"], True),
    ("DESENVELOPADO", "Desenvelopado, enfriamiento e inspección posterior a la vulcanización", "INSPECCION",
     True, False, [], False, [], ["INSPECCION"], True),
    ("INSP_FINAL", "Inspección final y control de calidad", "INSPECCION", True, True,
     [{"clave": "profundidad_final", "nombre": "Profundidad de labrado final", "unidad": "mm", "tipo": N}],
     False, [], ["INSPECCION"], True),
    ("ACABADOS", "Acabados y correcciones autorizadas", "PROCESO", False, False, [], False, [], ["ACABADO"], True),
    ("MARCACION", "Marcación y almacenamiento", "PROCESO", False, False, [], False, [], ["ACABADO"], True),
]

DEFECTOS = {
    "BANDA": ["Desgaste irregular", "Desgaste excesivo", "Desgaste localizado", "Corte", "Perforación",
              "Desprendimiento de caucho", "Objeto incrustado", "Rodamiento con baja presión",
              "Daño por frenada o bloqueo"],
    "HOMBROS": ["Separación de caucho", "Grieta", "Deformación", "Desprendimiento", "Daño por impacto",
                "Sobrecalentamiento"],
    "COSTADOS": ["Corte profundo", "Abultamiento", "Grieta", "Daño por impacto", "Abrasión", "Lonas expuestas",
                 "Cuerdas deterioradas", "Reparación anterior", "Deformación estructural"],
    "TALONES": ["Alambre de talón dañado", "Deformación", "Corrosión", "Separación", "Daño por montaje",
                "Desgarro", "Quemadura"],
    "INTERIOR": ["Liner dañado", "Daño por rodamiento desinflado", "Arrugas internas", "Separación de componentes",
                 "Ampolla", "Corte", "Perforación", "Humedad", "Contaminación por lubricantes",
                 "Reparación interna anterior", "Calentamiento excesivo"],
    "CARCASA_RASPADA": ["Separación de cinturones", "Cables expuestos", "Oxidación", "Perforación", "Corte",
                        "Grieta", "Cavidad", "Daño en hombros", "Zona de calentamiento"],
}

MOTIVOS = [
    "Separación estructural de cinturones", "Daños graves en lonas",
    "Cables metálicos rotos o expuestos en zona no reparable", "Deformación permanente", "Daño severo en talones",
    "Rodamiento prolongado desinflado", "Deterioro térmico de la carcasa", "Daño interno fuera de límites de reparación",
    "Reparación anterior inadecuada", "Carcasa fuera de especificación dimensional",
    "Envejecimiento que compromete la integridad", "Defecto de vulcanización", "Falla de adherencia de la banda",
]

# (ubicación, tipo de daño, tamaño máximo en mm). PLANTILLA: reemplazar por los
# límites del fabricante de la carcasa y del sistema de reparación.
LIMITES = [
    ("CORONA", "PERFORACION", 10), ("CORONA", "CORTE", 40), ("HOMBRO", "PERFORACION", 6), ("HOMBRO", "CORTE", 25),
    ("COSTADO", "PERFORACION", 6), ("COSTADO", "CORTE", 25), ("TALON", "CORTE", 0), ("INTERIOR", "CORTE", 20),
]


def codigo_de(nombre: str, prefijo: str) -> str:
    import unicodedata
    plano = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().upper()
    palabras = [p for p in plano.replace(",", " ").replace(".", " ").split() if len(p) > 2][:3]
    return (prefijo + "-" + "-".join(p[:6] for p in palabras))[:30]


async def config(db: AsyncSession) -> RTMPlantaConfig:
    cfg = (await db.execute(select(RTMPlantaConfig).order_by(RTMPlantaConfig.id).limit(1))).scalar()
    if cfg is None:
        cfg = RTMPlantaConfig(prefijo_codigo="RT-", consecutivo=0, cargo_inspeccion=0)
        db.add(cfg)
        await db.flush()
    return cfg


async def sembrar(db: AsyncSession) -> bool:
    """Siembra lo que falte la primera vez. Devuelve si sembró."""
    cfg = await config(db)
    if cfg.sembrado:
        return False
    existentes = {c for (c,) in (await db.execute(select(RTMEtapa.codigo))).all()}
    etapas = {}
    for (cod, nombre, tipo, dec, dec_final, med, rep, ins, eq, _) in ETAPAS:
        if cod in existentes:
            etapas[cod] = (await db.execute(select(RTMEtapa).where(RTMEtapa.codigo == cod))).scalar_one()
            continue
        e = RTMEtapa(codigo=cod, nombre=nombre, tipo=tipo, decision=dec, decision_final=dec_final, mediciones=med,
                     reparaciones=rep, insumos=ins, tipos_equipo=eq, activo=True)
        db.add(e)
        etapas[cod] = e
    await db.flush()
    if (await db.execute(select(RTMRuta.id).where(RTMRuta.codigo == "FRIO"))).first() is None:
        ruta = RTMRuta(codigo="FRIO", nombre="Reencauche en frío (banda precurada)", por_defecto=True, activo=True,
                       descripcion="Las quince etapas, de la recepción a la marcación, con autoclave.")
        db.add(ruta)
        await db.flush()
        for i, fila in enumerate(ETAPAS, start=1):
            db.add(RTMRutaEtapa(ruta_id=ruta.id, etapa_id=etapas[fila[0]].id, secuencia=i, obligatoria=fila[9]))
    hechos = {c for (c,) in (await db.execute(select(RTMDefecto.codigo))).all()}
    for zona, nombres in DEFECTOS.items():
        for n in nombres:
            cod = codigo_de(n, zona[:3])
            if cod not in hechos:
                db.add(RTMDefecto(codigo=cod, nombre=n, zona=zona, activo=True))
                hechos.add(cod)
    hechos = {c for (c,) in (await db.execute(select(RTMMotivoRechazo.codigo))).all()}
    for n in MOTIVOS:
        cod = codigo_de(n, "MR")
        if cod not in hechos:
            db.add(RTMMotivoRechazo(codigo=cod, nombre=n, activo=True))
            hechos.add(cod)
    hechos = {(u, t) for u, t in (await db.execute(select(RTMLimiteReparacion.ubicacion,
                                                          RTMLimiteReparacion.tipo_dano))).all()}
    for u, t, mm in LIMITES:
        if (u, t) not in hechos:
            db.add(RTMLimiteReparacion(ubicacion=u, tipo_dano=t, tamano_max_mm=mm, plantilla=True))
    cfg.sembrado = True
    await db.flush()
    return True
