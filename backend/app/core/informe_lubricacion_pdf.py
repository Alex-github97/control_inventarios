"""
Informes PDF de lubricación para entregarle al cliente, firmados por el asesor.

Dos documentos:

  MUESTRA  Una hoja vertical por muestra, como un boletín de laboratorio pero
           con lo que el laboratorio no dice: qué le está pasando al equipo,
           contra qué norma se juzgó cada parámetro, cómo viene la tendencia y
           qué hacer. Cierra con el diagnóstico y la firma del asesor.

  FLOTA    El informe periódico del programa, en el formato de consultoría de
           los informes de llantas (portada con el logo del cliente, resumen
           ejecutivo, una página por idea con el título como conclusión).

Las cifras llegan ya calculadas por los mismos servicios que ve la pantalla;
aquí solo se redacta y se dibuja. `resumen_ejecutivo` y `estado_legible` son
puros y tienen pruebas.

LA FIRMA ES DE UNA PERSONA
El sistema interpreta con norma, pero el informe lo firma el asesor. Si el
asesor escribió un diagnóstico en la muestra, ese manda sobre la acción
automática y se rotula como suyo; si no, la recomendación se rotula «según el
criterio de norma», para que el cliente sepa quién dice qué.
"""
import io
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

from app.core.pdf_marca import (
    AZUL_NOCHE, FONDO, GRIS, GRIS_CLARO, MARCA, MESES, NEGRO, Encabezado, limpio, marca, medidas_logo,
    portada,
)

ROJO = (190, 48, 48)
AMBAR = (180, 110, 20)
VERDE = (39, 136, 74)
BARRA = (148, 163, 184)

SEVERIDAD = {
    "ACCION_INMEDIATA": ("ACCIÓN INMEDIATA", ROJO),
    "CRITICO": ("CRÍTICO", ROJO),
    "MARGINAL": ("PRECAUCIÓN", AMBAR),
    "ALERTA": ("PRECAUCIÓN", AMBAR),
    "NORMAL": ("NORMAL", VERDE),
    "PENDIENTE": ("SIN RESULTADO", GRIS),
}
UNIDAD = {"KM": "km", "HORAS": "h", "DIAS": "días"}
GRUPOS = (("DESGASTE", "Metales de desgaste"), ("CONTAMINACION", "Contaminantes"),
          ("ADITIVO", "Aditivos"), ("PROPIEDAD", "Propiedades del fluido"))


def num(v, dec: int = 0) -> str:
    """Número con la puntuación colombiana: 1.234.567,89."""
    if v is None:
        return "-"
    s = f"{v:,.{dec}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def valor(v) -> str:
    """Un resultado de laboratorio con los decimales que tiene, sin ceros de más."""
    if v is None:
        return "-"
    if abs(v) >= 100:
        return num(v, 0)
    return num(v, 2).rstrip("0").rstrip(",") if abs(v) < 10 else num(v, 1).rstrip("0").rstrip(",")


def fecha(v: Optional[datetime]) -> str:
    if not v:
        return "-"
    if isinstance(v, str):
        v = datetime.fromisoformat(v)
    return f"{v.day} de {MESES[v.month - 1]} de {v.year}"


def fecha_corta(v) -> str:
    if not v:
        return "-"
    if isinstance(v, str):
        v = datetime.fromisoformat(v)
    return f"{v:%d/%m/%Y}"


def estado_legible(estado: Optional[str]) -> Tuple[str, Tuple[int, int, int]]:
    """CONDENA/PRECAUCION/TENDENCIA del criterio de norma, o la severidad del sistema."""
    e = (estado or "").upper()
    if e in ("CONDENA", "CRITICO", "ACCION_INMEDIATA"):
        return "Condena", ROJO
    if e in ("PRECAUCION", "MARGINAL", "ALERTA"):
        return "Precaución", AMBAR
    if e == "TENDENCIA":
        return "Tendencia", AMBAR
    return "Normal", VERDE


@dataclass
class Asesor:
    nombre: Optional[str] = None
    cargo: Optional[str] = None
    credenciales: Optional[str] = None
    empresa: Optional[str] = None
    contacto: Optional[str] = None
    nota: Optional[str] = None
    firma_png: Optional[bytes] = None

    @property
    def completo(self) -> bool:
        return bool(self.nombre)


NOTA_POR_OMISION = (
    "La interpretación se apoya en los resultados del laboratorio tal como fueron reportados y en la "
    "información de operación registrada en el sistema. Los umbrales siguen las normas citadas, los "
    "límites del fabricante cuando existen y la estadística de la propia flota (ASTM D7720). La "
    "recomendación no sustituye la inspección del equipo; confirme el hallazgo antes de intervenir.")


# ─── Resumen ejecutivo (puro) ────────────────────────────────────────────────

def resumen_ejecutivo(d: Dict[str, Any]) -> List[str]:
    """Las frases del resumen del informe de flota, de lo más grave a lo demás.

    `d` trae: total_muestras, criticas, equipos_criticos, cobertura_pct,
    sin_historico, vencidos, proximos, parametros (lista con etiqueta,
    cantidad, origen), drenajes (etiqueta, cantidad, evitable), acierto_pct,
    confirmados, desmentidos.
    """
    frases: List[str] = []
    total = d.get("total_muestras") or 0
    if not total:
        return ["En el periodo no se registraron muestras con resultado: sin muestras no hay "
                "programa que evaluar, y el primer paso es establecer la rutina de toma."]

    criticas = d.get("criticas") or 0
    equipos = d.get("equipos_criticos") or 0
    if criticas:
        frases.append(
            f"{num(criticas)} de {num(total)} muestras ({num(100 * criticas / total, 1)} %) salieron críticas"
            + (f", en {num(equipos)} equipo(s) que requieren intervención" if equipos else "")
            + ". Son la prioridad: el detalle está en la página de equipos que requieren acción.")
    else:
        frases.append(f"Ninguna de las {num(total)} muestras del periodo salió crítica.")

    params = [p for p in (d.get("parametros") or []) if p.get("cantidad")]
    if params:
        p = params[0]
        origen = f" ({p['origen'].lower()})" if p.get("origen") else ""
        frases.append(f"El parámetro que más se sale de rango es {p['etiqueta']}{origen}: "
                      f"{num(p['cantidad'])} hallazgo(s).")

    cobertura = d.get("cobertura_pct")
    if cobertura is not None and cobertura < 80:
        frases.append(f"Solo el {num(cobertura, 1)} % de los compartimentos tiene muestra este año"
                      + (f"; {num(d.get('sin_historico') or 0)} nunca se han muestreado"
                         if d.get("sin_historico") else "")
                      + ". Lo que no se muestrea no se puede proteger: ampliar la cobertura es la "
                        "mejora de mayor retorno.")
    vencidos = d.get("vencidos") or 0
    if vencidos:
        frases.append(f"{num(vencidos)} compartimento(s) ya superaron su frecuencia de muestreo"
                      + (f" y {num(d.get('proximos') or 0)} están por hacerlo" if d.get("proximos") else "")
                      + ".")

    evitables = [x for x in (d.get("drenajes") or []) if x.get("evitable")]
    total_dren = sum(x.get("cantidad") or 0 for x in (d.get("drenajes") or []))
    if evitables and total_dren:
        n = sum(x.get("cantidad") or 0 for x in evitables)
        frases.append(f"{num(n)} de {num(total_dren)} cambios de aceite ({num(100 * n / total_dren)} %) "
                      "se hicieron por un motivo evitable: es aceite que se pudo haber aprovechado.")

    acierto = d.get("acierto_pct")
    verificados = (d.get("confirmados") or 0) + (d.get("desmentidos") or 0)
    if acierto is not None and verificados:
        frases.append(f"De {num(verificados)} diagnóstico(s) verificados al intervenir el equipo, "
                      f"el {num(acierto)} % se confirmó.")
    elif criticas:
        frases.append("Ningún diagnóstico se ha verificado todavía al intervenir el equipo. Registrar lo "
                      "que se encuentra es lo que permite medir si el análisis está acertando.")
    return frases


# ─── Dibujo común ────────────────────────────────────────────────────────────

def _pie(pdf, M: float, fuente: str):
    pdf.set_draw_color(*GRIS_CLARO)
    pdf.set_line_width(0.2)
    pdf.line(M, pdf.h - 12, pdf.w - M, pdf.h - 12)
    pdf.set_xy(M, pdf.h - 10.5)
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(*GRIS)
    pdf.cell(pdf.w - 2 * M - 80, 5, limpio(fuente)[:150])
    pdf.set_xy(pdf.w - M - 70, pdf.h - 10.5)
    marca(pdf, 7, GRIS, w=34, alto=5)
    pdf.set_xy(pdf.w - M - 30, pdf.h - 10.5)
    pdf.set_font("Helvetica", "", 6.5)
    pdf.cell(30, 5, limpio(f"{pdf.page_no()} / {{nb}}"), align="R")


def _firma(pdf, x: float, y: float, w: float, asesor: Asesor, cuando: datetime) -> float:
    """El bloque de firma: imagen, raya, nombre, cargo, credenciales, contacto."""
    if asesor.firma_png:
        try:
            ruta = io.BytesIO(asesor.firma_png)
            from PIL import Image
            with Image.open(io.BytesIO(asesor.firma_png)) as img:
                iw, ih = img.size
            alto = 16.0
            ancho = min(w * 0.8, alto * iw / ih)
            alto = ancho * ih / iw
            pdf.image(ruta, x=x, y=y + 16 - alto, w=ancho, h=alto)
        except Exception:   # noqa: BLE001 — una imagen ilegible no impide el informe
            pass
    y += 17
    pdf.set_draw_color(*AZUL_NOCHE)
    pdf.set_line_width(0.4)
    pdf.line(x, y, x + w, y)
    y += 1.5
    lineas = [
        (asesor.nombre or "Asesor de lubricación", "B", 9.5, NEGRO),
        (asesor.cargo, "", 8, GRIS),
        (asesor.credenciales, "", 8, GRIS),
        (asesor.empresa, "", 8, GRIS),
        (asesor.contacto, "", 7.5, GRIS),
        (f"Firmado el {fecha(cuando)}", "I", 7, GRIS),
    ]
    for texto, estilo, tam, color in lineas:
        if not texto:
            continue
        pdf.set_font("Helvetica", estilo, tam)
        pdf.set_text_color(*color)
        pdf.set_xy(x, y)
        pdf.cell(w, tam * 0.48, limpio(texto))
        y += tam * 0.5
    return y


def _logo(pdf, enc: Encabezado, x: float, y: float, ancho: float, alto: float) -> bool:
    if not enc.logo:
        return False
    try:
        lw, lh = medidas_logo(enc.logo, ancho, alto)
        pdf.image(enc.logo, x=x, y=y + (alto - lh) / 2, w=lw, h=lh)
        return True
    except Exception:   # noqa: BLE001
        return False


# ═════════════════════════════════════════════════════════════════════════════
# INFORME DE UNA MUESTRA
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class DatosMuestra:
    muestra: Dict[str, Any]                       # obtener_muestra
    fila: Optional[Dict[str, Any]] = None         # fila del tablero de interpretación
    historial: List[Dict[str, Any]] = field(default_factory=list)   # filas del mismo compartimento
    diagnostico: Optional[Dict[str, Any]] = None  # el del asesor, si lo escribió
    activo: Dict[str, Any] = field(default_factory=dict)  # placa, nombre, marca, linea, modelo
    producto: Optional[str] = None
    laboratorio: Optional[str] = None
    unidad_vida: Optional[str] = None


def generar_muestra(d: DatosMuestra, asesor: Asesor, enc: Encabezado) -> bytes:
    from fpdf import FPDF
    M = 16
    m = d.muestra

    class Hoja(FPDF):
        def footer(self):
            _pie(self, M, f"Muestra {m.get('numero')} · {enc.empresa}")

    pdf = Hoja(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, margin=18)
    pdf.add_page()
    W = pdf.w - 2 * M

    # ── Encabezado: logo del cliente a la izquierda, TittanWare a la derecha ──
    if not _logo(pdf, enc, M, 10, 48, 16):
        pdf.set_font("Times", "B", 14)
        pdf.set_text_color(*AZUL_NOCHE)
        pdf.set_xy(M, 14)
        pdf.cell(100, 6, limpio(enc.empresa))
    pdf.set_xy(pdf.w - M - 60, 13)
    marca(pdf, 11, AZUL_NOCHE, w=60, alinear="R")
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(*GRIS)
    pdf.set_xy(pdf.w - M - 80, 19)
    pdf.cell(80, 3, limpio("PROGRAMA DE ANÁLISIS DE ACEITE"), align="R")
    pdf.set_draw_color(*AZUL_NOCHE)
    pdf.set_line_width(0.6)
    pdf.line(M, 28, pdf.w - M, 28)

    pdf.set_font("Times", "B", 18)
    pdf.set_text_color(*AZUL_NOCHE)
    pdf.set_xy(M, 32)
    pdf.cell(W, 8, limpio("Informe de análisis de aceite"))
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRIS)
    pdf.set_xy(M, 40)
    act = d.activo
    pdf.cell(W, 5, limpio(f"{act.get('placa') or m.get('activo_codigo')} · {m.get('compartimento')}"
                          f" · muestra {m.get('numero')}"))

    # ── Ficha ────────────────────────────────────────────────────────────────
    u = UNIDAD.get((d.unidad_vida or "").upper(), (d.unidad_vida or "").lower())
    ficha = [
        ("Equipo", f"{act.get('placa') or '-'} · {act.get('nombre') or ''}"),
        ("Marca / línea", " · ".join(x for x in (act.get("marca"), act.get("linea"), act.get("modelo")) if x) or "-"),
        ("Compartimento", m.get("compartimento") or "-"),
        ("Lubricante", d.producto or "-"),
        ("Fecha de toma", fecha(m.get("fecha_toma"))),
        ("Laboratorio", d.laboratorio or "-"),
        ("Lectura del equipo", f"{num(m.get('medidor_equipo'), 1)} {u}" if m.get("medidor_equipo") is not None else "-"),
        ("Vida del aceite", f"{num(m.get('horas_aceite'), 1)} {u}" if m.get("horas_aceite") is not None else "-"),
    ]
    y = 48
    col = W / 2
    for i, (k, v) in enumerate(ficha):
        x = M + (i % 2) * col
        if i % 2 == 0 and i:
            y += 7
        pdf.set_font("Helvetica", "B", 6.5)
        pdf.set_text_color(*GRIS)
        pdf.set_xy(x, y)
        pdf.cell(32, 3.5, limpio(k.upper()))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*NEGRO)
        pdf.set_xy(x + 33, y - 0.6)
        pdf.cell(col - 35, 4.5, limpio(v)[:60])
    y += 10

    # ── Veredicto ────────────────────────────────────────────────────────────
    fila = d.fila or {}
    sev = fila.get("severidad_norma") or m.get("severidad") or "PENDIENTE"
    etiqueta, color = SEVERIDAD.get(sev, (sev, GRIS))
    pdf.set_fill_color(*color)
    pdf.rect(M, y, 2.2, 24, "F")
    pdf.set_fill_color(*FONDO)
    pdf.rect(M + 2.2, y, W - 2.2, 24, "F")
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*color)
    pdf.set_xy(M + 6, y + 3)
    pdf.cell(60, 3.5, limpio(etiqueta))
    pdf.set_font("Times", "B", 13)
    pdf.set_text_color(*AZUL_NOCHE)
    pdf.set_xy(M + 6, y + 7.5)
    pdf.cell(W - 10, 6, limpio(fila.get("patron") or ("Sin hallazgos" if sev == "NORMAL" else "Muestra evaluada")))
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*NEGRO)
    pdf.set_xy(M + 6, y + 14)
    lectura = fila.get("lectura") or ("Todos los parámetros medidos están dentro de los límites de referencia "
                                      "y sin cambios bruscos frente a la muestra anterior." if sev == "NORMAL"
                                      else "")
    pdf.multi_cell(W - 10, 4, limpio(lectura)[:330])
    y = max(pdf.get_y(), y + 24) + 5

    # ── Resultados ───────────────────────────────────────────────────────────
    detalle = {x["codigo"]: x for x in fila.get("detalle", [])}
    resultados = m.get("resultados") or []
    pdf.set_xy(M, y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*AZUL_NOCHE)
    pdf.cell(W, 5, limpio("Resultados del laboratorio"))
    y += 7
    cols = [("Parámetro", 0.30), ("Resultado", 0.13), ("Límite precaución / condena", 0.22),
            ("Cambio", 0.13), ("Estado", 0.22)]
    anchos = [W * c for _, c in cols]

    def encabezado_tabla(y):
        x = M
        pdf.set_font("Helvetica", "B", 6.8)
        pdf.set_text_color(*AZUL_NOCHE)
        for (t, _), a in zip(cols, anchos):
            pdf.set_xy(x + 1, y)
            pdf.cell(a - 2, 4, limpio(t))
            x += a
        pdf.set_draw_color(*AZUL_NOCHE)
        pdf.set_line_width(0.4)
        pdf.line(M, y + 4.6, M + W, y + 4.6)
        return y + 5.6

    y = encabezado_tabla(y)
    for clave, nombre_grupo in GRUPOS:
        filas = [r for r in resultados if r.get("grupo") == clave]
        if not filas:
            continue
        if y > pdf.h - 30:
            pdf.add_page(); y = encabezado_tabla(16)
        pdf.set_font("Helvetica", "B", 6.5)
        pdf.set_text_color(*GRIS)
        pdf.set_xy(M + 1, y + 0.5)
        pdf.cell(W, 3.5, limpio(nombre_grupo.upper()))
        y += 4.5
        for i, r in enumerate(filas):
            if y > pdf.h - 24:
                pdf.add_page(); y = encabezado_tabla(16)
            h = detalle.get(r.get("codigo"), {})
            lim = h.get("limite") or {}
            estado = h.get("estado") or r.get("estado")
            et, col = estado_legible(estado)
            if i % 2:
                pdf.set_fill_color(*FONDO)
                pdf.rect(M, y, W, 5, "F")
            unidad = f" {r.get('unidad')}" if r.get("unidad") and r.get("unidad") != "—" else ""
            res = r.get("valor_texto") or (valor(r.get("valor")) + unidad if r.get("valor") is not None else "-")
            limite = (f"{valor(lim.get('precaucion'))} / {valor(lim.get('condena'))}"
                      if lim.get("precaucion") is not None or lim.get("condena") is not None else "-")
            if lim.get("precaucion") == 0 and lim.get("condena") == 0:
                limite = "Debe estar ausente"     # glicol: ensayo cualitativo
            elif lim.get("direccion") == "BAJO" and limite != "-":
                limite = "min. " + limite
            tend = h.get("tendencia") or {}
            cambio = (f"{'+' if (tend.get('variacion') or 0) > 0 else ''}{num(tend.get('variacion'))} %"
                      if tend.get("variacion") is not None else
                      (f"{'+' if r['tasa_cambio'] > 0 else ''}{valor(r['tasa_cambio'])}/100"
                       if r.get("tasa_cambio") is not None else "-"))
            celdas = [(r.get("nombre"), "B", NEGRO), (res, "B" if et != "Normal" else "", NEGRO),
                      (limite, "", GRIS), (cambio, "", GRIS), (et, "B", col)]
            x = M
            for (texto, estilo, colr), a in zip(celdas, anchos):
                pdf.set_font("Helvetica", estilo, 7.4)
                pdf.set_text_color(*colr)
                pdf.set_xy(x + 1, y + 0.7)
                pdf.cell(a - 2, 3.8, limpio(texto)[:48])
                x += a
            y += 5
    pdf.set_draw_color(*GRIS_CLARO)
    pdf.set_line_width(0.2)
    pdf.line(M, y, M + W, y)
    if detalle:
        criterios = sorted({(x.get("limite") or {}).get("criterio") for x in detalle.values()} - {None})
        pdf.set_xy(M, y + 1.5)
        pdf.set_font("Helvetica", "I", 6.8)
        pdf.set_text_color(*GRIS)
        pdf.multi_cell(W, 3.4, limpio(
            "Los límites con norma o con la estadística de la flota se muestran en los parámetros con hallazgo. "
            "Criterios aplicados: " + (", ".join(criterios) or "-") + ". «Cambio» compara con la muestra "
            "anterior de la misma carga de aceite."))
        y = pdf.get_y()
    y += 5

    # ── Historial del compartimento ──────────────────────────────────────────
    hist = [h for h in d.historial if h.get("muestra_id") != m.get("id")][:5]
    if hist:
        if y > pdf.h - 50:
            pdf.add_page(); y = 16
        pdf.set_xy(M, y)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*AZUL_NOCHE)
        pdf.cell(W, 5, limpio("Muestras anteriores de este compartimento"))
        y += 7
        for h in hist:
            et, col = SEVERIDAD.get(h.get("severidad_norma") or "", ("-", GRIS))
            pdf.set_font("Helvetica", "", 7.6)
            pdf.set_text_color(*NEGRO)
            pdf.set_xy(M, y)
            pdf.cell(34, 4, limpio(fecha(h.get("fecha_toma"))))
            pdf.cell(28, 4, limpio(h.get("numero") or ""))
            pdf.set_font("Helvetica", "B", 7.2)
            pdf.set_text_color(*col)
            pdf.cell(30, 4, limpio(et))
            pdf.set_font("Helvetica", "", 7.6)
            pdf.set_text_color(*GRIS)
            pdf.cell(W - 92, 4, limpio(f"{h.get('patron') or ''} {('· ' + h['tipo']) if h.get('tipo') not in (None, '—') else ''}")[:90])
            y += 4.8
        y += 4

    # ── Diagnóstico y recomendación ──────────────────────────────────────────
    if y > pdf.h - 78:
        pdf.add_page(); y = 16
    pdf.set_xy(M, y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*AZUL_NOCHE)
    pdf.cell(W, 5, limpio("Diagnóstico y recomendación"))
    y += 7
    dg = d.diagnostico
    bloques: List[Tuple[str, str]] = []
    if dg:
        if dg.get("modo_falla"):
            bloques.append(("Modo de falla", dg["modo_falla"]))
        if dg.get("conclusion"):
            bloques.append(("Conclusión del asesor", dg["conclusion"]))
        if dg.get("recomendacion"):
            bloques.append(("Recomendación del asesor", dg["recomendacion"]))
    if not dg or not dg.get("recomendacion"):
        accion = fila.get("accion_sugerida") or ("Continuar con la frecuencia de muestreo establecida."
                                                 if sev == "NORMAL" else "")
        if accion:
            bloques.append(("Recomendación según el criterio de norma", accion))
    if fila.get("criterio"):
        bloques.append(("Fundamento", f"{fila['criterio']} ({', '.join(fila.get('fuentes') or [])})"
                        if fila.get("fuentes") else fila["criterio"]))
    for titulo, texto in bloques:
        pdf.set_xy(M, y)
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(*GRIS)
        pdf.cell(W, 3.5, limpio(titulo.upper()))
        pdf.set_xy(M, y + 4)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*NEGRO)
        pdf.multi_cell(W, 4.4, limpio(texto))
        y = pdf.get_y() + 3

    # ── Firma ────────────────────────────────────────────────────────────────
    if y > pdf.h - 62:
        pdf.add_page(); y = 16
    y += 4
    _firma(pdf, M, y, 80, asesor, enc.generado_en)
    pdf.set_xy(M + 95, y + 2)
    pdf.set_font("Helvetica", "I", 6.8)
    pdf.set_text_color(*GRIS)
    pdf.multi_cell(W - 95, 3.4, limpio(asesor.nota or NOTA_POR_OMISION))
    return bytes(pdf.output())


# ═════════════════════════════════════════════════════════════════════════════
# INFORME DE FLOTA
# ═════════════════════════════════════════════════════════════════════════════

@dataclass
class DatosFlota:
    periodo: str
    programa: Dict[str, Any]
    cobertura: Dict[str, Any]
    criticos: List[Dict[str, Any]]          # filas del tablero en CRITICO
    resumen_norma: Dict[str, int]           # CRITICO/ALERTA/NORMAL del tablero
    pendientes: List[Dict[str, Any]]
    descripcion: str = ""


def _datos_resumen(d: DatosFlota) -> Dict[str, Any]:
    p, c = d.programa, d.cobertura
    dg = p.get("diagnostico") or {}
    conteo = {"VENCIDO": 0, "PROXIMO": 0, "SIN_HISTORIA": 0}
    for x in d.pendientes:
        conteo[x.get("estado", "")] = conteo.get(x.get("estado", ""), 0) + 1
    return {
        "total_muestras": p.get("total_muestras"),
        "criticas": p.get("criticas"),
        "equipos_criticos": len({x.get("placa") for x in d.criticos}),
        "cobertura_pct": c.get("cobertura_pct"),
        "sin_historico": len(c.get("sin_historico") or []),
        "vencidos": conteo["VENCIDO"], "proximos": conteo["PROXIMO"],
        "parametros": p.get("parametros") or [],
        "drenajes": p.get("drenajes") or [],
        "acierto_pct": dg.get("acierto_pct"),
        "confirmados": dg.get("confirmados"), "desmentidos": dg.get("desmentidos"),
    }


def generar_flota(d: DatosFlota, asesor: Asesor, enc: Encabezado) -> bytes:
    from fpdf import FPDF
    from app.core.informe_rendimiento_pdf import Lienzo

    M = 16
    fuente = f"Fuente: programa de análisis de aceite · {d.descripcion or d.periodo}"

    class Informe(FPDF):
        def footer(self):
            if self.page_no() == 1:
                return
            _pie(self, M, fuente)

    pdf = Informe(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.alias_nb_pages()
    lz = Lienzo(pdf, M)
    W = pdf.w - 2 * M
    p, c = d.programa, d.cobertura
    r = _datos_resumen(d)
    total = p.get("total_muestras") or 0

    portada(pdf, enc, "Programa de análisis de aceite",
            "Estado de la flota, equipos que requieren acción y disciplina del muestreo",
            [f"{num(total)} muestras", f"{num(c.get('compartimentos_analizables'))} compartimentos",
             f"Cobertura {num(c.get('cobertura_pct'), 1)} %"],
            etiqueta="INFORME DE ASESORÍA EN LUBRICACIÓN")

    # ── Resumen ejecutivo ────────────────────────────────────────────────────
    frases = resumen_ejecutivo(r)
    y = lz.pagina("Resumen ejecutivo", frases[0] if len(frases[0]) < 140 else "Lo más importante del periodo",
                  d.descripcion or d.periodo)
    pct_crit = f"{num(100 * (p.get('criticas') or 0) / total, 1)} %" if total else "-"
    acierto = p.get("diagnostico", {}).get("acierto_pct")
    y = lz.kpis(y, [
        ("Muestras", num(total), d.periodo),
        ("Críticas", num(p.get("criticas")), f"{pct_crit} del total"),
        ("Cobertura", f"{num(c.get('cobertura_pct'), 1)} %", "Compartimentos con muestra este año"),
        ("Muestreo vencido", num(r["vencidos"]), f"y {num(r['proximos'])} por vencer"),
        ("Acierto del diagnóstico", f"{num(acierto)} %" if acierto is not None else "-",
         "Verificado al intervenir" if acierto is not None else "Sin verificaciones aún"),
    ])
    lz.puntos(M, y + 4, W * 0.72, frases)

    # ── Equipos que requieren acción ─────────────────────────────────────────
    # Primero agrupado por hallazgo —qué pasa, en cuántos equipos y qué hacer,
    # con la acción completa una sola vez—; después el detalle equipo por
    # equipo. Repetir la misma acción treinta veces en una tabla la corta y no
    # agrega nada.
    crit = d.criticos
    equipos = len({x.get("placa") for x in crit})
    grupos = agrupar_por_hallazgo(crit)
    titulo = (f"{num(equipos)} equipo(s) requieren acción: la causa más frecuente es «{grupos[0]['patron']}»"
              if crit else "Ningún equipo requiere acción inmediata en el periodo")
    y = lz.pagina("Equipos que requieren acción", titulo,
                  "Equipos cuya última muestra es crítica según el criterio de norma, agrupados por lo que está pasando.")
    if not crit:
        lz.texto(M, y, "Sin muestras críticas en el periodo.", 9, "", GRIS)
    for g in grupos:
        if y > lz.fondo - 26:
            y = lz.pagina("Equipos que requieren acción", "Equipos que requieren acción (continuación)")
        pdf.set_fill_color(*ROJO)
        pdf.rect(M, y, 1.6, 5.5, "F")
        lz.texto(M + 4, y + 0.6, f"{g['patron']}", 11, "B", AZUL_NOCHE, W * 0.6, fuente="Times")
        lz.texto(M + W * 0.6, y + 1, f"{num(g['equipos'])} equipo(s) · {num(g['muestras'])} muestra(s)",
                 8, "B", ROJO, W * 0.4 - 2, "R")
        pdf.set_xy(M + 4, y + 6.5)
        pdf.set_font("Helvetica", "", 8.6)
        pdf.set_text_color(*NEGRO)
        pdf.multi_cell(W - 4, 4.2, limpio(f"Qué hacer: {g['accion']}"))
        pdf.set_xy(M + 4, pdf.get_y() + 0.6)
        pdf.set_font("Helvetica", "", 7.4)
        pdf.set_text_color(*GRIS)
        placas = g["placas"]
        pdf.multi_cell(W - 4, 3.6, limpio("Equipos: " + ", ".join(placas[:40])
                                          + (f" y {len(placas) - 40} más" if len(placas) > 40 else "")))
        y = pdf.get_y() + 5
    if crit:
        filas = [[x.get("placa") or "-", x.get("compartimento") or "-", fecha_corta(x.get("fecha_toma")),
                  x.get("tipo") or "-", x.get("patron") or "-",
                  SEVERIDAD.get(x.get("severidad_norma") or "", ("-",))[0].capitalize()] for x in crit]
        y = lz.pagina("Equipos que requieren acción", "Detalle por equipo",
                      "Cada muestra crítica con su hallazgo. El orden es de la más urgente a la menos urgente.")
        TOPE = 60
        resto = filas[:TOPE]
        if len(filas) > TOPE:
            y = 2 + lz.nota(M, y, W, f"Se listan las {TOPE} más urgentes de {num(len(filas))}. La lista "
                                        "completa está en la pantalla de interpretación, pestaña Conclusiones.")
        while resto:
            y, resto = lz.tabla(M, y, W, [("Placa", 12, "L"), ("Compartimento", 18, "L"), ("Fecha", 12, "L"),
                                          ("Hallazgo (parámetros fuera de rango)", 30, "L"),
                                          ("Qué está pasando", 32, "L"), ("Severidad", 16, "L")],
                                resto, alto=5.2, tam=7.2)
            if resto:
                y = lz.pagina("Equipos que requieren acción", "Detalle por equipo (continuación)")

    # ── Qué está fallando ────────────────────────────────────────────────────
    params = [x for x in (p.get("parametros") or []) if x.get("cantidad")]
    titulo = (f"{params[0]['etiqueta']} es el parámetro que más se sale de rango"
              if params else "Ningún parámetro se salió de rango en el periodo")
    y = lz.pagina("Qué está fallando", titulo,
                  "Hallazgos por parámetro y muestras críticas por marca de vehículo.")
    mitad = (W - 10) / 2
    lz.barras(M, y, mitad, "Hallazgos por parámetro",
              [(x["etiqueta"], float(x["cantidad"])) for x in params[:14]], lambda v: num(v))
    marcas = (p.get("por_marca") or {}).get("grupos") or []
    lz.barras(M + mitad + 10, y, mitad, "Muestras críticas por cada 100, por marca",
              [(x["etiqueta"], 100 * (x.get("criticas") or 0) / x["cantidad"])
               for x in sorted(marcas, key=lambda g: -(g.get("criticas") or 0) / max(g["cantidad"], 1))
               if x.get("cantidad")][:14],
              lambda v: num(v, 1), mejor_menor=True)

    # ── Disciplina del muestreo ──────────────────────────────────────────────
    venc = [x for x in d.pendientes if x.get("estado") == "VENCIDO"]
    titulo = (f"{num(len(venc))} compartimento(s) tienen el muestreo vencido" if venc
              else "El muestreo está al día")
    y = lz.pagina("Disciplina del muestreo", titulo,
                  "Lo que no se muestrea no se puede proteger. Se cuenta desde la última toma de la carga "
                  "viva contra la frecuencia de cada compartimento.")
    y = lz.kpis(y, [
        ("Compartimentos", num(c.get("compartimentos_analizables")), "Con seguimiento"),
        ("Con muestra este año", num(c.get("con_muestra_en_el_anio")), f"{num(c.get('cobertura_pct'), 1)} %"),
        ("Nunca muestreados", num(r["sin_historico"]), "Sin línea base"),
        ("Vencidos", num(r["vencidos"]), "Superaron la frecuencia"),
        ("Por vencer", num(r["proximos"]), "Más del 90 %"),
    ])
    if venc:
        filas = [[x.get("activo") or "-", x.get("compartimento") or "-",
                  f"{num(x.get('desde_ultima'))} {UNIDAD.get((x.get('unidad') or '').upper(), '')}",
                  f"{num(x.get('frecuencia_muestreo'))}", f"{num(x.get('avance_pct'))} %",
                  fecha_corta(x.get("ultima_muestra")) if x.get("ultima_muestra") else "Nunca"] for x in venc]
        y += 3
        while filas:
            y, filas = lz.tabla(M, y, W, [("Equipo", 14, "L"), ("Compartimento", 22, "L"),
                                          ("Desde la última toma", 18, "R"), ("Frecuencia", 12, "R"),
                                          ("Avance", 10, "R"), ("Última muestra", 20, "L")], filas)
            if filas:
                y = lz.pagina("Disciplina del muestreo", "Muestreo vencido (continuación)")

    # ── Costo y vida del aceite ──────────────────────────────────────────────
    drenajes = p.get("drenajes") or []
    total_dren = sum(x.get("cantidad") or 0 for x in drenajes)
    evitables = sum(x.get("cantidad") or 0 for x in drenajes if x.get("evitable"))
    titulo = (f"{num(100 * evitables / total_dren)} % de los cambios de aceite fueron por un motivo evitable"
              if total_dren and evitables else "Costo y vida del aceite")
    y = lz.pagina("Costo y vida del aceite", titulo,
                  "Por qué se cambia el aceite, cuánto rinde, y cuánto cuesta cada unidad de vida lubricada "
                  "(aceite, filtro, mano de obra y rellenos).")
    lz.barras(M, y, mitad, "Cambios de aceite por motivo",
              [(x["etiqueta"] + (" (evitable)" if x.get("evitable") else ""), float(x["cantidad"]))
               for x in drenajes[:12]], lambda v: num(v))
    costos = p.get("costos") or []
    filas = [[x["etiqueta"], UNIDAD.get((x.get("unidad") or "").upper(), x.get("unidad") or ""),
              num(x.get("cargas")), f"${num(x.get('costo_total'))}",
              f"${num(x.get('costo_por_unidad'), 2)}" if x.get("costo_por_unidad") is not None else "-"]
             for x in costos]
    if filas:
        lz.texto(M + mitad + 10, y, "Costo por unidad de vida", 8.5, "B", NEGRO, mitad)
        lz.tabla(M + mitad + 10, y + 6, mitad, [("Compartimento", 30, "L"), ("Unidad", 10, "L"),
                                                ("Cargas", 12, "R"), ("Costo total", 22, "R"),
                                                ("Por unidad", 18, "R")], filas, resaltar=4)

    # ── Firma ────────────────────────────────────────────────────────────────
    y = lz.pagina("Firma y alcance", "Responsable del informe",
                  "Quién interpreta, con qué criterio, y hasta dónde llega la recomendación.")
    _firma(pdf, M, y + 4, 90, asesor, enc.generado_en)
    pdf.set_xy(M + 110, y + 6)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*NEGRO)
    pdf.multi_cell(W - 110, 4.4, limpio(asesor.nota or NOTA_POR_OMISION))
    pdf.set_xy(M + 110, pdf.get_y() + 4)
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(*GRIS)
    pdf.multi_cell(W - 110, 3.8, limpio(
        "Métodos de ensayo y criterios: ASTM D5185 (metales), ASTM D445 (viscosidad), ASTM D2896 / D4739 "
        "(TBN), ASTM D664 (TAN), ASTM D6304 (agua), ASTM D2982 (glicol), ISO 4406 (limpieza), ASTM D7720 "
        "(límites estadísticos de la flota), SAE J300 (grados de viscosidad), y la práctica publicada por "
        "ICML. Los límites ajustados por la empresa se identifican como tales en el sistema."))
    return bytes(pdf.output())


def agrupar_por_hallazgo(filas: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Las muestras críticas agrupadas por patrón, del que más equipos toca al
    que menos. La acción es la del asesor si la escribió en alguna, y si no la
    del criterio de norma."""
    grupos: Dict[str, Dict[str, Any]] = {}
    for x in filas:
        k = x.get("patron") or "Sin patrón definido"
        g = grupos.setdefault(k, {"patron": k, "muestras": 0, "placas": [], "accion": None,
                                  "de_persona": False})
        g["muestras"] += 1
        if x.get("placa") and x["placa"] not in g["placas"]:
            g["placas"].append(x["placa"])
        if x.get("accion_de_persona") and not g["de_persona"]:
            g["accion"], g["de_persona"] = x.get("accion_sugerida"), True
        elif not g["accion"]:
            g["accion"] = x.get("accion_sugerida")
    salida = []
    for g in grupos.values():
        g["equipos"] = len(g["placas"])
        g["accion"] = g["accion"] or "Revisar el equipo."
        salida.append(g)
    return sorted(salida, key=lambda g: (-g["equipos"], -g["muestras"]))
