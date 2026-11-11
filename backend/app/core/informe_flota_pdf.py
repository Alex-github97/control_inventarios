"""
Informe PDF del estado de llantas de la flota, con la última inspección.

Primero una portada (logo del cliente al centro, firma de TittanWare al pie),
luego el resumen ejecutivo (cifras, repartos y novedades por tipo) y después
una página por vehículo: el esquema de ejes a la izquierda, con cada llanta
coloreada según su estado, y a la derecha la tabla por posición con las tres
profundidades, la presión y las novedades, seguida de las sugerencias.

`resumir` es puro y tiene pruebas. `generar` solo dibuja; corre en un hilo
aparte porque una flota grande son miles de páginas de trabajo de CPU.

El esquema se dibuja con primitivas (no es una captura de pantalla), con la
misma lectura que el diagrama de «Llantas por vehículo»: frente arriba, ejes
de arriba abajo y chasis al centro.
"""
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from app.core.neumaticos_flota import VehiculoFlota
from app.core.neumaticos_novedades import TIPOS_NOVEDAD, LlantaInsp, Novedad, Sugerencia, Umbrales
from app.core.pdf_marca import (  # noqa: F401 — Encabezado y limpio se siguen importando desde aquí
    AZUL_NOCHE, FONDO, GRIS, GRIS_CLARO, MARCA, NEGRO, Encabezado, limpio, marca as _marca,
    medidas_logo as _medidas_logo, portada,
)

SIN_DATO = "Sin dato"

NOVEDAD_CORTA = {"PROFUNDIDAD_MINIMA": "Bajo mín.", "PROFUNDIDAD_ALERTA": "Cerca mín.", "PRESION": "Presión",
                 "DESALINEACION": "Alineación", "DESGASTE_IRREGULAR": "Irregular", "ESTADO_VISUAL": "Visual"}
TIPO_SUGERENCIA = {"ROTACION": "Rotación", "REENCAUCHE": "Reencauche", "RETIRO": "Retiro", "PRESION": "Presión",
                   "ALINEACION": "Alineación", "OTRO": "Otras"}

# Colores (los de la marca vienen de pdf_marca)
VERDE = (22, 163, 74)
AMBAR = (217, 119, 6)
ROJO = (220, 38, 38)
SIN_INSP = (148, 163, 184)


# ─── Resumen ejecutivo ────────────────────────────────────────────────────────

@dataclass
class Resumen:
    vehiculos_alcance: int = 0
    vehiculos_inspeccionados: int = 0
    llantas_montadas: int = 0
    llantas_inspeccionadas: int = 0
    novedades: int = 0
    llantas_con_novedad: int = 0
    profundidad_promedio: Optional[float] = None
    bajo_minimo: int = 0
    ir: Optional[float] = None
    por_marca: List[tuple] = field(default_factory=list)          # (valor, cantidad)
    por_dimension: List[tuple] = field(default_factory=list)
    por_tipo_vehiculo: List[tuple] = field(default_factory=list)
    por_novedad: List[tuple] = field(default_factory=list)        # (tipo, nombre, cantidad, %)
    por_sugerencia: List[tuple] = field(default_factory=list)     # (nombre, cantidad)
    sugerencias: int = 0
    # Composición a piso y estado (histograma bueno / regular / crítico).
    por_vida: List[tuple] = field(default_factory=list)
    por_referencia: List[tuple] = field(default_factory=list)
    por_estado: List[tuple] = field(default_factory=list)          # (Bueno|Regular|Crítico, cantidad)
    # Lo que el inspector anotó en campo (TittanLite): novedades marcadas y las
    # observaciones que más se repiten.
    novedades_campo: List[tuple] = field(default_factory=list)
    observaciones: List[tuple] = field(default_factory=list)


def estado_de(pmin: Optional[float], u: Umbrales) -> Optional[str]:
    """Bueno, regular o crítico por la profundidad mínima de la llanta."""
    if pmin is None:
        return None
    if pmin <= u.profundidad_minima:
        return "Crítico"
    if pmin <= u.profundidad_minima + u.margen_alerta:
        return "Regular"
    return "Bueno"


def resumir(flota: List[VehiculoFlota], nov: Dict[int, List[Novedad]], sug: Dict[int, List[Sugerencia]],
            u: Umbrales) -> Resumen:
    """Las cifras de la primera página. Solo cuentan las llantas del filtro, y
    como inspeccionadas solo las que tienen inspección en el periodo."""
    r = Resumen(vehiculos_alcance=len(flota))
    montadas = [ll for v in flota for ll in v.llantas if ll.en_filtro]
    insp = [ll for ll in montadas if ll.inspeccionada]
    r.llantas_montadas, r.llantas_inspeccionadas = len(montadas), len(insp)
    vehiculos = [v for v in flota if any(ll.en_filtro and ll.inspeccionada for ll in v.llantas)]
    r.vehiculos_inspeccionados = len(vehiculos)

    def contar(valores):
        return Counter(valores).most_common()

    r.por_marca = contar((ll.marca or SIN_DATO).strip() for ll in insp)
    r.por_vida = sorted(contar(ll.vida for ll in insp), key=lambda x: (x[0] != "VN", x[0]))
    r.por_referencia = contar(" ".join(x for x in ((ll.marca or "").strip(), (ll.referencia or "").strip()) if x)
                              or SIN_DATO for ll in insp)
    estados = Counter(estado_de(ll.pmin, u) for ll in insp)
    r.por_estado = [(e, estados.get(e, 0)) for e in ("Bueno", "Regular", "Crítico")]
    r.por_dimension = contar((ll.medida or SIN_DATO).strip() for ll in insp)
    r.por_tipo_vehiculo = contar(v.tipo for v in vehiculos)

    profs = [ll.pmin for ll in insp if ll.pmin is not None]
    r.profundidad_promedio = round(sum(profs) / len(profs), 1) if profs else None
    r.bajo_minimo = sum(1 for p in profs if p <= u.profundidad_minima)
    r.ir = round(sum(ll.reencauches for ll in insp) / len(insp), 2) if insp else None

    ids = {ll.neumatico_id for ll in insp}
    tipos = Counter(n.tipo for nid, lista in nov.items() if nid in ids for n in lista)
    r.novedades = sum(tipos.values())
    r.llantas_con_novedad = sum(1 for nid in ids if nov.get(nid))
    r.por_novedad = [(t, nombre, tipos.get(t, 0), round(100 * tipos.get(t, 0) / r.novedades, 1) if r.novedades else 0.0)
                     for t, nombre in TIPOS_NOVEDAD.items()]
    stipos = Counter(s.tipo for nid, lista in sug.items() if nid in ids for s in lista)
    r.sugerencias = sum(stipos.values())
    r.por_sugerencia = [(TIPO_SUGERENCIA.get(t, t), n) for t, n in stipos.most_common()]
    return r


# ─── Dibujo ───────────────────────────────────────────────────────────────────

def _color_llanta(ll: LlantaInsp, nov: Dict[int, List[Novedad]]):
    if not ll.inspeccionada:
        return SIN_INSP
    tipos = {n.tipo for n in nov.get(ll.neumatico_id, [])}
    if "PROFUNDIDAD_MINIMA" in tipos:
        return ROJO
    if tipos:
        return AMBAR
    return VERDE


def generar(flota: List[VehiculoFlota], nov: Dict[int, List[Novedad]], sug: Dict[int, List[Sugerencia]],
            r: Resumen, u: Umbrales, enc: Encabezado, titulo: str = "Estado de llantas de la flota",
            fotos: Optional[dict] = None) -> bytes:
    """`fotos` (TittanLite): {"vehiculos": {activo_id: [(ruta, rótulo)]},
    "disposiciones": [{"titulo", "detalle", "fotos": [(ruta, rótulo)]}]}."""
    fotos = fotos or {}
    from fpdf import FPDF

    class Informe(FPDF):
        def footer(self):
            if self.page_no() == 1:   # la portada lleva su propio pie
                return
            self.set_y(-10)
            self.set_font("Helvetica", "", 7)
            self.set_text_color(*GRIS)
            self.cell(0, 5, limpio(f"{enc.empresa} · {titulo} · Generado el "
                                   f"{enc.generado_en:%d/%m/%Y %H:%M} por {enc.generado_por}"))
            self.set_x(-78)
            _marca(self, 7, GRIS, w=34, alto=5)
            self.set_xy(-40, self.h - 10)
            self.set_font("Helvetica", "", 7)
            self.cell(28, 5, limpio(f"Página {self.page_no()} de {{nb}}"), align="R")

    pdf = Informe(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.set_margins(12, 12, 12)
    pdf.alias_nb_pages()
    W, H, M = pdf.w, pdf.h, 12

    def texto(x, y, s, tam=8, estilo="", color=NEGRO, w=0, alinear="L"):
        pdf.set_font("Helvetica", estilo, tam)
        pdf.set_text_color(*color)
        pdf.set_xy(x, y)
        pdf.cell(w, tam * 0.45, limpio(s), align=alinear)

    def banda(titulo, subtitulo):
        pdf.set_fill_color(*NEGRO)
        pdf.rect(0, 0, W, 22, "F")
        if enc.logo:
            try:
                # Sobre una placa blanca: casi todos los logos son oscuros y la banda es negra.
                lw, lh = _medidas_logo(enc.logo, 38, 11)
                pdf.set_fill_color(255, 255, 255)
                pdf.rect(W - M - lw - 6, 11 - lh / 2 - 2.5, lw + 6, lh + 5, "F")
                pdf.image(enc.logo, x=W - M - lw - 3, y=11 - lh / 2, w=lw, h=lh)
            except Exception:   # noqa: BLE001 — un logo ilegible no impide el informe
                pass
        texto(M, 5, titulo, 15, "B", (255, 255, 255))
        texto(M, 13, subtitulo, 8.5, "", GRIS_CLARO)

    def tarjeta(x, y, w, etiqueta, valor, nota="", color=NEGRO):
        pdf.set_fill_color(*FONDO)
        pdf.set_draw_color(*GRIS_CLARO)
        pdf.rect(x, y, w, 21, "DF")
        texto(x + 3, y + 3, etiqueta, 7, "", GRIS, w - 6)
        texto(x + 3, y + 9, valor, 15, "B", color, w - 6)
        if nota:
            texto(x + 3, y + 16, nota, 6.5, "", GRIS, w - 6)

    def barras(x, y, w, titulo, filas, total=None, maximo=12, sufijo=""):
        """Tabla de reparto con barras horizontales. Devuelve la y final."""
        texto(x, y, titulo, 9, "B")
        y += 6
        if not filas:
            texto(x, y, "Sin datos en el periodo.", 7.5, "", GRIS)
            return y + 6
        mostrar = list(filas[:maximo])
        if len(filas) > maximo:
            mostrar.append(("Otras", sum(c for _, c in filas[maximo:])))
        tope = max(c for _, c in mostrar) or 1
        total = total if total is not None else sum(c for _, c in filas)
        for valor, cantidad in mostrar:
            texto(x, y, str(valor)[:28], 7.5, "", NEGRO, 42)
            largo = (w - 72) * cantidad / tope
            pdf.set_fill_color(*MARCA)
            pdf.rect(x + 43, y + 0.6, max(largo, 0.4), 3, "F")
            pct = f" ({100 * cantidad / total:.1f} %)" if total else ""
            texto(x + 44 + largo, y, f"{cantidad:,}".replace(",", ".") + pct + sufijo, 7, "", GRIS)
            y += 5
        return y + 3

    _portada(pdf, r, enc, titulo)

    # ── Resumen ejecutivo ──
    pdf.add_page()
    banda(titulo, f"{enc.empresa} · {enc.periodo} · Resumen ejecutivo de la última inspección")
    y = 28
    ancho = (W - 2 * M - 5 * 4) / 6
    n = lambda x: f"{x:,}".replace(",", ".")  # noqa: E731
    tarjeta(M, y, ancho, "Vehículos inspeccionados", n(r.vehiculos_inspeccionados), f"de {n(r.vehiculos_alcance)} en el alcance")
    tarjeta(M + (ancho + 4), y, ancho, "Llantas inspeccionadas", n(r.llantas_inspeccionadas), f"de {n(r.llantas_montadas)} montadas")
    tarjeta(M + 2 * (ancho + 4), y, ancho, "Novedades", n(r.novedades), f"en {n(r.llantas_con_novedad)} llantas",
            ROJO if r.novedades else NEGRO)
    tarjeta(M + 3 * (ancho + 4), y, ancho, "Profundidad promedio",
            f"{r.profundidad_promedio} mm" if r.profundidad_promedio is not None else "-", "mínima de cada llanta")
    tarjeta(M + 4 * (ancho + 4), y, ancho, "Bajo el mínimo", n(r.bajo_minimo), f"mínimo {u.profundidad_minima:g} mm",
            ROJO if r.bajo_minimo else NEGRO)
    tarjeta(M + 5 * (ancho + 4), y, ancho, "I.R. a piso", f"{r.ir:.2f}" if r.ir is not None else "-",
            "promedio de reencauches")

    col = (W - 2 * M - 16) / 3
    y0 = y + 28
    novedades_filas = [(nombre, c) for _, nombre, c, _ in r.por_novedad if c]
    fin = max(barras(M, y0, col, "Novedades por tipo", novedades_filas, total=r.novedades or None),
              barras(M + col + 8, y0, col, "Sugerencias por tipo", r.por_sugerencia, maximo=6),
              barras(M + 2 * (col + 8), y0, col, "Tipos de vehículo inspeccionados", r.por_tipo_vehiculo, maximo=6))
    y1 = max(fin + 4, 112)
    barras(M, y1, col, "Marcas inspeccionadas", r.por_marca, maximo=12)
    barras(M + col + 8, y1, col, "Dimensiones inspeccionadas", r.por_dimension, maximo=12)
    yl = y1
    texto(M + 2 * (col + 8), yl, "Cómo leer el informe", 9, "B")
    yl += 7
    for color, leyenda in ((VERDE, "Sin novedades en la última inspección"),
                           (AMBAR, "Con novedades (presión, alineación, desgaste, cerca del mínimo…)"),
                           (ROJO, "En o bajo la profundidad mínima"),
                           (SIN_INSP, "Sin inspección en el periodo")):
        pdf.set_fill_color(*color)
        pdf.rect(M + 2 * (col + 8), yl, 4, 4, "F")
        texto(M + 2 * (col + 8) + 6, yl + 0.3, leyenda, 7.5, "", NEGRO, col - 6)
        yl += 6.5
    yl += 3
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*GRIS)
    pdf.set_xy(M + 2 * (col + 8), yl)
    pdf.multi_cell(col, 3.8, limpio(
        "Cada vehículo muestra su esquema de ejes con la profundidad mínima de cada llanta y, al lado, la tabla "
        "por posición con las tres profundidades medidas (izquierda, centro y derecha) y la presión. Las "
        "sugerencias salen de las reglas configuradas en el módulo de llantas."))

    # ── Composición a piso y estado ──
    if any(c for _, c in r.por_estado) or r.por_vida:
        pdf.add_page()
        banda("Composición de llantas a piso y estado", f"{enc.empresa} · {enc.periodo} · Llantas inspeccionadas")
        y = 30
        total_est = sum(c for _, c in r.por_estado) or 1
        texto(M, y, "Estado de las llantas (por profundidad mínima)", 10, "B")
        texto(M, y + 5.5, f"Crítico: en o bajo {u.profundidad_minima:g} mm · Regular: hasta "
                          f"{u.profundidad_minima + u.margen_alerta:g} mm · Bueno: por encima", 7.5, "", GRIS)
        # Histograma: una columna por estado, alto proporcional.
        base, alto_max, ancho_col = y + 62, 46, 30
        tope = max([c for _, c in r.por_estado] + [1])
        for i, (nombre, cantidad) in enumerate(r.por_estado):
            color = {"Bueno": VERDE, "Regular": AMBAR, "Crítico": ROJO}[nombre]
            x = M + 6 + i * (ancho_col + 14)
            h = alto_max * cantidad / tope
            pdf.set_fill_color(*color)
            pdf.rect(x, base - h, ancho_col, max(h, 0.4), "F")
            texto(x, base - h - 6, f"{cantidad:,}".replace(",", ".") + f" ({100 * cantidad / total_est:.1f} %)",
                  8, "B", NEGRO, ancho_col, "C")
            texto(x, base + 2, nombre, 8.5, "B", color, ancho_col, "C")
        col = (W - 2 * M - 16) / 3
        x2 = M + col + 8
        fin = barras(x2, y, col, "Por vida", r.por_vida, maximo=8)
        barras(x2 + col + 8, y, col, "Por dimensión", r.por_dimension, maximo=8)
        y = max(base + 12, fin + 4)
        y1 = barras(M, y, col, "Por marca", r.por_marca, maximo=10)
        y2 = barras(x2, y, col, "Por referencia", r.por_referencia, maximo=10)
        if r.novedades_campo or r.observaciones:
            ya = barras(x2 + col + 8, y, col, "Novedades marcadas en campo", r.novedades_campo, maximo=8)
            if r.observaciones:
                texto(x2 + col + 8, ya, "Observaciones más recurrentes", 9, "B")
                ya += 6
                for obs, cantidad in r.observaciones[:8]:
                    pdf.set_font("Helvetica", "", 7.5)
                    pdf.set_text_color(*NEGRO)
                    pdf.set_xy(x2 + col + 8, ya)
                    pdf.multi_cell(col, 3.6, limpio(f"{cantidad}× {obs}"[:140]))
                    ya = pdf.get_y() + 1.2
        else:
            barras(x2 + col + 8, y, col, "Tipos de vehículo", r.por_tipo_vehiculo, maximo=8)

    def galeria(titulo, subtitulo, lista):
        """Fotos en cuadrícula de 4 × 2 por página, con su rótulo."""
        for inicio in range(0, len(lista), 8):
            pdf.add_page()
            banda(titulo, subtitulo)
            ancho_c, alto_c = (W - 2 * M - 3 * 6) / 4, 74
            for i, (ruta, rotulo) in enumerate(lista[inicio:inicio + 8]):
                x = M + (i % 4) * (ancho_c + 6)
                y = 30 + (i // 4) * (alto_c + 14)
                try:
                    from PIL import Image as _Img
                    with _Img.open(ruta) as im:
                        rel = im.width / im.height
                    w_, h_ = (ancho_c, ancho_c / rel) if rel >= ancho_c / alto_c else (alto_c * rel, alto_c)
                    pdf.image(ruta, x=x + (ancho_c - w_) / 2, y=y + (alto_c - h_) / 2, w=w_, h=h_)
                except Exception:   # noqa: BLE001 — una foto dañada no impide el informe
                    texto(x, y + alto_c / 2, "Foto no disponible", 7, "", GRIS)
                texto(x, y + alto_c + 2, str(rotulo)[:60], 7, "", NEGRO, ancho_c)

    # ── Una página por vehículo ──
    for v in flota:
        pdf.add_page()
        nombre = " · ".join(x for x in (v.placa or v.codigo, v.tipo, v.marca, v.linea) if x)
        ult = v.ultima_inspeccion
        banda(nombre, f"{v.nombre} · Última inspección: {ult:%d/%m/%Y}" if ult else f"{v.nombre} · Sin inspección en el periodo")
        _esquema(pdf, v, nov, M, 28, 112, texto)
        yt = _tabla(pdf, v, nov, M + 118, 28, W - M - (M + 118), texto, u.profundidad_minima)
        _sugerencias(pdf, v, sug, M + 118, yt + 4, W - M - (M + 118), H - 14, texto)
        propias = (fotos.get("vehiculos") or {}).get(v.activo_id) or []
        if propias:
            galeria(f"{v.placa or v.codigo} · fotos de la inspección", f"{len(propias)} foto(s) tomadas en campo", propias)

    # ── Disposiciones registradas en campo ──
    disps = fotos.get("disposiciones") or []
    if disps:
        pdf.add_page()
        banda("Disposición final registrada en campo", f"{enc.empresa} · {enc.periodo} · {len(disps)} llanta(s)")
        y = 30
        for d in disps:
            if y > H - 24:
                pdf.add_page()
                banda("Disposición final registrada en campo", f"{enc.empresa} · {enc.periodo}")
                y = 30
            texto(M, y, d["titulo"], 9, "B")
            texto(M, y + 5, d["detalle"][:170], 7.5, "", GRIS)
            y += 12
        for d in disps:
            if d["fotos"]:
                galeria(d["titulo"], d["detalle"][:120], d["fotos"])

    return bytes(pdf.output())


def _portada(pdf, r: Resumen, enc: Encabezado, titulo: str = "Estado de llantas de la flota"):
    n = lambda x: f"{x:,}".replace(",", ".")  # noqa: E731

    def cifra(x, singular, plural):
        return f"{n(x)} {singular if x == 1 else plural}"

    portada(pdf, enc, titulo,
            "Resumen ejecutivo y diagnóstico por vehículo con la última inspección",
            [cifra(r.vehiculos_inspeccionados, "vehículo inspeccionado", "vehículos inspeccionados"),
             cifra(r.llantas_inspeccionadas, "llanta inspeccionada", "llantas inspeccionadas"),
             cifra(r.novedades, "novedad", "novedades")])


def _esquema(pdf, v: VehiculoFlota, nov, x, y, ancho, texto):
    por_eje: Dict[int, list] = {}
    repuestos = []
    for p in v.posiciones:
        (repuestos if not p.eje else por_eje.setdefault(p.eje, [])).append(p)
    cx = x + ancho / 2
    wr, hr, gap = 9.0, 14.0, 1.8
    fila = hr + 7.5
    pdf.set_fill_color(232, 247, 238)
    pdf.set_draw_color(*MARCA)
    pdf.set_line_width(0.4)
    pdf.rect(cx - 20, y, 40, 7, "DF")
    texto(cx - 20, y + 2, "FRENTE / CABINA", 6, "B", MARCA, 40, "C")
    y += 11
    ejes = sorted(por_eje.items())
    pdf.set_fill_color(*SIN_INSP)
    pdf.rect(cx - 1.5, y, 3, max(len(ejes), 1) * fila - 4, "F")
    for num, posiciones in ejes:
        centro = y + hr / 2
        pdf.set_fill_color(*GRIS)
        pdf.rect(cx - 24, centro - 0.8, 48, 1.6, "F")
        texto(x, centro - 1.2, f"Eje {num}", 6.5, "B", GRIS)
        for lado, signo in (("IZQ", -1), ("DER", 1)):
            del_lado = [p for p in posiciones if p.lado == lado]
            if lado == "IZQ":
                del_lado = list(reversed(del_lado))   # la exterior queda afuera
            for i, p in enumerate(del_lado):
                desp = 26 + i * (wr + gap)
                rx = cx - desp - wr if signo < 0 else cx + desp
                _rueda(pdf, p, nov, rx, y, wr, hr, texto)
        y += fila
    if repuestos:
        pdf.set_draw_color(*GRIS_CLARO)
        pdf.line(cx - 30, y, cx + 30, y)
        y += 3
        texto(x, y + hr / 2 - 1.2, "Repuesto", 6.5, "B", GRIS)
        for i, p in enumerate(repuestos):
            _rueda(pdf, p, nov, cx - wr / 2 + i * (wr + gap), y, wr, hr, texto)


def _rueda(pdf, p, nov, rx, y, wr, hr, texto):
    ll = p.llanta
    if ll is None:
        pdf.set_fill_color(241, 245, 249)
        pdf.set_draw_color(203, 213, 225)
        pdf.rect(rx, y, wr, hr, "DF")
        texto(rx, y + hr / 2 - 1, "vacía", 4.5, "", SIN_INSP, wr, "C")
        return
    color = _color_llanta(ll, nov) if ll.en_filtro else GRIS_CLARO
    pdf.set_fill_color(*color)
    pdf.set_draw_color(30, 41, 59)
    pdf.set_line_width(0.3)
    pdf.rect(rx, y, wr, hr, "DF")
    texto(rx, y + 2, str(p.numero or ""), 6, "B", (255, 255, 255), wr, "C")
    texto(rx, y + hr / 2, ll.codigo[-7:], 4.2, "", (255, 255, 255), wr, "C")
    prof = ll.pmin if ll.inspeccionada else None
    texto(rx - 2, y + hr + 1, f"{prof:g} mm" if prof is not None else "s/i", 5.5, "B",
          color if color != GRIS_CLARO else GRIS, wr + 4, "C")


COLS = [("Pos.", 9), ("Código", 19), ("Marca", 18), ("Referencia", 21), ("Dimensión", 18), ("Vida", 8),
        ("Izq", 8), ("Cen", 8), ("Der", 8), ("Psi", 9)]


def _tabla(pdf, v: VehiculoFlota, nov, x, y, ancho, texto, minimo):
    resto = ancho - sum(w for _, w in COLS)
    cols = COLS + [("Novedades", resto)]
    pdf.set_fill_color(*NEGRO)
    pdf.rect(x, y, ancho, 6, "F")
    cx = x
    for titulo, w in cols:
        texto(cx + 1, y + 1.4, titulo, 6.5, "B", (255, 255, 255), w - 1)
        cx += w
    y += 6
    alto = 5.2
    for i, p in enumerate(v.posiciones):
        ll = p.llanta
        if i % 2:
            pdf.set_fill_color(*FONDO)
            pdf.rect(x, y, ancho, alto, "F")
        if ll is None:
            valores = [str(p.numero or "R"), "Vacía"] + [""] * (len(cols) - 2)
        else:
            fmt = lambda m: f"{m:g}" if m is not None else "-"  # noqa: E731
            tipos = [NOVEDAD_CORTA[n.tipo] for n in nov.get(ll.neumatico_id, [])]
            valores = [str(p.numero or "R"), ll.codigo, ll.marca or "-", ll.referencia or "-", ll.medida or "-",
                       ll.vida, fmt(ll.izq), fmt(ll.centro), fmt(ll.der), fmt(ll.presion),
                       ", ".join(tipos) if ll.inspeccionada else "Sin inspección"]
        cx = x
        for j, ((_, w), val) in enumerate(zip(cols, valores)):
            color = NEGRO
            if ll is not None and j in (6, 7, 8) and val not in ("-", "") and float(val) <= minimo:
                color = ROJO
            if j == len(cols) - 1 and val and val != "Sin inspección":
                color = AMBAR
            pdf.set_font("Helvetica", "", 6.5)
            recorte = val
            while pdf.get_string_width(limpio(recorte)) > w - 1.5 and len(recorte) > 1:
                recorte = recorte[:-1]
            texto(cx + 1, y + 1.2, recorte, 6.5, "", color, w - 1)
            cx += w
        y += alto
    pdf.set_draw_color(*GRIS_CLARO)
    pdf.line(x, y, x + ancho, y)
    return y


def _sugerencias(pdf, v: VehiculoFlota, sug, x, y, ancho, limite, texto):
    lista = sorted((s for ll in v.llantas for s in sug.get(ll.neumatico_id, [])), key=lambda s: (s.prioridad, s.posicion))
    obs = [(ll, ll.observaciones) for ll in v.llantas if ll.inspeccionada and ll.observaciones]
    texto(x, y, "Sugerencias", 9, "B")
    y += 5.5
    if not lista:
        texto(x, y, "Sin sugerencias para este vehículo.", 7.5, "", GRIS)
        y += 5
    pdf.set_font("Helvetica", "", 7.2)
    for i, s in enumerate(lista):
        if y > limite - 8:
            texto(x, y, f"… y {len(lista) - i} sugerencias más.", 7, "", GRIS)
            return
        pdf.set_fill_color(*(ROJO if s.prioridad == 1 else AMBAR if s.prioridad == 2 else GRIS))
        pdf.rect(x, y + 0.8, 1.6, 1.6, "F")
        pdf.set_text_color(*NEGRO)
        pdf.set_xy(x + 3, y)
        pdf.multi_cell(ancho - 3, 3.5, limpio(s.texto))
        y = pdf.get_y() + 1
    if obs and y < limite - 12:
        y += 2
        texto(x, y, "Observaciones de la inspección", 8, "B")
        y += 5
        pdf.set_font("Helvetica", "", 7)
        for ll, o in obs:
            if y > limite - 6:
                break
            pdf.set_text_color(*GRIS)
            pdf.set_xy(x, y)
            pdf.multi_cell(ancho, 3.4, limpio(f"{ll.posicion_label} ({ll.codigo}): {o}"))
            y = pdf.get_y() + 0.8
