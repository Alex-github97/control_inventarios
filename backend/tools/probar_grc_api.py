"""Prueba funcional de GRC de punta a punta: 70 comprobaciones de reglas.

Corre contra la COPIA de la base (backend en :8001 sobre ci_pruebas_form; ver
barrido_rutas_escritura.py), con DATABASE_URL apuntando a la misma copia:
    python tools/probar_grc_api.py <esquema>
"""
import asyncio, os, sys
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.core.security import create_access_token
from app.core.database import engine

B = os.environ.get("BASE", "http://127.0.0.1:8001") + "/api/v1/grc"
ESQ = sys.argv[1] if len(sys.argv) > 1 else "public"
H = {"Authorization": "Bearer " + create_access_token(subject=1, cliente=ESQ, esquema=ESQ, usuario="admin")}
OK = 0


def ok(cond, msg, extra=""):
    global OK
    if not cond:
        raise AssertionError(f"FALLA: {msg} {extra}")
    OK += 1
    print("  ok ·", msg)


async def sql(q, **kw):
    async with engine.begin() as c:
        await c.execute(text(f'SET search_path TO "{ESQ}"'))
        r = await c.execute(text(q), kw)
        return r.all() if r.returns_rows else None


async def main():
    c = httpx.AsyncClient(base_url=B, headers=H, timeout=60)
    hoy = date.today()

    personas = (await c.get("/personas")).json()
    ok(any(p["id"] == 1 for p in personas), "el administrador es asignable")
    proceso = (await sql("select nombre from catalogo_maestro where modulo='GLOBAL' and tipo='PROCESO' and activo limit 1"))[0][0]
    area = (await sql("select nombre from catalogo_maestro where modulo='GLOBAL' and tipo='AREA' and activo limit 1"))[0][0]
    sin_grc = (await sql("insert into usuarios (nombre, apellido, email, username, hashed_password, rol, activo, created_at, updated_at) "
                         "values ('Sin','Acceso','sin.grc@x.co','sin_grc','x','CONSULTA',true,now(),now()) returning id"))[0][0]
    try:
        # ── Gobierno ──
        r = await c.post("/comites", json={"nombre": "PRUEBA Comité de riesgos", "tipo": "comité de RIESGOS",
                                           "periodicidad": "Mensual", "presidente_id": 1, "miembros": [1], "quorum_minimo": 1})
        ok(r.status_code == 201 and r.json()["tipo"] == "Comité de riesgos", "comité: el tipo se normaliza al catálogo", r.text[:200])
        comite = r.json()
        ok(comite["presidente_nombre"] and comite["miembros"] == [1], "comité: presidente y miembros por usuario")
        r = await c.post("/comites", json={"nombre": "X", "tipo": "Inventado"})
        ok(r.status_code == 422 and "catálogo" in r.text, "comité: tipo fuera del catálogo se rechaza")
        r = await c.post("/comites", json={"nombre": "X", "presidente_id": sin_grc})
        ok(r.status_code == 422 and "acceso" in r.text, "comité: usuario sin acceso a GRC se rechaza")
        r = await c.post("/comites", json={"nombre": "X", "presidente": "Juan Pérez"})
        ok(r.status_code == 422, "comité: ya no se acepta la persona escrita a mano")
        r = await c.post("/sesiones", json={"comite_id": comite["id"], "fecha": hoy.isoformat(), "asistentes": [1],
                                            "proxima": (hoy + timedelta(days=30)).isoformat(), "temas": "Revisión mensual"})
        ok(r.status_code == 201 and r.json()["quorum_ok"] is True, "sesión del comité con quórum", r.text[:200])
        sesion = r.json()

        # ── Controles y riesgos ──
        r = await c.post("/controles", json={"nombre": "PRUEBA Doble aprobación de pagos", "tipo": "preventivo",
                                             "proceso": proceso, "area": area, "responsable_id": 1,
                                             "frecuencia": "Por evento", "periodicidad_prueba": "Trimestral"})
        ok(r.status_code == 201, "control creado", r.text[:200])
        ctl = r.json()
        ok(ctl["efectividad"] == "no_probado" and ctl["proxima_evaluacion"], "control: nace no probado y con próxima prueba")
        r = await c.post("/riesgos", json={"nombre": "PRUEBA Pago a proveedor ficticio", "tipo": "operativo",
                                           "proceso": proceso, "responsable_id": 1, "probabilidad_inherente": 4,
                                           "impacto_inherente": 5, "comite_id": comite["id"]})
        ok(r.status_code == 201, "riesgo creado", r.text[:200])
        rsk = r.json()
        ok(rsk["nivel_inherente"] == 20 and rsk["nivel_residual"] == 20 and rsk["prioridad"] == "critica",
           "riesgo: inherente 20 y sin controles el residual es igual (crítico)")
        r = await c.post("/riesgos", json={"nombre": "x", "probabilidad_residual": 1})
        ok(r.status_code == 422, "riesgo: el residual no se escribe a mano")
        await c.post(f"/riesgos/{rsk['id']}/controles", json={"control_id": ctl["id"]})
        rsk = (await c.get(f"/riesgos/{rsk['id']}")).json()
        ok(rsk["nivel_residual"] == 20 and rsk["controles"] == 1, "un control NO PROBADO no reduce el riesgo")
        r = await c.post("/pruebas", json={"control_id": ctl["id"], "fecha": hoy.isoformat(), "resultado": "efectivo",
                                           "probador_id": 1, "muestra": 25, "excepciones": 0})
        ok(r.status_code == 201, "prueba de control registrada", r.text[:200])
        ctl = (await c.get(f"/controles/{ctl['id']}")).json()
        ok(ctl["efectividad"] == "efectivo" and ctl["ultima_evaluacion"] == hoy.isoformat()
           and ctl["proxima_evaluacion"] == (hoy + timedelta(days=90)).isoformat(),
           "control: la efectividad y las fechas salen de la prueba")
        rsk = (await c.get(f"/riesgos/{rsk['id']}")).json()
        ok(rsk["probabilidad_residual"] == 2 and rsk["nivel_residual"] == 10 and rsk["prioridad"] == "alta",
           "riesgo: el preventivo efectivo baja 2 niveles la probabilidad (20 → 10, alta)", str(rsk))

        # Apetito y bandas
        await c.put("/config/apetito", json=[{"categoria": "Operativo", "apetito": 8}])
        rsk = (await c.get(f"/riesgos/{rsk['id']}")).json()
        ok(rsk["fuera_de_apetito"] is True and rsk["apetito"] == 8, "apetito por categoría: 10 > 8 está fuera")
        matriz = (await c.get("/config/matriz")).json()
        bandas = {b["prioridad"]: b for b in matriz["bandas"]}
        nuevas = [{**bandas[p], "minimo": m} for p, m in (("baja", 1), ("media", 4), ("alta", 12), ("critica", 16))]
        r = await c.put("/config/bandas", json=nuevas)
        ok(r.status_code == 200, "bandas guardadas", r.text[:200])
        rsk = (await c.get(f"/riesgos/{rsk['id']}")).json()
        ok(rsk["prioridad"] == "media", "cambiar las bandas reclasifica los riesgos (10 → media)")
        r = await c.put("/config/bandas", json=[{**bandas[p], "minimo": 5} for p in ("baja", "media", "alta", "critica")])
        ok(r.status_code == 422, "bandas incoherentes se rechazan")
        await c.put("/config/bandas", json=list(bandas.values()))
        await c.put("/config/apetito", json=[{"categoria": "Operativo", "apetito": None}])

        # KRI
        r = await c.post("/kris", json={"riesgo_id": rsk["id"], "nombre": "PRUEBA Pagos sin soporte", "unidad": "pagos",
                                        "direccion": "sube", "umbral_alerta": 2, "umbral_critico": 5,
                                        "periodicidad": "Mensual", "responsable_id": 1})
        ok(r.status_code == 201, "KRI creado", r.text[:200])
        kri = r.json()
        r = await c.post("/kris", json={"riesgo_id": rsk["id"], "nombre": "x", "umbral_alerta": 5, "umbral_critico": 2})
        ok(r.status_code == 422, "KRI: umbrales al revés se rechazan")
        med = (await c.post(f"/kris/{kri['id']}/mediciones", json={"periodo": hoy.strftime("%Y-%m"), "valor": 3})).json()
        ok(med[-1]["estado"] == "alerta", "KRI: 3 con alerta en 2 → alerta")
        kri = (await c.get(f"/kris/{kri['id']}")).json()
        ok(kri["estado"] == "alerta", "KRI: el estado viaja con el indicador")

        # ── Cumplimiento ──
        r = await c.post("/obligaciones", json={"nombre": "PRUEBA Control de acceso a la información", "tipo": "Norma técnica",
                                                "marco": "ISO 27001 — Seguridad de la información", "articulo": "A.9",
                                                "periodicidad": "Anual", "responsable_id": 1, "proceso": proceso})
        ok(r.status_code == 201, "obligación creada", r.text[:200])
        obl = r.json()
        r = await c.post("/cumplimiento", json={"obligacion_id": obl["id"], "estado": "cumple", "puntaje": 90})
        ok(r.status_code == 422, "cumplimiento: «cumple» sin evidencia se rechaza")
        r = await c.post("/cumplimiento", json={"obligacion_id": obl["id"], "estado": "cumple", "puntaje": 90,
                                                "evidencias": "Matriz de accesos revisada", "responsable_id": 1})
        ok(r.status_code == 201 and r.json()["proxima_evaluacion"] == (hoy + timedelta(days=365)).isoformat(),
           "cumplimiento: próxima evaluación según la periodicidad de la obligación", r.text[:200])
        obl = (await c.get(f"/obligaciones/{obl['id']}")).json()
        ok(obl["estado_cumplimiento"] == "cumple", "la obligación toma el estado de su última evaluación")
        r = await c.post("/vinculos", json={"origen_tipo": "obligacion", "origen_id": obl["id"],
                                            "destino_tipo": "control", "destino_id": ctl["id"]})
        ok(r.status_code == 201, "vínculo obligación ↔ control")
        r = await c.post("/vinculos", json={"origen_tipo": "control", "origen_id": ctl["id"],
                                            "destino_tipo": "obligacion", "destino_id": obl["id"]})
        ok(r.status_code == 409, "vínculo duplicado (al revés) se rechaza")
        r = await c.post("/vinculos", json={"origen_tipo": "kri", "origen_id": kri["id"],
                                            "destino_tipo": "tercero", "destino_id": 1})
        ok(r.status_code == 422, "par de vínculo no permitido se rechaza")
        obl = (await c.get(f"/obligaciones/{obl['id']}")).json()
        ok(obl["controles"] == 1, "la obligación cuenta sus controles")

        # ── Políticas ──
        r = await c.post("/politicas", json={"nombre": "PRUEBA Política de pagos", "tipo": "Financiera",
                                             "propietario_id": 1, "aceptaciones_requeridas": True,
                                             "periodicidad_revision": "Anual", "alcance": "Tesorería"})
        ok(r.status_code == 201 and r.json()["estado"] == "borrador", "política nace en borrador", r.text[:200])
        pol = r.json()
        await c.post(f"/politicas/{pol['id']}/estado", json={"estado": "en_revision"})
        r = await c.post(f"/politicas/{pol['id']}/estado", json={"estado": "aprobada"})
        ok(r.status_code == 409 and "aprueba" in r.text, "no se aprueba sin aprobador asignado")
        await c.put(f"/politicas/{pol['id']}", json={**{k: pol[k] for k in ("nombre", "tipo", "version", "alcance",
                     "periodicidad_revision", "aceptaciones_requeridas")}, "propietario_id": 1, "aprobador_id": 1})
        r = await c.post(f"/politicas/{pol['id']}/estado", json={"estado": "publicada"})
        ok(r.status_code == 409, "no se publica sin pasar por aprobación")
        ok((await c.post(f"/politicas/{pol['id']}/estado", json={"estado": "aprobada"})).status_code == 200, "aprobada por su aprobador")
        ok((await c.post(f"/politicas/{pol['id']}/estado", json={"estado": "publicada"})).status_code == 200, "publicada")
        pend = (await c.get("/mis-politicas-pendientes")).json()
        ok(any(p["id"] == pol["id"] for p in pend), "aparece en mis políticas por aceptar")
        await c.post(f"/politicas/{pol['id']}/aceptar")
        pol = (await c.get(f"/politicas/{pol['id']}")).json()
        ok(pol["aceptaciones"] == 1, "aceptación registrada con nombre y versión")
        acep = (await c.get(f"/politicas/{pol['id']}/aceptaciones")).json()
        ok(any(a["usuario_id"] == 1 and a["fecha"] for a in acep), "lista de quién aceptó")
        base = {k: pol[k] for k in ("nombre", "tipo", "version", "alcance", "periodicidad_revision",
                                     "aceptaciones_requeridas", "propietario_id", "aprobador_id")}
        r = await c.put(f"/politicas/{pol['id']}", json={**base, "alcance": "Toda la empresa"})
        ok(r.status_code == 409, "no se cambia el texto de una política publicada sin subir versión")
        r = await c.put(f"/politicas/{pol['id']}", json={**base, "alcance": "Toda la empresa", "version": "2.0"})
        ok(r.status_code == 200 and r.json()["estado"] == "en_revision" and r.json()["aceptaciones"] == 0,
           "versión nueva vuelve a revisión y pide aceptaciones de nuevo", r.text[:200])

        # ── Auditoría, hallazgos, planes ──
        r = await c.post("/auditorias", json={"nombre": "PRUEBA Auditoría a tesorería", "tipo": "Interna",
                                              "auditor_lider_id": 1, "equipo": [1], "proceso": proceso,
                                              "marco": "COSO Control interno", "fecha_inicio": hoy.isoformat(),
                                              "fecha_fin": (hoy - timedelta(days=1)).isoformat()})
        ok(r.status_code == 422, "auditoría con fin antes del inicio se rechaza")
        r = await c.post("/auditorias", json={"nombre": "PRUEBA Auditoría a tesorería", "tipo": "Interna",
                                              "auditor_lider_id": 1, "equipo": [1], "proceso": proceso,
                                              "marco": "COSO Control interno"})
        ok(r.status_code == 201 and r.json()["equipo_nombres"], "auditoría con equipo de usuarios", r.text[:200])
        aud = r.json()
        r = await c.post("/hallazgos", json={"auditoria_id": aud["id"], "riesgo_id": rsk["id"], "control_id": ctl["id"],
                                             "titulo": "PRUEBA Pagos sin segunda firma", "tipo": "No conformidad menor",
                                             "severidad": "alta", "responsable_id": 1})
        ok(r.status_code == 201 and r.json()["fecha_limite"], "hallazgo con plazo por defecto", r.text[:200])
        hal = r.json()
        plan = (await c.post("/planes", json={"hallazgo_id": hal["id"], "accion": "Configurar doble firma",
                                              "responsable_id": 1, "avance": 50})).json()
        ok(plan["estado"] == "en_curso", "plan: el estado sigue al avance")
        cerrar = {k: hal[k] for k in ("auditoria_id", "riesgo_id", "control_id", "titulo", "tipo", "severidad",
                                       "responsable_id", "fecha_limite")}
        r = await c.put(f"/hallazgos/{hal['id']}", json={**cerrar, "estado": "cerrado"})
        ok(r.status_code == 409, "no se cierra un hallazgo con planes pendientes")
        await c.put(f"/planes/{plan['id']}", json={"hallazgo_id": hal["id"], "accion": plan["accion"],
                                                    "responsable_id": 1, "avance": 100})
        r = await c.put(f"/hallazgos/{hal['id']}", json={**cerrar, "estado": "cerrado"})
        ok(r.status_code == 200 and r.json()["estado"] == "cerrado", "con los planes completos se cierra")
        aud = (await c.get(f"/auditorias/{aud['id']}")).json()
        ok(aud["hallazgos"] == 1 and aud["hallazgos_abiertos"] == 0, "la auditoría cuenta sus hallazgos")

        # ── Incidentes ──
        r = await c.post("/incidentes", json={"titulo": "PRUEBA Pago duplicado", "tipo": "Fraude", "severidad": "alta",
                                              "urgencia": "media", "riesgo_id": rsk["id"], "control_id": ctl["id"],
                                              "estado": "cerrado", "perdida_estimada": 1500000})
        ok(r.status_code == 422, "incidente cerrado sin causa raíz se rechaza")
        r = await c.post("/incidentes", json={"titulo": "PRUEBA Pago duplicado", "tipo": "Fraude", "severidad": "alta",
                                              "urgencia": "media", "riesgo_id": rsk["id"], "control_id": ctl["id"],
                                              "perdida_estimada": 1500000})
        ok(r.status_code == 201 and r.json()["reportado_por_id"] == 1, "incidente: quien reporta es quien lo registra")
        inc = r.json()
        r = await c.post(f"/incidentes/{inc['id']}/hallazgo")
        ok(r.status_code == 201, "hallazgo generado desde el incidente")
        h2 = (await c.get(f"/hallazgos/{r.json()['id']}")).json()
        ok(h2["riesgo_id"] == rsk["id"] and h2["incidente_id"] == inc["id"], "el hallazgo hereda riesgo e incidente")

        # ── Continuidad ──
        r = await c.post("/continuidad", json={"proceso": proceso, "criticidad": "critica", "rto_horas": 48,
                                               "mtpd_horas": 24})
        ok(r.status_code == 422, "continuidad: RTO mayor que MTPD se rechaza")
        r = await c.post("/continuidad", json={"proceso": proceso, "criticidad": "critica", "rto_horas": 8,
                                               "rpo_horas": 4, "mtpd_horas": 24, "sistemas_criticos": ["erp", "WMS"],
                                               "responsable_id": 1, "ultima_revision": hoy.isoformat(),
                                               "periodicidad_revision": "Semestral"})
        ok(r.status_code == 201 and r.json()["sistemas_criticos"] == ["ERP", "WMS"], "continuidad: sistemas del catálogo", r.text[:200])
        bcp = r.json()
        r = await c.post("/simulacros", json={"continuidad_id": bcp["id"], "nombre": "PRUEBA Caída del ERP",
                                              "tipo": "Funcional", "resultado": "Exitoso", "coordinador_id": 1,
                                              "participantes": [1], "rto_logrado_horas": 6, "fecha": hoy.isoformat()})
        ok(r.status_code == 201, "simulacro con participantes", r.text[:200])
        bcp = (await c.get(f"/continuidad/{bcp['id']}")).json()
        ok(bcp["rto_cumplido"] is True and bcp["proxima_revision"], "continuidad: RTO logrado contra objetivo y próxima revisión")

        # ── Terceros ──
        r = await c.post("/terceros", json={"nombre": "PRUEBA Transportes del Norte", "tipo": "Transportador",
                                            "criticidad": "alta", "responsable_id": 1})
        ok(r.status_code == 201, "tercero creado", r.text[:200])
        ter = r.json()
        r = await c.post("/evaluaciones", json={"tercero_id": ter["id"], "cumplimiento_legal": 70, "riesgo_reputacional": 60,
                                                "solidez_financiera": 50, "seguridad_info": 60})
        ok(r.status_code == 201 and r.json()["clasificacion"] == "regular", "evaluación: puntaje 60 → regular", r.text[:200])
        ter = (await c.get(f"/terceros/{ter['id']}")).json()
        ok(ter["nivel_riesgo"] == "alto" and ter["ultimo_puntaje"] == 60, "el nivel de riesgo del tercero sale de su evaluación")

        # ── Evidencias ──
        r = await c.post("/evidencias/archivo", data={"referencia_tipo": "control", "referencia_id": str(ctl["id"]),
                                                      "tipo": "Registro"},
                         files={"archivo": ("muestra.txt", b"25 pagos revisados", "text/plain")})
        ok(r.status_code == 201, "evidencia con archivo subida", r.text[:200])
        ev = r.json()
        d = await c.get(f"/evidencias/{ev['id']}/descargar")
        ok(d.status_code == 200 and d.content == b"25 pagos revisados", "evidencia descargada")

        # ── Ficha, historial, agenda, tablero ──
        f = (await c.get(f"/ficha/riesgo/{rsk['id']}")).json()
        rel = f["relacionados"]
        ok(len(rel["controles"]) == 1 and len(rel["kris"]) == 1 and len(rel["incidentes"]) == 1
           and len(rel["hallazgos"]) == 2, "ficha del riesgo: controles, KRI, incidentes y hallazgos", str({k: len(v) for k, v in rel.items()}))
        ok(any(h["accion"] == "vincular" for h in f["historial"]), "historial del riesgo registra el vínculo")
        f = (await c.get(f"/ficha/control/{ctl['id']}")).json()
        ok(len(f["relacionados"]["pruebas"]) == 1 and len(f["relacionados"]["evidencias"]) == 1
           and len(f["relacionados"]["vinculos"]) == 1, "ficha del control: pruebas, evidencias y obligación")
        ag = (await c.get("/agenda", params={"dias": 365})).json()
        tipos = {i["tipo"] for i in ag["items"]}
        ok({"Prueba de control", "Sesión de comité", "Revisión de plan de continuidad"} <= tipos, "agenda con vencimientos", str(tipos))
        t = (await c.get("/tablero")).json()
        ok(t["controles"]["efectivos"] >= 1 and t["riesgos"]["total"] >= 1, "tablero")
        rep = (await c.get("/reporte-junta")).json()
        ok(any(m["marco"].startswith("ISO 27001") for m in rep["cumplimiento_por_marco"]), "reporte de junta por marco")
        resp = (await c.get("/responsables")).json()
        yo = next(x for x in resp if x["usuario_id"] == 1)
        ok(yo["riesgos"] >= 1 and yo["controles"] >= 1, "responsables por usuario, no por texto")

        # Retirar un control recalcula el riesgo
        await c.delete(f"/controles/{ctl['id']}")
        rsk = (await c.get(f"/riesgos/{rsk['id']}")).json()
        ok(rsk["nivel_residual"] == 20 and rsk["controles"] == 0, "retirar el control devuelve el riesgo a su nivel inherente")
        await c.delete(f"/sesiones/{sesion['id']}")
    finally:
        await sql("delete from usuarios where id = :i", i=sin_grc)
        await c.aclose()
    print(f"\n{OK} comprobaciones correctas")

asyncio.run(main())
