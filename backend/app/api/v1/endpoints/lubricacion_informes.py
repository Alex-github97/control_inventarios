"""
Lubricación — informes PDF para el cliente, firmados por el asesor.

  GET/PUT  /eam/lube/informes/asesor        quién firma (nombre, cargo, credenciales…)
  PUT      /eam/lube/informes/asesor/firma  la imagen de la firma (PNG o JPG)
  DELETE   /eam/lube/informes/asesor/firma
  GET      /eam/lube/informes/muestra/{id}  el informe de una muestra
  GET      /eam/lube/informes/flota         el informe periódico del programa

Los PDF se arman con los mismos servicios que ve la pantalla —el tablero de
interpretación, el programa, la cobertura y los pendientes—, así que el informe
y la pantalla no pueden decir cosas distintas. El dibujo está en
`core/informe_lubricacion_pdf.py`.
"""
import asyncio
import io
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.eam_neumaticos_tableros import _empresa
from app.api.v1.endpoints.lubricacion_analitica import pendientes
from app.api.v1.endpoints.lubricacion_flota import FiltroFlota, programa
from app.api.v1.endpoints.lubricacion_interpretacion import cobertura, tablero
from app.api.v1.endpoints.lubricacion_operacion import obtener_muestra, unidad_efectiva
from app.core import informe_lubricacion_pdf as ilp
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.pdf_marca import Encabezado
from app.infrastructure.models.eam import EAMActivo
from app.infrastructure.models.lubricacion import (
    LubeAsesor, LubeCarga, LubeCompartimento, LubeDiagnostico, LubeLaboratorio,
    LubeModoFalla, LubeMuestra, LubeProducto, LubeTipoCompartimento,
)
from app.infrastructure.models.usuario import Usuario

router = APIRouter(prefix="/eam/lube/informes", tags=["CMMS/EAM · Lubricación"])

MAX_FIRMA = 400 * 1024


class AsesorIn(BaseModel):
    nombre: Optional[str] = None
    cargo: Optional[str] = None
    credenciales: Optional[str] = None
    empresa: Optional[str] = None
    contacto: Optional[str] = None
    nota: Optional[str] = None


class AsesorOut(AsesorIn):
    tiene_firma: bool = False


async def _asesor(db: AsyncSession) -> LubeAsesor:
    a = await db.get(LubeAsesor, 1)
    if a is None:
        a = LubeAsesor(id=1)
        db.add(a)
        await db.flush()
    return a


def _salida(a: LubeAsesor) -> AsesorOut:
    return AsesorOut(nombre=a.nombre, cargo=a.cargo, credenciales=a.credenciales,
                     empresa=a.empresa, contacto=a.contacto, nota=a.nota,
                     tiene_firma=bool(a.firma_png))


@router.get("/asesor", response_model=AsesorOut)
async def ver_asesor(db: AsyncSession = Depends(get_db)):
    a = await db.get(LubeAsesor, 1)
    return _salida(a) if a else AsesorOut()


@router.put("/asesor", response_model=AsesorOut)
async def guardar_asesor(data: AsesorIn, db: AsyncSession = Depends(get_db)):
    a = await _asesor(db)
    for k, v in data.model_dump().items():
        setattr(a, k, (v or "").strip() or None)
    await db.commit()
    return _salida(a)


@router.put("/asesor/firma", response_model=AsesorOut)
async def subir_firma(archivo: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """La firma escaneada o dibujada. Se normaliza a PNG para que el PDF la lea
    siempre igual, y se recorta el blanco alrededor para que no quede flotando."""
    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(400, "El archivo está vacío")
    if len(contenido) > 4 * 1024 * 1024:
        raise HTTPException(413, "La imagen pesa más de 4 MB")

    def normalizar() -> bytes:
        from PIL import Image, ImageChops
        with Image.open(io.BytesIO(contenido)) as img:
            img = img.convert("RGBA")
            fondo = Image.new("RGBA", img.size, (255, 255, 255, 255))
            caja = ImageChops.difference(Image.alpha_composite(fondo, img).convert("RGB"),
                                         fondo.convert("RGB")).getbbox()
            if caja:
                img = img.crop(caja)
            img.thumbnail((900, 300))
            salida = io.BytesIO()
            img.save(salida, "PNG", optimize=True)
            return salida.getvalue()

    try:
        png = await asyncio.to_thread(normalizar)
    except Exception:   # noqa: BLE001
        raise HTTPException(400, "No se pudo leer la imagen: suba un PNG o un JPG")
    if len(png) > MAX_FIRMA:
        raise HTTPException(413, "La firma es demasiado grande; recórtela a la firma sola")
    a = await _asesor(db)
    a.firma_png = png
    await db.commit()
    return _salida(a)


@router.delete("/asesor/firma", response_model=AsesorOut)
async def borrar_firma(db: AsyncSession = Depends(get_db)):
    a = await _asesor(db)
    a.firma_png = None
    await db.commit()
    return _salida(a)


@router.get("/asesor/firma")
async def ver_firma(db: AsyncSession = Depends(get_db)):
    a = await db.get(LubeAsesor, 1)
    if not a or not a.firma_png:
        raise HTTPException(404, "No hay firma cargada")
    return Response(a.firma_png, media_type="image/png")


def _asesor_pdf(a: Optional[LubeAsesor]) -> ilp.Asesor:
    if not a:
        return ilp.Asesor()
    return ilp.Asesor(nombre=a.nombre, cargo=a.cargo, credenciales=a.credenciales,
                      empresa=a.empresa, contacto=a.contacto, nota=a.nota, firma_png=a.firma_png)


def _filtro(**kw) -> FiltroFlota:
    return FiltroFlota(**{k: kw.get(k) for k in
                          ("marca", "linea", "modelo", "tipo", "motor", "placa", "compartimento")})


def _quien(u: Usuario) -> str:
    return f"{u.nombre} {getattr(u, 'apellido', '') or ''}".strip() or u.username


def _pdf(contenido: bytes, nombre: str) -> Response:
    return Response(contenido, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{nombre}"',
                             "Access-Control-Expose-Headers": "Content-Disposition"})


@router.get("/muestra/{mid}")
async def informe_muestra(mid: int, db: AsyncSession = Depends(get_db),
                          yo: Usuario = Depends(get_current_user)):
    m = await obtener_muestra(mid, db=db)
    muestra = await db.get(LubeMuestra, mid)
    comp = await db.get(LubeCompartimento, muestra.compartimento_id)
    act = await db.get(EAMActivo, comp.activo_id)
    tipo = await db.get(LubeTipoCompartimento, comp.tipo_compartimento_id)
    if not m.get("resultados"):
        raise HTTPException(409, "La muestra todavía no tiene resultados: no hay qué informar")

    # La interpretación sale del mismo tablero que ve la pantalla, acotado a
    # esta placa y a una ventana que alcance la fecha de la muestra.
    dias = min(1825, max(30, (datetime.utcnow() - muestra.fecha_toma).days + 2))
    t = await tablero(dias=dias, solo_con_hallazgo=False, estado=None, limite=2000,
                      desplazamiento=0, f=_filtro(placa=act.codigo), db=db)
    filas = [x for x in t["filas"] if x["compartimento_id"] == comp.id]
    fila = next((x for x in filas if x["muestra_id"] == mid), None)
    historial = sorted([x for x in filas if x["fecha_toma"] < muestra.fecha_toma],
                       key=lambda x: x["fecha_toma"], reverse=True)

    producto = None
    if muestra.carga_id:
        carga = await db.get(LubeCarga, muestra.carga_id)
        if carga and carga.producto_id:
            prod = await db.get(LubeProducto, carga.producto_id)
            producto = prod.nombre if prod else None
    lab = await db.get(LubeLaboratorio, muestra.laboratorio_id) if muestra.laboratorio_id else None

    diag = (await db.execute(select(LubeDiagnostico).where(LubeDiagnostico.muestra_id == mid)
                             .order_by(LubeDiagnostico.id.desc()))).scalars().first()
    diagnostico = None
    if diag:
        modo = await db.get(LubeModoFalla, diag.modo_falla_id) if diag.modo_falla_id else None
        diagnostico = {"modo_falla": modo.nombre if modo else None, "conclusion": diag.conclusion,
                       "recomendacion": diag.recomendacion}

    empresa, logo = await _empresa(db)
    enc = Encabezado(empresa=empresa, periodo=ilp.fecha(muestra.fecha_toma), generado_por=_quien(yo),
                     generado_en=datetime.now(), logo=logo)
    datos = ilp.DatosMuestra(
        muestra=m, fila=fila, historial=historial, diagnostico=diagnostico,
        activo={"placa": act.placa or act.codigo, "nombre": act.nombre, "marca": act.marca,
                "linea": act.linea, "modelo": act.modelo},
        producto=producto, laboratorio=lab.nombre if lab else None,
        unidad_vida=unidad_efectiva(tipo.unidad_vida if tipo else None,
                                    act.odometro_actual, act.horometro_actual))
    contenido = await asyncio.to_thread(ilp.generar_muestra, datos,
                                        _asesor_pdf(await db.get(LubeAsesor, 1)), enc)
    return _pdf(contenido, f"analisis-aceite-{muestra.numero}.pdf")


@router.get("/flota")
async def informe_flota(
    dias: int = Query(365, ge=30, le=1825),
    marca: Optional[str] = None, linea: Optional[str] = None, modelo: Optional[str] = None,
    tipo: Optional[str] = None, motor: Optional[str] = None, placa: Optional[str] = None,
    compartimento: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    yo: Usuario = Depends(get_current_user),
):
    f = _filtro(marca=marca, linea=linea, modelo=modelo, tipo=tipo, motor=motor, placa=placa,
                compartimento=compartimento)
    prog = await programa(dias=dias, f=f, db=db)
    cob = await cobertura(anio=None, f=f, db=db)
    # Sin tope: el corte por página de la pantalla dejaría fuera justo las recientes.
    crit = await tablero(dias=dias, solo_con_hallazgo=True, estado="CRITICO", limite=10**9,
                         desplazamiento=0, f=f, db=db)
    # Un equipo requiere acción si su ÚLTIMA muestra es crítica. Una crítica de
    # marzo seguida de una normal en junio ya se atendió: contarla llenaba el
    # informe de equipos que están bien.
    ultima = dict((await db.execute(
        select(LubeMuestra.compartimento_id, func.max(LubeMuestra.fecha_toma))
        .where(LubeMuestra.estado != "ANULADA").group_by(LubeMuestra.compartimento_id))).all())
    criticos = [x for x in crit["filas"] if ultima.get(x["compartimento_id"]) == x["fecha_toma"]]
    pend = await pendientes(db=db)
    if f.activo:
        # La lista de pendientes es de toda la flota: se acota a los
        # compartimentos del segmento con el mismo filtro de los demás.
        q = f.aplicar(select(LubeCompartimento.id)
                      .join(EAMActivo, EAMActivo.id == LubeCompartimento.activo_id)
                      .join(LubeTipoCompartimento,
                            LubeTipoCompartimento.id == LubeCompartimento.tipo_compartimento_id))
        del_segmento = {i for (i,) in (await db.execute(q)).all()}
        pend = [x for x in pend if x["compartimento_id"] in del_segmento]

    segmento = " · ".join(v for v in (marca, linea, modelo, tipo, motor, placa, compartimento) if v)
    periodo = "Último año" if dias == 365 else f"Últimos {dias} días"
    descripcion = f"{periodo}{' · ' + segmento if segmento else ' · toda la flota'}"
    empresa, logo = await _empresa(db)
    enc = Encabezado(empresa=empresa, periodo=descripcion, generado_por=_quien(yo),
                     generado_en=datetime.now(), logo=logo)
    datos = ilp.DatosFlota(periodo=periodo, programa=prog, cobertura=cob, criticos=criticos,
                           resumen_norma=crit.get("resumen") or {}, pendientes=pend,
                           descripcion=descripcion)
    contenido = await asyncio.to_thread(ilp.generar_flota, datos,
                                        _asesor_pdf(await db.get(LubeAsesor, 1)), enc)
    return _pdf(contenido, f"programa-aceite-{date.today():%Y%m%d}.pdf")
