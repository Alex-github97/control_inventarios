"""Datos temporales para probar el asistente de reuniones en el navegador
(frontend/tools/probar_reuniones.cjs).

    python tests/datos_reuniones_navegador.py crear       → imprime JSON con usuario, clave y reunión a revisar
    python tests/datos_reuniones_navegador.py audio <id>  → duración del audio armado de una reunión
    python tests/datos_reuniones_navegador.py borrar      → borra todo lo creado

Crea en cli_acme un administrador temporal, un cliente con dos contactos y una
reunión ya transcrita, POR_REVISAR, con su propuesta (el servidor de
desarrollo no tiene clave de OpenAI, así que la revisión se prueba sobre esto).
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, select, text, update

import app.main  # noqa: F401 — registra los modelos
from app.core.database import AsyncSessionLocal
from app.core.reuniones import audio
from app.core.security import hash_password
from app.infrastructure.models.crm import CRMActividad, CRMCliente, CRMContacto, CRMInteraccion
from app.infrastructure.models.crm_reuniones import (
    CRMReunion, CRMReunionCompromiso, CRMReunionParticipante, CRMReunionTramo,
)

ESQUEMA = "cli_acme"
USUARIO, CLAVE = "prueba_reuniones", "una frase de prueba para reuniones"
CODIGO = "NAVREU"


async def crear():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
        await borrar_en(db)
        uid = (await db.execute(text(
            """INSERT INTO usuarios (nombre, apellido, email, username, hashed_password, rol, activo,
                                     intentos_fallidos, bloqueado, created_at, updated_at)
               VALUES ('Lucía', 'Navegador', :e, :u, :h, 'ADMINISTRADOR', true, 0, false, now(), now())
               RETURNING id"""), {"e": f"{USUARIO}@prueba-tittanware.com", "u": USUARIO,
                                  "h": hash_password(CLAVE)})).scalar()
        cli = CRMCliente(codigo=CODIGO, razon_social="Distribuidora Navegador SAS", activo=True)
        db.add(cli)
        await db.flush()
        c1 = CRMContacto(cliente_id=cli.id, nombre="Marta Gómez", cargo="Jefe de logística", activo=True)
        c2 = CRMContacto(cliente_id=cli.id, nombre="Óscar Ruiz", activo=True)
        db.add_all([c1, c2])
        await db.flush()

        r = CRMReunion(cliente_id=cli.id, titulo="Seguimiento de despachos", origen="PRESENCIAL",
                       fecha=datetime(2026, 10, 27, 15, 0, tzinfo=timezone.utc), estado="POR_REVISAR",
                       creada_por_id=uid, aviso_texto="Aviso de prueba", aviso_confirmado_por_id=uid,
                       aviso_confirmado_en=datetime.now(timezone.utc), fuente_captura="carga_archivo",
                       resumen="Se revisaron los despachos de octubre y se acordó una nueva ventana de cargue.",
                       audio_duracion_s=95)
        db.add(r)
        await db.flush()
        yo = CRMReunionParticipante(reunion_id=r.id, usuario_id=uid, nombre="Lucía Navegador")
        pm = CRMReunionParticipante(reunion_id=r.id, contacto_id=c1.id, nombre="Marta Gómez")
        po = CRMReunionParticipante(reunion_id=r.id, contacto_id=c2.id, nombre="Óscar Ruiz")
        db.add_all([yo, pm, po])
        await db.flush()
        frases = [
            (0, "Buenas tardes, revisemos cómo van los despachos de octubre."),
            (20, "Marta: les envío el reporte de novedades el jueves."),
            (45, "Lucía: nosotros ajustamos la ventana de cargue para la próxima semana."),
            (70, "Acordamos cargar de seis a diez de la mañana desde noviembre."),
        ]
        for i, (s, t) in enumerate(frases, 1):
            db.add(CRMReunionTramo(reunion_id=r.id, orden=i, inicio_s=s, fin_s=s + 25, texto=t))
        for tipo, lado, desc, part, fecha, cita, minuto in [
            ("COMPROMISO", "CLIENTE", "Enviar el reporte de novedades", pm.id, "2026-10-29",
             "les envío el reporte de novedades el jueves", 20),
            ("COMPROMISO", "NUESTRO", "Ajustar la ventana de cargue", yo.id, None,
             "nosotros ajustamos la ventana de cargue", 45),
            ("ACUERDO", None, "Cargue de 6 a 10 a. m. desde noviembre", None, None,
             "cargar de seis a diez de la mañana desde noviembre", 70),
        ]:
            db.add(CRMReunionCompromiso(reunion_id=r.id, cliente_id=cli.id, tipo=tipo, lado=lado,
                                        descripcion=desc, participante_id=part,
                                        fecha_limite=datetime.fromisoformat(fecha).date() if fecha else None,
                                        cita=cita, minuto_s=minuto, estado="PROPUESTO"))
        await db.commit()
        print(json.dumps({"usuario": USUARIO, "clave": CLAVE, "empresa": "acme",
                          "reunion_revisar": r.id, "cliente": cli.razon_social}))


async def borrar_en(db):
    cli = (await db.execute(select(CRMCliente).where(CRMCliente.codigo == CODIGO))).scalar_one_or_none()
    if cli:
        ids = list((await db.execute(select(CRMReunion.id).where(CRMReunion.cliente_id == cli.id))).scalars())
        await db.execute(delete(CRMReunionCompromiso).where(CRMReunionCompromiso.cliente_id == cli.id))
        await db.execute(update(CRMReunion).where(CRMReunion.cliente_id == cli.id).values(interaccion_id=None))
        await db.execute(delete(CRMReunion).where(CRMReunion.cliente_id == cli.id))
        await db.execute(delete(CRMActividad).where(CRMActividad.cliente_id == cli.id))
        await db.execute(delete(CRMInteraccion).where(CRMInteraccion.cliente_id == cli.id))
        await db.execute(delete(CRMContacto).where(CRMContacto.cliente_id == cli.id))
        await db.execute(delete(CRMCliente).where(CRMCliente.id == cli.id))
        for i in ids:
            audio.borrar_todo(ESQUEMA, i)
    await db.execute(text("DELETE FROM usuarios WHERE username = :u"), {"u": USUARIO})


async def borrar():
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
        await borrar_en(db)
        await db.commit()
    print("borrado")


async def duracion(reunion_id: int):
    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
        r = await db.get(CRMReunion, reunion_id)
        print(json.dumps({"estado": r.estado, "fuente": r.fuente_captura,
                          "segundos": round(audio.duracion(Path(r.audio_ruta)), 1) if r.audio_ruta else None}))


if __name__ == "__main__":
    accion = sys.argv[1]
    asyncio.run({"crear": crear, "borrar": borrar}.get(accion, lambda: duracion(int(sys.argv[2])))())
