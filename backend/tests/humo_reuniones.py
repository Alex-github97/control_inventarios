"""Escenarios de los specs crm/* del asistente de reuniones, contra la app
entera (HTTP interno, con middleware de sesión y de módulos) y la cola real.

OpenAI se reemplaza por un doble: las pruebas no gastan ni dependen de la red.
El audio sí es real (ffmpeg), generado con tonos de 8 s y silencios de 1,2 s:
así se puede comprobar que ningún corte cae a mitad de un «tono» (una frase).

Crea un cliente temporal en el esquema y lo borra al final con todo lo suyo.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_reuniones.py
"""
import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import delete, func, select, text, update

import app.main as m
from app.core import acceso_modulos
from app.core.database import AsyncSessionLocal
from app.core.dependencies import get_current_user
from app.core.reuniones import audio, cola, ia, servicio
from app.core.reuniones.ia import ItemExtraido, ResultadoReunion
from app.core.sesiones import token_de_herramienta
from app.infrastructure.models.crm import CRMActividad, CRMCliente, CRMContacto, CRMInteraccion
from app.infrastructure.models.crm_reuniones import (
    CRMReunion, CRMReunionCompromiso, CRMReunionTrabajo, CRMReunionTramo,
)

ESQUEMA, CODIGO = "cli_acme", "acme"
X = "HR%d" % (int(time.time()) % 100000)
API = "/api/v1/crm/reuniones"
fallos = []
TMP = Path(tempfile.mkdtemp(prefix="reuniones_"))


def ok(cond, nombre, extra=""):
    print(("  ok  " if cond else "FALLA ") + nombre + (("  ->  " + str(extra)) if extra != "" else ""))
    if not cond:
        fallos.append(nombre)


# ── Usuario de la prueba (se cambia el perfil entre escenarios) ───────────────
class UsuarioFalso:
    id = 1
    username = "admin"
    nombre = "Ana"
    apellido = "Prueba"
    rol_id = None
    rol = "ADMINISTRADOR"
    email = "admin@prueba-tittanware.com"
    activo = True
    permisos = {}


YO = UsuarioFalso()
m.app.dependency_overrides[get_current_user] = lambda: YO


def perfil(rol, permisos):
    YO.rol, YO.permisos = rol, permisos


# ── El doble de OpenAI ─────────────────────────────────────────────────────────
class MotorFalso:
    def __init__(self):
        self.llamadas = 0
        self.fallar = False
        self.resultado = ResultadoReunion(resumen="Sin novedades.", items=[])
        self.textos = {}           # nombre del trozo -> texto; si no, «frase N»
        self.claves_vistas = []

    def transcribir(self, ruta, palabras_clave):
        if self.fallar:
            raise ConnectionError("servicio de transcripción caído")
        self.llamadas += 1
        self.claves_vistas = palabras_clave
        return self.textos.get(ruta.name, f"frase {ruta.stem}")

    def extraer(self, transcripcion, contexto):
        if self.fallar:
            raise ConnectionError("servicio de extracción caído")
        self.contexto = contexto
        return self.resultado

    def credencial_vivo(self):
        return {"valor": "ek_prueba", "vence": 0}


MOTOR = MotorFalso()


# ── Audio de prueba ────────────────────────────────────────────────────────────
PERIODO, TONO = 9.2, 8.0     # 8 s de «voz», 1,2 s de silencio


def generar(nombre, segundos, formato="webm"):
    destino = TMP / f"{nombre}.{formato}"
    expr = f"if(lt(mod(t\\,{PERIODO})\\,{TONO})\\,0.5*sin(2*PI*440*t)\\,0)"
    codec = ["-c:a", "libopus", "-b:a", "24k"] if formato in ("webm", "ogg") else []
    subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-f", "lavfi", "-i",
                    f"aevalsrc={expr}:s=16000:d={segundos}", "-ac", "1", *codec, str(destino)],
                   check=True, capture_output=True)
    return destino


async def correr_cola(maximo=50):
    """Ejecuta la cola hasta vaciarla (lo que haría el ciclo de fondo)."""
    hechos = 0
    while hechos < maximo:
        n = await cola.vuelta(ESQUEMA, maximo=10)
        if not n:
            break
        hechos += n
    return hechos


async def principal():
    ia.usar_motor_de_pruebas(MOTOR)
    token = token_de_herramienta(subject=1, cliente=CODIGO, esquema=ESQUEMA, usuario="admin")
    token_sin = token_de_herramienta(subject=1, cliente="sincrm", esquema=ESQUEMA, usuario="admin")
    acceso_modulos._cache["sincrm"] = ({"control", "base"}, time.monotonic() + 3600)

    async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
        cli = CRMCliente(codigo=X, razon_social=f"Transportes {X} SAS", activo=True)
        db.add(cli)
        await db.flush()
        c1 = CRMContacto(cliente_id=cli.id, nombre="Yésica Ortíz Bermúdez", activo=True)
        c2 = CRMContacto(cliente_id=cli.id, nombre="Carlos Pérez", activo=True)
        db.add_all([c1, c2])
        await db.commit()
        cli_id, c1_id, c2_id = cli.id, c1.id, c2.id
        otro = (await db.execute(select(func.coalesce(func.max(CRMCliente.id), 0)))).scalar() + 999

    tr = httpx.ASGITransport(app=m.app)
    h = {"Authorization": f"Bearer {token}"}
    try:
        async with httpx.AsyncClient(transport=tr, base_url="http://t", headers=h, timeout=120) as api:
            # ── 1.3 Permiso de perfil verificado en la API ─────────────────────
            print("── Permiso de perfil")
            perfil("OPERADOR_BODEGA", {})
            r = await api.get(API)
            ok(r.status_code == 403, "Sin el permiso crm la API responde 403", r.status_code)
            perfil("OPERADOR_BODEGA", {"crm": True})
            r = await api.get(API)
            ok(r.status_code == 200, "Con el permiso crm responde 200", r.status_code)
            perfil("ADMINISTRADOR", {})

            # ── 2.1 Reunión ligada al cliente ──────────────────────────────────
            print("── Reunión ligada al cliente")
            r = await api.post(API, json={"cliente_id": cli_id, "titulo": "Revisión trimestral",
                                          "origen": "PRESENCIAL",
                                          "participantes": [{"contacto_id": c1_id}, {"contacto_id": c2_id}]})
            ok(r.status_code == 201, "Crear una reunión presencial", r.text[:200])
            reu = r.json()
            ok(reu["estado"] == "PROGRAMADA" and reu["cliente_id"] == cli_id, "Queda PROGRAMADA y ligada al cliente")
            nombres = sorted(p["nombre"] for p in reu["participantes"] if p["contacto_id"])
            ok(nombres == ["Carlos Pérez", "Yésica Ortíz Bermúdez"], "Con los dos contactos como participantes", nombres)
            r = await api.post(API, json={"cliente_id": otro, "titulo": "Ajena", "origen": "PRESENCIAL"})
            ok(r.status_code == 404, "Cliente de otra empresa: se rechaza", r.status_code)
            async with httpx.AsyncClient(transport=tr, base_url="http://t", timeout=30,
                                         headers={"Authorization": f"Bearer {token_sin}"}) as api_sin:
                r = await api_sin.post(API, json={"cliente_id": cli_id, "titulo": "x", "origen": "PRESENCIAL"})
            ok(r.status_code == 403, "Sin el módulo contratado: se rechaza", r.status_code)
            r = await api.post(API, json={"cliente_id": cli_id, "titulo": "Virtual rara", "origen": "VIRTUAL",
                                          "enlace": "https://ejemplo.com/sala/1"})
            ok(r.status_code == 422, "Enlace de plataforma no admitida: se rechaza", r.status_code)

            # ── 2.2 Constancia de consentimiento ───────────────────────────────
            print("── Constancia de consentimiento")
            rid = reu["id"]
            r = await api.post(f"{API}/{rid}/iniciar")
            ok(r.status_code == 409, "Grabar sin confirmar el aviso: no comienza", r.status_code)
            r = await api.post(f"{API}/{rid}/aviso", json={"confirmo": True})
            d = r.json()
            ok(r.status_code == 200 and d["aviso_confirmado"] and d["aviso_texto"], "Se guarda la constancia con su texto")
            r = await api.post(f"{API}/{rid}/iniciar")
            ok(r.status_code == 200 and r.json()["estado"] == "EN_CURSO", "Con la constancia pasa a EN_CURSO")

            # ── 2.3 Partes del grabador, en desorden y con huecos ─────────────
            print("── Grabación por partes")
            s1 = generar("sesion1", 46).read_bytes()
            s2 = generar("sesion2", 28).read_bytes()
            partes1 = [s1[i:i + 6000] for i in range(0, len(s1), 6000)]
            partes2 = [s2[i:i + 6000] for i in range(0, len(s2), 6000)]
            orden = list(range(len(partes1)))[::-1]          # llegan al revés
            retenida = orden.pop(2)                          # y una se pierde por la red
            for i in orden:
                await api.put(f"{API}/{rid}/partes/1/{i + 1}", content=partes1[i])
            for i, p in enumerate(partes2):                  # recargó la página: sesión 2
                await api.put(f"{API}/{rid}/partes/2/{i + 1}", content=p)
            sesiones = {"1": len(partes1), "2": len(partes2)}
            r = await api.post(f"{API}/{rid}/detener", json={"sesiones": sesiones})
            ok(r.status_code == 409 and f"1-{retenida + 1}" in str(r.json()), "Detener con una parte faltante: pide reenviarla",
               r.text[:160])
            await api.put(f"{API}/{rid}/partes/1/{retenida + 1}", content=partes1[retenida])
            await api.put(f"{API}/{rid}/partes/1/{retenida + 1}", content=partes1[retenida])   # repetida: inofensiva
            r = await api.post(f"{API}/{rid}/detener", json={"sesiones": sesiones})
            ok(r.status_code == 200 and r.json()["estado"] == "PROCESANDO", "Con todas las partes queda PROCESANDO", r.text[:160])
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                ruta = Path((await db.get(CRMReunion, rid)).audio_ruta)
            dur = audio.duracion(ruta)
            ok(abs(dur - 74) < 1.5, "El audio final tiene las dos sesiones completas (46 s + 28 s)", round(dur, 1))

            # ── 3.2 / 3.3 Transcripción ────────────────────────────────────────
            print("── Transcripción")
            await correr_cola()
            r = await api.get(f"{API}/{rid}")
            d = r.json()
            ok(d["estado"] == "POR_REVISAR" and len(d["tramos"]) >= 3, "La reunión queda con tramos y por revisar",
               (d["estado"], len(d["tramos"]), d["motivo_falla"]))
            ok(all(t["participante_id"] is None for t in d["tramos"]), "Presencial: los tramos quedan sin asignar")
            ok("Yésica Ortíz Bermúdez" in MOTOR.claves_vistas and f"Transportes {X} SAS" in MOTOR.claves_vistas,
               "Las palabras clave llevan el cliente y sus contactos")
            yesica = next(p for p in d["participantes"] if p["contacto_id"] == c1_id)
            # Quien creó la reunión es participante «nuestro», con su nombre de la base.
            yo_nombre = next(p["nombre"] for p in d["participantes"] if p["usuario_id"] == 1).split()[0]
            r = await api.put(f"{API}/tramos/{d['tramos'][0]['id']}", json={"participante_id": yesica["id"]})
            ok(r.status_code == 200 and r.json()["participante_id"] == yesica["id"], "Asignar a mano un participante a un tramo")

            # Virtual: la captura trae quién habló y cuándo (lo que entregará el bot).
            r = await api.post(API, json={"cliente_id": cli_id, "titulo": "Virtual con hablantes", "origen": "PRESENCIAL",
                                          "participantes": [{"contacto_id": c1_id}, {"contacto_id": c2_id}]})
            rv = r.json()
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                reu_v = await db.get(CRMReunion, rv["id"])
                reu_v.audio_ruta = str(generar("virtual", 60))
                pv = {p["contacto_id"]: p["id"] for p in rv["participantes"] if p["contacto_id"]}
                from app.infrastructure.models.crm_reuniones import CRMReunionParticipante
                for cid, captura in ((c1_id, "Yesica O."), (c2_id, "Carlos P (Transportes)")):
                    (await db.get(CRMReunionParticipante, pv[cid])).nombre_captura = captura
                await db.flush()
                segs = [servicio.Segmento("Yesica O.", 0, 25), servicio.Segmento("Carlos P (Transportes)", 25, 60)]
                await servicio.transcribir(db, ESQUEMA, reu_v, segmentos=segs)
                tv = await servicio.tramos_de(db, reu_v.id)
                await db.commit()
            quienes = [t.participante_id for t in tv]
            ok(len(tv) >= 2 and quienes[0] == pv[c1_id] and quienes[-1] == pv[c2_id] and None not in quienes,
               "Virtual: cada tramo queda con el participante que habló", quienes)

            # Audio largo: 70 minutos, se parte en silencios y conserva los minutos.
            r = await api.post(API, json={"cliente_id": cli_id, "titulo": "Reunión larga", "origen": "PRESENCIAL"})
            rid2 = r.json()["id"]
            await api.post(f"{API}/{rid2}/aviso", json={"confirmo": True})
            largo = generar("larga", 70 * 60, formato="m4a")
            with largo.open("rb") as f:
                r = await api.post(f"{API}/{rid2}/archivo", files={"archivo": ("reunion.m4a", f, "audio/mp4")})
            ok(r.status_code == 200 and r.json()["estado"] == "PROCESANDO", "Subir una grabación m4a de 70 minutos", r.text[:160])
            await correr_cola()
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                tramos = list((await db.execute(select(CRMReunionTramo).where(
                    CRMReunionTramo.reunion_id == rid2).order_by(CRMReunionTramo.orden))).scalars())
            ok(len(tramos) > 60, "El audio largo se transcribe por partes", len(tramos))
            continuo = all(abs(a.fin_s - b.inicio_s) < 0.01 for a, b in zip(tramos, tramos[1:]))
            ok(continuo and tramos[-1].fin_s > 70 * 60 - 2, "Una sola transcripción continua hasta el minuto 70",
               round(tramos[-1].fin_s / 60, 1))
            en_silencio = all((t.inicio_s % PERIODO) >= TONO - 0.3 for t in tramos[1:])
            ok(en_silencio, "Ningún corte cae a mitad de una frase")
            ok(all(15 - 0.5 <= t.fin_s - t.inicio_s <= 60.5 for t in tramos[:-1]), "Trozos de 15 a 60 s")

            # ── 2.4 Formato no admitido ────────────────────────────────────────
            print("── Carga de archivos")
            r = await api.post(API, json={"cliente_id": cli_id, "titulo": "Formato malo", "origen": "PRESENCIAL"})
            rid3 = r.json()["id"]
            await api.post(f"{API}/{rid3}/aviso", json={"confirmo": True})
            r = await api.post(f"{API}/{rid3}/archivo", files={"archivo": ("acta.pdf", b"%PDF-1.4 hola", "application/pdf")})
            ok(r.status_code == 422 and "mp3" in r.text, "Archivo que no es audio: se rechaza con los formatos", r.status_code)
            r = await api.post(f"{API}/{rid3}/archivo", files={"archivo": ("falso.mp3", b"no soy audio" * 50, "audio/mpeg")})
            ok(r.status_code == 422, "Un .mp3 que no tiene audio: se rechaza", r.status_code)

            # ── 3.4 Fallo y reintento ──────────────────────────────────────────
            print("── Fallo de transcripción recuperable")
            corto = generar("corto", 40)
            with corto.open("rb") as f:
                await api.post(f"{API}/{rid3}/archivo", files={"archivo": ("corto.webm", f, "audio/webm")})
            MOTOR.fallar = True
            for _ in range(cola.MAX_INTENTOS):
                async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:   # sin esperar el espaciado
                    await db.execute(update(CRMReunionTrabajo).where(CRMReunionTrabajo.reunion_id == rid3,
                                     CRMReunionTrabajo.estado == "PENDIENTE").values(siguiente_intento=func.now()))
                    await db.commit()
                await cola.vuelta(ESQUEMA)
            d = (await api.get(f"{API}/{rid3}")).json()
            ok(d["estado"] == "FALLIDA" and "caído" in (d["motivo_falla"] or "") and d["tiene_audio"],
               "Servicio caído: FALLIDA con motivo y el audio conservado", (d["estado"], d["motivo_falla"]))
            MOTOR.fallar = False
            r = await api.post(f"{API}/{rid3}/reintentar")
            ok(r.status_code == 200 and r.json()["estado"] == "PROCESANDO", "Reintentar la vuelve a PROCESANDO")
            await correr_cola()
            d = (await api.get(f"{API}/{rid3}")).json()
            ok(d["estado"] == "POR_REVISAR" and d["tramos"], "El reintento termina con su transcripción", d["estado"])

            # ── 3.5 Corrección ─────────────────────────────────────────────────
            print("── Corrección de la transcripción")
            t0 = d["tramos"][0]
            r = await api.put(f"{API}/tramos/{t0['id']}", json={"texto": "texto corregido"})
            j = r.json()
            ok(j["texto"] == "texto corregido" and j["texto_original"] == t0["texto"], "Se guarda la corrección y el original")
            r = await api.put(f"{API}/tramos/{t0['id']}", json={"texto": "segunda corrección"})
            ok(r.json()["texto_original"] == t0["texto"], "El original no se pierde con una segunda corrección")

            # ── 4.x Extracción y revisión (sobre la reunión 1) ─────────────────
            print("── Extracción de compromisos")
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                await db.execute(delete(CRMReunionTramo).where(CRMReunionTramo.reunion_id == rid))
                frases = [
                    (0, "Buenos días, gracias por recibirnos hoy en la oficina."),
                    (35, "Yésica: yo les envío el inventario de rutas el viernes sin falta."),
                    (80, f"{yo_nombre}: nosotros les mandamos la cotización mañana temprano."),
                    (130, "Lo revisamos y les contamos cómo va eso."),
                    (170, "Acordamos que la tarifa se mantiene hasta diciembre."),
                    (210, "Nos preocupa que los tiempos de entrega en Cali se están demorando."),
                ]
                for i, (seg, txt) in enumerate(frases, start=1):
                    db.add(CRMReunionTramo(reunion_id=rid, orden=i, inicio_s=seg, fin_s=seg + 30, texto=txt))
                reu1 = await db.get(CRMReunion, rid)
                reu1.fecha = datetime(2026, 10, 27, 15, 0, tzinfo=timezone.utc)   # martes en Bogotá
                await db.commit()
            MOTOR.resultado = ResultadoReunion(resumen="Revisión de rutas y tarifas.", items=[
                ItemExtraido(tipo="COMPROMISO", descripcion="Enviar el inventario de rutas", responsable="Yésica",
                             lado="CLIENTE", fecha_limite="2026-10-30",
                             cita="yo les envío el inventario de rutas el viernes"),
                ItemExtraido(tipo="COMPROMISO", descripcion="Enviar la cotización", responsable=yo_nombre,
                             lado="NUESTRO", fecha_limite="2026-10-28", cita="nosotros les mandamos la cotización mañana"),
                ItemExtraido(tipo="COMPROMISO", descripcion="Revisar y contar cómo va", responsable=None,
                             lado=None, fecha_limite=None, cita="Lo revisamos y les contamos"),
                ItemExtraido(tipo="COMPROMISO", descripcion="Firmar el contrato", responsable="Carlos",
                             lado="CLIENTE", fecha_limite="2026-11-15", cita="Carlos firma el contrato la otra semana"),
                ItemExtraido(tipo="ACUERDO", descripcion="La tarifa se mantiene hasta diciembre", responsable=None,
                             lado=None, fecha_limite=None, cita="la tarifa se mantiene hasta diciembre"),
                ItemExtraido(tipo="COMPROMISO", descripcion="Fecha imposible", responsable="Carlos", lado="CLIENTE",
                             fecha_limite="2026-01-01", cita="tiempos de entrega en Cali se están demorando"),
            ])
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                await db.execute(update(CRMReunion).where(CRMReunion.id == rid).values(estado="PROCESANDO"))
                await servicio.encolar(db, rid, "EXTRAER")
                await db.commit()
            await correr_cola()
            d = (await api.get(f"{API}/{rid}")).json()
            comps = {c["descripcion"]: c for c in d["compromisos"]}
            ok(d["estado"] == "POR_REVISAR" and d["resumen"], "La propuesta deja la reunión POR_REVISAR con resumen")
            inv = comps.get("Enviar el inventario de rutas")
            ok(inv and inv["lado"] == "CLIENTE" and inv["fecha_limite"] == "2026-10-30" and inv["participante_id"] == yesica["id"],
               "«Yo les envío… el viernes»: del cliente, Yésica, viernes 30", inv)
            ok(inv and inv["minuto_s"] == 35, "La evidencia trae el minuto del tramo", inv and inv["minuto_s"])
            cot = comps.get("Enviar la cotización")
            ok(cot and cot["lado"] == "NUESTRO" and cot["participante_id"] is not None, "Compromiso nuestro, con quien creó la reunión de responsable", cot)
            amb = comps.get("Revisar y contar cómo va")
            ok(amb and amb["participante_id"] is None and amb["fecha_limite"] is None,
               "Responsable ambiguo y sin fecha: por asignar y no definida", amb)
            ok("Firmar el contrato" not in comps, "Cita inexistente: no se muestra")
            imp = comps.get("Fecha imposible")
            ok(imp and imp["fecha_limite"] is None, "Una fecha anterior a la reunión se descarta", imp and imp["fecha_limite"])
            ok(MOTOR.contexto["fecha"] == date(2026, 10, 27), "El modelo recibe la fecha de la reunión en Bogotá")

            # Reunión sin compromisos: lista vacía, sin inventar.
            MOTOR.resultado = ResultadoReunion(resumen="Solo saludos.", items=[])
            await api.post(f"{API}/{rid3}/reextraer")
            await correr_cola()
            d3 = (await api.get(f"{API}/{rid3}")).json()
            ok(d3["estado"] == "POR_REVISAR" and d3["compromisos"] == [], "Reunión sin compromisos: lista vacía")

            # ── 4.3 Revisión ───────────────────────────────────────────────────
            print("── Revisión humana")
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                acts = (await db.execute(select(func.count()).select_from(CRMActividad).where(
                    CRMActividad.cliente_id == cli_id))).scalar()
            ok(acts == 0, "Propuesta sin revisar: no existe ninguna actividad", acts)
            r = await api.post(f"{API}/{rid}/cerrar")
            ok(r.status_code == 409, "No se puede cerrar con puntos por revisar", r.status_code)
            r = await api.put(f"{API}/compromisos/{cot['id']}", json={"fecha_limite": "2026-10-30"})
            ok(r.json()["fecha_limite"] == "2026-10-30", "Editar la fecha antes de aprobar")
            r = await api.post(f"{API}/compromisos/{cot['id']}/aprobar")
            ok(r.status_code == 200 and r.json()["estado"] == "APROBADO" and r.json()["actividad_id"],
               "Aprobar un compromiso nuestro crea la actividad", r.text[:200])
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                act = await db.get(CRMActividad, r.json()["actividad_id"])
                venc = act.fecha_vencimiento.astimezone(servicio.BOGOTA).date()
            ok(act.asunto == "Enviar la cotización" and venc == date(2026, 10, 30) and f"#{rid}" in act.descripcion,
               "La actividad lleva asunto, vencimiento corregido y enlace a la reunión", (act.asunto, venc))
            r = await api.post(f"{API}/compromisos/{amb['id']}/aprobar")
            ok(r.status_code == 422, "Un compromiso sin lado no se aprueba sin decir de quién es", r.status_code)
            r = await api.post(f"{API}/compromisos/{amb['id']}/descartar")
            ok(r.json()["estado"] == "DESCARTADO", "Descartar deja constancia y no crea nada")
            r = await api.post(f"{API}/compromisos/{inv['id']}/aprobar")
            ok(r.json()["estado"] == "APROBADO" and r.json()["actividad_id"] is None,
               "Un compromiso del cliente se aprueba sin crear actividad")
            for c in d["compromisos"]:
                if c["id"] not in (cot["id"], amb["id"], inv["id"]):
                    await api.post(f"{API}/compromisos/{c['id']}/aprobar")
            # Seguimiento: el del cliente vence (la fecha ya pasó respecto a «hoy» simulado).
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                await db.execute(update(CRMReunionCompromiso).where(CRMReunionCompromiso.id == inv["id"])
                                 .values(fecha_limite=date.today() - timedelta(days=1)))
                await db.commit()
            r = await api.get(f"{API}/compromisos", params={"cliente_id": cli_id, "lado": "CLIENTE", "solo_vencidos": True})
            ok(any(c["id"] == inv["id"] and c["vencido"] for c in r.json()), "Compromiso del cliente vencido aparece en el seguimiento")
            r = await api.post(f"{API}/{rid}/cerrar")
            ok(r.status_code == 200 and r.json()["estado"] == "CERRADA" and r.json()["interaccion_id"], "Cerrar la revisión", r.text[:160])
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                inter = await db.get(CRMInteraccion, r.json()["interaccion_id"])
            ok(inter.tipo.value == "REUNION" and "Revisión de rutas" in inter.descripcion and inter.cliente_id == cli_id,
               "Queda una interacción REUNION del cliente con el resumen")

            # ── 4.4 Reintento de la extracción sin transcribir ─────────────────
            print("── Extracción repetible")
            llamadas = MOTOR.llamadas
            MOTOR.fallar = True
            await api.post(f"{API}/{rid3}/reextraer")
            for _ in range(cola.MAX_INTENTOS):
                async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                    await db.execute(update(CRMReunionTrabajo).where(CRMReunionTrabajo.reunion_id == rid3,
                                     CRMReunionTrabajo.estado == "PENDIENTE").values(siguiente_intento=func.now()))
                    await db.commit()
                await cola.vuelta(ESQUEMA)
            d3 = (await api.get(f"{API}/{rid3}")).json()
            ok(d3["estado"] == "FALLIDA" and d3["tramos"], "Falla la extracción y la transcripción se conserva")
            MOTOR.fallar = False
            r = await api.post(f"{API}/{rid3}/reintentar")
            ok(r.json().get("reintento") == "EXTRAER", "Reintentar repite solo la extracción", r.json().get("reintento"))
            await correr_cola()
            ok(MOTOR.llamadas == llamadas, "Sin volver a transcribir", MOTOR.llamadas - llamadas)

            # ── 3.6 Credencial del texto en vivo ───────────────────────────────
            print("── Texto en vivo")
            r = await api.post(f"{API}/vivo/credencial")
            ok(r.status_code == 200 and r.json()["valor"] == "ek_prueba", "Emite la credencial efímera")
            ia.usar_motor_de_pruebas(None)
            from app.core.config import settings
            clave, settings.OPENAI_API_KEY = settings.OPENAI_API_KEY, ""
            r = await api.post(f"{API}/vivo/credencial")
            ok(r.status_code == 503 and "OPENAI_API_KEY" in r.text, "Sin clave: responde que no está configurado", r.status_code)
            settings.OPENAI_API_KEY = clave
            ia.usar_motor_de_pruebas(MOTOR)

            # ── 5.1 Retención ──────────────────────────────────────────────────
            print("── Retención del audio")
            # Primero el borrado a mano: la retención de abajo borra todo lo vencido.
            perfil("OPERADOR_BODEGA", {"crm": True})
            r = await api.delete(f"{API}/{rid3}/audio")
            ok(r.status_code == 403, "Solo un administrador borra el audio antes del plazo", r.status_code)
            perfil("ADMINISTRADOR", {})
            r = await api.delete(f"{API}/{rid3}/audio")
            ok(r.status_code == 200 and not r.json()["tiene_audio"] and r.json()["audio_borrado_en"],
               "Borrado a solicitud: inmediato", r.status_code)
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                ok((await db.get(CRMReunion, rid3)).audio_borrado_por_id == 1, "Queda quién lo borró")
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                n = await servicio.aplicar_retencion(db, ESQUEMA, momento=datetime.now(timezone.utc) + timedelta(days=91))
                await db.commit()
            d2 = (await api.get(f"{API}/{rid2}")).json()
            ok(n >= 1 and not d2["tiene_audio"] and d2["audio_borrado_en"] and d2["tramos"],
               "Vence el plazo: se borra el audio y la transcripción sigue", (n, d2["tiene_audio"]))
            ok(not audio.carpeta(ESQUEMA, rid2).joinpath("original.m4a").exists(), "El archivo ya no está en disco")

            # ── 3.1 Cola con 4 procesos simultáneos ────────────────────────────
            print("── Cola compartida por varios procesos")
            ejecuciones = []

            async def contar(db, esquema, r):
                ejecuciones.append(1)
                await asyncio.sleep(0.05)

            cola.MANEJADORES["PRUEBA"] = contar
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                for _ in range(40):
                    db.add(CRMReunionTrabajo(reunion_id=None, tipo="PRUEBA"))
                await db.commit()

            async def proceso():
                while True:
                    fila = await cola.reclamar(ESQUEMA, tipo="PRUEBA")
                    if fila is None:
                        return
                    await cola.ejecutar(ESQUEMA, fila)

            await asyncio.gather(*(proceso() for _ in range(4)))
            async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
                prueba = CRMReunionTrabajo.tipo == "PRUEBA"
                hechos = (await db.execute(select(func.count()).select_from(CRMReunionTrabajo).where(
                    prueba, CRMReunionTrabajo.estado == "HECHO"))).scalar()
                # El servidor de desarrollo también corre la cola: lo que él tome
                # (sin manejador de PRUEBA) cuenta como reclamado por otro proceso.
                otros = (await db.execute(select(func.count()).select_from(CRMReunionTrabajo).where(
                    prueba, CRMReunionTrabajo.estado != "HECHO", CRMReunionTrabajo.intentos >= 1))).scalar()
                max_intentos = (await db.execute(select(func.max(CRMReunionTrabajo.intentos)).where(prueba))).scalar()
                await db.execute(delete(CRMReunionTrabajo).where(prueba))
                await db.commit()
            ok(len(ejecuciones) == hechos and hechos + otros == 40 and max_intentos == 1,
               "40 trabajos, 4 procesos: cada uno se reclama y ejecuta una sola vez",
               (len(ejecuciones), hechos, otros, max_intentos))
    finally:
        async with AsyncSessionLocal(info={"esquema": ESQUEMA}) as db:
            ids = list((await db.execute(select(CRMReunion.id).where(CRMReunion.cliente_id == cli_id))).scalars())
            await db.execute(delete(CRMReunionCompromiso).where(CRMReunionCompromiso.cliente_id == cli_id))
            await db.execute(update(CRMReunion).where(CRMReunion.cliente_id == cli_id).values(interaccion_id=None))
            await db.execute(delete(CRMReunion).where(CRMReunion.cliente_id == cli_id))
            await db.execute(delete(CRMActividad).where(CRMActividad.cliente_id == cli_id))
            await db.execute(delete(CRMInteraccion).where(CRMInteraccion.cliente_id == cli_id))
            await db.execute(delete(CRMContacto).where(CRMContacto.cliente_id == cli_id))
            await db.execute(delete(CRMCliente).where(CRMCliente.id == cli_id))
            await db.commit()
        for i in ids:
            audio.borrar_todo(ESQUEMA, i)
        shutil.rmtree(TMP, ignore_errors=True)
        ia.usar_motor_de_pruebas(None)

    print()
    print("Reuniones: %d fallos." % len(fallos))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
