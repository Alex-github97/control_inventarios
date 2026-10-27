"""Prueba de los escenarios de seguridad (specs seguridad/credenciales y
seguridad/sesiones), contra el servidor que corre y su Redis de verdad.

Crea un usuario temporal en la empresa `acme` con la clave en bcrypt —como las
que ya existen—, recorre ingreso, inactividad, salida, cambio de clave y freno
de intentos, y al final lo borra junto con los contadores de intentos.

    docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_seguridad.py
"""
import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
import bcrypt
import jwt
import redis as redis_sync
from fastapi import HTTPException

from app.core import sesiones
from app.core.config import settings
from app.core.security import decode_token, problema_de_clave, verificar_clave

API = os.environ.get("API", "http://127.0.0.1:8000/api/v1")
CLIENTE, ESQUEMA = "acme", "cli_acme"
URL_DB = os.environ["DATABASE_URL"].replace("postgresql+asyncpg", "postgresql")
SUFIJO = str(int(time.time()) % 1000000)
USUARIO = "seg" + SUFIJO
CLAVE = "frase larga de prueba " + SUFIJO
R = redis_sync.from_url(settings.redis_sesiones_url, decode_responses=True)
fallos = []


def ok(cond, nombre, extra=""):
    print(("  ok  " if cond else "FALLA ") + nombre + (("  ->  " + str(extra)) if extra != "" else ""))
    if not cond:
        fallos.append(nombre)


def llamar(metodo, ruta, cuerpo=None, token=None, inactividad="0", cliente=CLIENTE):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
        if inactividad is not None:
            h["X-Inactividad"] = inactividad
    else:
        h["X-Cliente"] = cliente
    req = urllib.request.Request(API + ruta, method=metodo, headers=h,
                                 data=json.dumps(cuerpo).encode() if cuerpo is not None else None)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try:
            return e.code, json.loads(t)
        except Exception:
            return e.code, t


def entrar(clave=CLAVE, usuario=USUARIO):
    return llamar("POST", "/auth/login", {"username": usuario, "password": clave})


def detalle(d):
    return d.get("detail") if isinstance(d, dict) else d


async def principal():
    con = await asyncpg.connect(URL_DB)
    await con.execute(f'SET search_path TO "{ESQUEMA}"')
    hash_viejo = bcrypt.hashpw(CLAVE.encode(), bcrypt.gensalt()).decode()
    uid = await con.fetchval(
        """INSERT INTO usuarios (nombre, apellido, email, username, hashed_password, rol, activo,
                                 intentos_fallidos, bloqueado, created_at, updated_at)
           VALUES ('Prueba', 'Seguridad', $1, $2, $3, 'ADMINISTRADOR', true, 0, false, now(), now())
           RETURNING id""", f"{USUARIO}@prueba-tittanware.com", USUARIO, hash_viejo)
    try:
        print("── Credenciales")
        ok(problema_de_clave("corta123") is not None, "Contraseña corta rechazada", problema_de_clave("corta123"))
        ok(problema_de_clave("mi-usuario-juanp-2026", "juanp") is not None, "Contraseña con el usuario rechazada")
        ok(problema_de_clave("una frase que solo yo conozco") is None, "Frase larga aceptada")
        correcta, nuevo = verificar_clave(CLAVE, hash_viejo)
        ok(correcta and nuevo and nuevo.startswith("$argon2id$"), "bcrypt válido devuelve hash Argon2id")
        falso = jwt.encode({"sub": "1", "type": "access", "esq": ESQUEMA}, key=None, algorithm="none")
        try:
            decode_token(falso)
            ok(False, "Token con algoritmo «none» rechazado")
        except HTTPException as e:
            ok(e.status_code == 401, "Token con algoritmo «none» rechazado", e.status_code)
        r = subprocess.run([sys.executable, "-c", "from app.core.config import Settings; Settings()"],
                           env={**os.environ, "ENVIRONMENT": "production", "SECRET_KEY": "corta"},
                           capture_output=True, text=True)
        ok(r.returncode != 0 and "SECRET_KEY" in r.stderr, "Clave débil impide arrancar en producción")

        print("── Ingreso y sesión")
        st, d = entrar()
        ok(st == 200, "Ingreso con clave antigua (bcrypt)", st)
        tok = d["access_token"]
        sid = decode_token(tok).get("sid")
        ok(bool(sid), "El token lleva sid")
        h = await con.fetchval("SELECT hashed_password FROM usuarios WHERE id=$1", uid)
        ok(h.startswith("$argon2id$"), "La clave quedó convertida a Argon2id")
        st, _ = llamar("GET", "/auth/me", token=tok)
        ok(st == 200, "Consulta con sesión viva", st)

        # Las consultas automáticas (sin X-Inactividad) no extienden la sesión.
        R.expire(f"tw:ses:{sid}", 100)
        llamar("GET", "/auth/me", token=tok, inactividad=None)
        ok(R.ttl(f"tw:ses:{sid}") <= 100, "Consulta automática no extiende la sesión", R.ttl(f"tw:ses:{sid}"))
        llamar("GET", "/auth/me", token=tok, inactividad="0")
        ok(R.ttl(f"tw:ses:{sid}") > 500, "Actividad real extiende la sesión", R.ttl(f"tw:ses:{sid}"))

        # Inactividad: 10 min sin tocar nada.
        st, d = llamar("GET", "/auth/me", token=tok, inactividad="601")
        ok(st == 401 and "inactividad" in str(detalle(d)), "Diez minutos sin actividad cierran la sesión", (st, detalle(d)))
        st, _ = llamar("GET", "/auth/me", token=tok)
        ok(st == 401, "La sesión cerrada ya no sirve aunque el token no venza", st)

        # Tope de 12 horas.
        st, d = entrar(); tok = d["access_token"]; sid = decode_token(tok)["sid"]
        datos = json.loads(R.get(f"tw:ses:{sid}")); datos["creada"] = int(time.time()) - 13 * 3600
        R.set(f"tw:ses:{sid}", json.dumps(datos), ex=600)
        st, d = llamar("GET", "/auth/me", token=tok)
        ok(st == 401 and "máximo" in str(detalle(d)), "Sesión de más de 12 horas se cierra", (st, detalle(d)))

        # Salir en el servidor.
        st, d = entrar(); tok = d["access_token"]
        st, _ = llamar("POST", "/auth/logout", token=tok)
        ok(st == 204, "Salir", st)
        st, d = llamar("GET", "/auth/me", token=tok)
        ok(st == 401 and "Cerró su sesión" in str(detalle(d)), "Token copiado no sirve tras salir", (st, detalle(d)))

        # Cambiar la clave cierra las otras sesiones, no la propia.
        _, d1 = entrar(); _, d2 = entrar()
        t1, t2 = d1["access_token"], d2["access_token"]
        nueva = "otra frase muy larga " + SUFIJO
        st, d = llamar("POST", "/auth/change-password", {"password_actual": CLAVE, "password_nuevo": "corta"}, token=t1)
        ok(st == 422, "Cambio a una clave corta rechazado", st)
        st, d = llamar("POST", "/auth/change-password", {"password_actual": CLAVE, "password_nuevo": nueva}, token=t1)
        ok(st == 200, "Cambio de clave", (st, detalle(d)))
        ok(llamar("GET", "/auth/me", token=t1)[0] == 200, "La sesión de quien cambia sigue viva")
        st, d = llamar("GET", "/auth/me", token=t2)
        ok(st == 401 and "contraseña cambió" in str(detalle(d)), "Las demás sesiones se cierran", (st, detalle(d)))

        print("── Freno de intentos")
        t0 = time.perf_counter(); st_ne, d_ne = entrar("cualquier-cosa-larga", "no-existe-" + SUFIJO); t_ne = time.perf_counter() - t0
        t0 = time.perf_counter(); st_m, d_m = entrar("clave equivocada larga"); t_m = time.perf_counter() - t0
        ok(st_ne == st_m == 401 and detalle(d_ne) == detalle(d_m), "Usuario inexistente: mismo mensaje", (st_ne, detalle(d_ne)))
        ok(abs(t_ne - t_m) < 0.25, "Usuario inexistente: tiempo similar", f"{t_ne:.3f}s vs {t_m:.3f}s")
        for _ in range(4):
            entrar("clave equivocada larga")
        st, d = entrar(nueva)
        ok(st == 429, "Tras 5 fallos, ni la clave correcta entra", (st, detalle(d)))

        print("── Almacén de sesiones caído")
        original = sesiones._cliente
        import redis.asyncio as redis_async
        sesiones._cliente = redis_async.from_url("redis://127.0.0.1:1/1", socket_timeout=1, socket_connect_timeout=1)
        try:
            await sesiones.validar({"sid": "x", "sub": "1", "esq": ESQUEMA}, "0")
            ok(False, "Redis caído niega el acceso")
        except HTTPException as e:
            ok(e.status_code == 503, "Redis caído niega el acceso (falla cerrado)", e.status_code)
        finally:
            sesiones._cliente = original
    finally:
        await con.execute("DELETE FROM usuarios WHERE id=$1", uid)
        await con.close()
        for k in R.scan_iter("tw:login:*"):
            R.delete(k)
        for k in R.scan_iter(f"tw:ses:u:{ESQUEMA}:{uid}"):
            R.delete(k)

    print()
    print("Seguridad: %d fallos." % len(fallos))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(principal()))
