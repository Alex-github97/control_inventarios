"""
Sesiones de escaneo en memoria — permiten vincular un celular como escáner remoto.
No requieren autenticación: el UUID de sesión actúa como token de seguridad.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List
import time
import uuid
import socket

router = APIRouter(prefix="/scan-sessions", tags=["Scan Sessions"])


@router.get("/server-ip")
async def get_server_ip():
    """Devuelve la IP LAN del PC host (necesaria para generar el QR que abre el celular)."""
    ip = ""
    # Docker Desktop for Windows expone la IP del host via host.docker.internal
    try:
        ip = socket.gethostbyname("host.docker.internal")
    except Exception:
        pass
    if not ip:
        # Fallback: conectar a DNS externo para descubrir la interfaz de salida
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass
    return {"ip": ip}

# Almacén en memoria: { session_id: { created_at, codes: [{code, ts}] } }
_sessions: Dict[str, Any] = {}
_TTL = 3600  # 1 hora


def _cleanup() -> None:
    now = time.time()
    expired = [sid for sid, s in _sessions.items() if now - s["created_at"] > _TTL]
    for sid in expired:
        del _sessions[sid]


class CodePayload(BaseModel):
    code: str


@router.post("/", status_code=201)
async def create_session():
    _cleanup()
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {"created_at": time.time(), "codes": []}
    return {"id": session_id}


@router.post("/{session_id}/code")
async def push_code(session_id: str, payload: CodePayload):
    session = _sessions.get(session_id)
    if not session or time.time() - session["created_at"] > _TTL:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada")
    code = payload.code.strip()
    if not code:
        raise HTTPException(status_code=422, detail="El código no puede estar vacío")
    session["codes"].append({"code": code, "ts": time.time()})
    return {"ok": True, "total": len(session["codes"])}


@router.get("/{session_id}/codes")
async def get_codes(session_id: str, since: int = 0):
    session = _sessions.get(session_id)
    if not session or time.time() - session["created_at"] > _TTL:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada")
    all_codes: List[Any] = session["codes"]
    return {
        "codes": [c["code"] for c in all_codes[since:]],
        "total": len(all_codes),
    }


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str):
    _sessions.pop(session_id, None)
