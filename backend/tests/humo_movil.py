"""
Prueba de humo de la app móvil contra el servidor que está corriendo (HTTP de
verdad: Redis, sesiones y middlewares incluidos).

    docker exec -w /app -e DEBUG=false ci_backend python tests/humo_movil.py

Crea un usuario temporal en una empresa con CMMS y otro en una sin CMMS, recorre
los escenarios de `acceso-dispositivo` y `distribucion`, y los borra al final.
"""
import asyncio
import os
import secrets
import shutil
import sys
from pathlib import Path

os.environ.setdefault("SQLALCHEMY_ECHO", "0")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.tenant import ESQUEMA_PLATAFORMA

BASE = os.environ.get("BASE", "http://localhost:8000/api/v1")
CON_CMMS = os.environ.get("EMPRESA", "rtm")
SIN_CMMS = os.environ.get("EMPRESA_SIN_CMMS", "")
USUARIO = "movil_humo"
CLAVE = "Prueba-" + secrets.token_urlsafe(10)
DISP = {"nombre": "Teléfono de prueba", "modelo": "Pixel 8", "version_app": "1.0.0"}

FALLOS: list = []
CUENTA = {"ok": 0}


def ok(cond, etiqueta, detalle=""):
    if cond:
        CUENTA["ok"] += 1
        print("  ok   " + etiqueta)
    else:
        FALLOS.append(etiqueta)
        print("FALLA  " + etiqueta + ("  ->  " + str(detalle)[:300] if detalle else ""))


async def _sql(esquema, sql, **p):
    async with AsyncSessionLocal() as s:
        await s.execute(text(f'SET search_path TO "{esquema}"'))
        r = await s.execute(text(sql), p)
        await s.commit()
        return r


async def esquema_de(codigo):
    r = await _sql(ESQUEMA_PLATAFORMA, "SELECT esquema FROM plataforma_cliente WHERE codigo = :c", c=codigo)
    return r.scalar()


async def empresa_sin_cmms():
    """Una empresa con módulos asignados y sin el CMMS (si no hay, se omite)."""
    r = await _sql(ESQUEMA_PLATAFORMA, """
        SELECT c.codigo FROM plataforma_cliente c WHERE c.activo AND EXISTS (
          SELECT 1 FROM plataforma_modulo_cliente m WHERE m.cliente_id = c.id AND m.activo)
        AND NOT EXISTS (SELECT 1 FROM plataforma_modulo_cliente m
          WHERE m.cliente_id = c.id AND m.activo AND m.modulo = 'eam') LIMIT 1""")
    return r.scalar()


async def crear_usuario(esquema):
    await borrar_usuario(esquema)
    await _sql(esquema, """INSERT INTO usuarios (nombre, apellido, email, username, hashed_password, rol, activo,
               bloqueado, intentos_fallidos, created_at, updated_at)
               VALUES ('Prueba', 'Móvil', :e, :u, :h, 'ADMINISTRADOR', true, false, 0, now(), now())""",
               e=f"{USUARIO}@prueba.tittanware.com", u=USUARIO, h=hash_password(CLAVE))


async def borrar_usuario(esquema):
    await _sql(esquema, "DELETE FROM movil_dispositivo WHERE usuario_id IN (SELECT id FROM usuarios WHERE username = :u)", u=USUARIO)
    await _sql(esquema, "DELETE FROM usuarios WHERE username = :u", u=USUARIO)


def sesion(c, empresa, clave=CLAVE):
    return c.post(f"{BASE}/movil/sesion", headers={"X-Cliente": empresa},
                  json={"username": USUARIO, "password": clave, "dispositivo": DISP})


def renovar(c, empresa, secreto):
    return c.post(f"{BASE}/movil/renovar", headers={"X-Cliente": empresa, "X-App-Version": "1.0.1"},
                  json={"renovacion": secreto})


async def main():
    esq = await esquema_de(CON_CMMS)
    assert esq, f"No existe la empresa {CON_CMMS}"
    sin = SIN_CMMS or await empresa_sin_cmms()
    apagado = None
    if not sin:
        # Ninguna empresa local sin CMMS: se le apaga a otra mientras dura la
        # prueba y se espera a que el servidor olvide su caché de módulos (30 s).
        sin = os.environ.get("EMPRESA_TEMPORAL", "acme")
        r = await _sql(ESQUEMA_PLATAFORMA, """UPDATE plataforma_modulo_cliente m SET activo = false
            FROM plataforma_cliente c WHERE c.id = m.cliente_id AND c.codigo = :c AND m.modulo = 'eam' AND m.activo
            RETURNING m.id""", c=sin)
        apagado = [f[0] for f in r.all()]
        print(f"  --   CMMS apagado temporalmente en {sin}; esperando la caché de módulos")
        await asyncio.sleep(31)
    esq_sin = await esquema_de(sin) if sin else None
    await crear_usuario(esq)
    if esq_sin:
        await crear_usuario(esq_sin)
    carpeta = Path("uploads/movil")
    respaldo = carpeta.with_name("movil.respaldo-humo")
    if carpeta.exists():
        shutil.move(carpeta, respaldo)
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            print("Ingreso desde el teléfono")
            r = await sesion(c, CON_CMMS, "clave-equivocada")
            ok(r.status_code == 401, "clave equivocada → 401", r.text)
            r = await sesion(c, CON_CMMS)
            ok(r.status_code == 200, "ingreso con CMMS → 200", r.text)
            d = r.json()
            ok(d.get("access_token") and d.get("renovacion") and "eam" in d.get("modulos", []) or "*" in d.get("modulos", []),
               "trae token, secreto de renovación y módulos", d)
            token, secreto, disp_id = d["access_token"], d["renovacion"], d["dispositivo_id"]
            r = await c.get(f"{BASE}/eam/ots", headers={"Authorization": f"Bearer {token}"}, params={"estado": "PENDIENTE"})
            ok(r.status_code == 200, "el token de la app abre el CMMS como el del portal", r.status_code)

            if esq_sin:
                r = await sesion(c, sin)
                ok(r.status_code == 403, f"empresa sin CMMS ({sin}) → 403", r.text)
            else:
                print("  --   no hay empresa sin CMMS para probar el 403")

            print("Renovación")
            r = await renovar(c, CON_CMMS, secreto)
            ok(r.status_code == 200, "renovar → 200 con secreto nuevo", r.text)
            nuevo = r.json()
            ok(nuevo["renovacion"] != secreto, "el secreto rota")
            r = await c.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {nuevo['access_token']}"})
            ok(r.status_code == 200, "el token renovado sirve", r.status_code)
            v = (await _sql(esq, "SELECT version_app FROM movil_dispositivo WHERE id = :i", i=disp_id)).scalar()
            ok(v == "1.0.1", "guarda la versión de la app que renueva", v)

            r = await renovar(c, CON_CMMS, secreto)
            ok(r.status_code == 401, "reusar el secreto viejo → 401", r.text)
            r = await renovar(c, CON_CMMS, nuevo["renovacion"])
            ok(r.status_code == 401, "…y revoca el dispositivo: tampoco sirve el vigente", r.text)

            print("Revocar desde el portal")
            d = (await sesion(c, CON_CMMS)).json()
            h = {"Authorization": f"Bearer {d['access_token']}"}
            r = await c.get(f"{BASE}/movil/dispositivos", headers=h)
            ok(r.status_code == 200 and any(x["id"] == d["dispositivo_id"] for x in r.json()), "lista sus dispositivos", r.text)
            r = await c.delete(f"{BASE}/movil/dispositivos/{d['dispositivo_id']}", headers=h)
            ok(r.status_code == 204, "revocar → 204", r.text)
            r = await renovar(c, CON_CMMS, d["renovacion"])
            ok(r.status_code == 401, "teléfono revocado ya no renueva", r.text)

            print("Clave cambiada y usuario inactivo")
            d = (await sesion(c, CON_CMMS)).json()
            await _sql(esq, "UPDATE usuarios SET hashed_password = :h WHERE username = :u", h=hash_password(CLAVE + "x"), u=USUARIO)
            r = await renovar(c, CON_CMMS, d["renovacion"])
            ok(r.status_code == 401 and "clave" in r.text, "clave cambiada → 401 con el motivo", r.text)
            await _sql(esq, "UPDATE usuarios SET hashed_password = :h WHERE username = :u", h=hash_password(CLAVE), u=USUARIO)
            d = (await sesion(c, CON_CMMS)).json()
            await _sql(esq, "UPDATE usuarios SET activo = false WHERE username = :u", u=USUARIO)
            r = await renovar(c, CON_CMMS, d["renovacion"])
            ok(r.status_code == 401, "usuario desactivado → 401", r.text)
            await _sql(esq, "UPDATE usuarios SET activo = true WHERE username = :u", u=USUARIO)
            d = (await sesion(c, CON_CMMS)).json()
            await _sql(esq, "UPDATE movil_dispositivo SET vence = now() - interval '1 day' WHERE id = :i", i=d["dispositivo_id"])
            r = await renovar(c, CON_CMMS, d["renovacion"])
            ok(r.status_code == 401, "30 días sin uso → 401", r.text)

            print("Versión y descarga")
            r = await c.get(f"{BASE}/movil/version")
            ok(r.status_code == 404, "sin versión publicada → 404", r.text)
            carpeta.mkdir(parents=True)
            apk = carpeta / "prueba.apk"
            apk.write_bytes(b"PK\x03\x04" + b"0" * 2000)
            import subprocess
            subprocess.run([sys.executable, "tools/publicar_apk.py", str(apk), "--version", "9.9.9", "--codigo", "99",
                            "--notas", "prueba"], check=True, capture_output=True)
            r = await c.get(f"{BASE}/movil/version")
            ok(r.status_code == 200 and r.json()["version"] == "9.9.9", "versión publicada, sin sesión", r.text)
            r = await c.get(f"{BASE}/movil/descarga")
            ok(r.status_code == 401, "descargar sin sesión → 401", r.status_code)
            d = (await sesion(c, CON_CMMS)).json()
            r = await c.get(f"{BASE}/movil/descarga", headers={"Authorization": f"Bearer {d['access_token']}"})
            ok(r.status_code == 200 and r.content[:2] == b"PK" and "TittanWare-9.9.9.apk" in r.headers.get("content-disposition", ""),
               "descargar con sesión → el APK con su nombre", r.headers)
            r = await c.post(f"{BASE}/movil/enlace-descarga")
            ok(r.status_code == 401, "enlace de descarga sin sesión → 401", r.status_code)
            r = await c.post(f"{BASE}/movil/enlace-descarga", headers={"Authorization": f"Bearer {d['access_token']}"})
            ok(r.status_code == 200 and r.json()["url"].startswith("/api/v1/movil/apk/"), "enlace de descarga con sesión", r.text)
            r = await c.get(BASE.split("/api/v1")[0] + r.json()["url"])
            ok(r.status_code == 200 and r.content[:2] == b"PK", "el enlace baja el APK sin cabecera (como el navegador)", r.status_code)
            r = await c.get(f"{BASE}/movil/apk/{d['access_token']}")
            ok(r.status_code == 401, "un token de acceso no sirve de enlace → 401", r.status_code)
    finally:
        shutil.rmtree(carpeta, ignore_errors=True)
        if respaldo.exists():
            shutil.move(respaldo, carpeta)
        await borrar_usuario(esq)
        if esq_sin:
            await borrar_usuario(esq_sin)
        if apagado:
            await _sql(ESQUEMA_PLATAFORMA, "UPDATE plataforma_modulo_cliente SET activo = true WHERE id = ANY(:i)", i=apagado)

    print(f"\n{CUENTA['ok']} bien, {len(FALLOS)} fallas")
    if FALLOS:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
