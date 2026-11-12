"""
Informes PDF de rendimiento y composición de llantas, al estilo de un informe
de consultoría: portada, resumen ejecutivo con los hallazgos y una página por
idea, cuyo título es la conclusión («La marca X logra el menor CPK…») y no el
nombre del gráfico.

Seis informes, los mismos de la pantalla de informes de llantas:
TABLERO, CPK, KM, KM_MM, VIDAS y COMPOSICION.

Las cifras llegan ya calculadas (las mismas del servidor que ve la pantalla);
aquí solo se redactan los hallazgos y se dibuja. `hallazgo`, `lectura`,
`resumen_vidas` y `resumen_composicion` son puros y tienen pruebas.
"""
from dataclasses import dataclass, field
from statistics import median
from typing import Callable, Dict, List, Optional, Sequence, Tuple

from app.core.pdf_marca import (
    AZUL_NOCHE, FONDO, GRIS, GRIS_CLARO, MARCA, NEGRO, Encabezado, enlace_web, limpio, marca, portada,
)

ROJO = (190, 48, 48)
BARRA = (148, 163, 184)

TIPOS = ("TABLERO", "CPK", "KM", "KM_MM", "VIDAS", "COMPOSICION")
PRINCIPALES = (("marca", "Marca"), ("referencia", "Referencia"), ("medida", "Medida"))

ARTICULO = {"marca": "La marca", "referencia": "La referencia", "medida": "La medida", "vida": "La vida",
            "tipo_uso": "El tipo de uso", "tipo_vehiculo": "El tipo de vehículo", "vehiculo": "El vehículo",
            "banda": "La banda", "proveedor": "El proveedor", "zona": "La zona", "motivo_fin": "El motivo",
            "tipo_rin": "El rin"}


def num(v, dec: int = 0) -> str:
    """Número con la puntuación colombiana: 1.234.567,89."""
    if v is None:
        return "-"
    s = f"{v:,.{dec}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def pct(parte, total) -> str:
    """Porcentaje con un decimal solo cuando es menor que 1 (para no mostrar «0 %»)."""
    if not total:
        return "-"
    p = 100 * parte / total
    return f"{num(p, 1 if 0 < p < 1 else 0)} %"


def dinero(v) -> str:
    """Pesos en cifra corta para los indicadores: $199.644 M."""
    if v is None:
        return "-"
    return f"${num(v / 1e6, 1 if abs(v) < 1e8 else 0)} M" if abs(v) >= 1e6 else f"${num(v)}"


@dataclass
class Metrica:
    titulo: str
    corto: str
    campo: str
    n: str
    menor_es_mejor: bool
    fmt: Callable[[Optional[float]], str]
    ayuda: str


METRICAS: Dict[str, Metrica] = {
    "cpk": Metrica("Costo por kilómetro", "CPK", "cpk", "n_cpk", True,
                   lambda v: "-" if v is None else f"${num(v, 2)}/km",
                   "Costo de las vidas (compra o reencauche, más reesculturados y reparaciones, menos ajustes) "
                   "dividido por los kilómetros que recorrieron. Menor es mejor."),
    "km": Metrica("Rendimiento en kilómetros", "Km por vida", "km_promedio", "n_km", False,
                  lambda v: "-" if v is None else f"{num(v)} km",
                  "Kilómetros recorridos en promedio por vida; en las vidas en servicio, los que llevan hasta "
                  "hoy. Mayor es mejor."),
    "km_mm": Metrica("Kilómetros por milímetro", "km/mm", "km_mm", "n_km_mm", False,
                     lambda v: "-" if v is None else f"{num(v)} km/mm",
                     "Kilómetros recorridos por cada milímetro de labrado gastado: mide el desgaste sin depender "
                     "del precio. Mayor es mejor."),
}
METRICA_DE_TIPO = {"CPK": "cpk", "KM": "km", "KM_MM": "km_mm"}


# ─── Hallazgos (puros) ────────────────────────────────────────────────────────

def comparables(grupos: Sequence[dict], metrica: str, muestra: int) -> List[dict]:
    """Los valores con muestra suficiente y la métrica calculada, de mejor a peor."""
    m = METRICAS[metrica]
    gs = [g for g in grupos if (g.get(m.n) or 0) >= muestra and g.get(m.campo) is not None]
    return sorted(gs, key=lambda g: g[m.campo] if m.menor_es_mejor else -g[m.campo])


def _pct(v: float, ref: Optional[float]) -> Optional[float]:
    return None if not ref else (v - ref) / ref * 100


def hallazgo(clave: str, grupos: Sequence[dict], metrica: str, muestra: int, flota: Optional[float]) -> Optional[str]:
    """La conclusión de una comparación, redactada como título de página."""
    comp = comparables(grupos, metrica, muestra)
    if len(comp) < 2:
        return None
    m, mejor = METRICAS[metrica], comp[0]
    quien = f"{ARTICULO.get(clave, 'El valor')} «{mejor['categoria']}»"
    v = mejor[m.campo]
    d = _pct(v, flota)
    if metrica == "cpk":
        base = f"{quien} logra el menor costo por kilómetro: {m.fmt(v)}"
        cola = f", {abs(d):.0f} % por debajo de la flota" if d is not None and d <= -1 else ""
    elif metrica == "km":
        base = f"{quien} rinde más kilómetros por vida: {m.fmt(v)}"
        cola = f", {d:.0f} % por encima de la flota" if d is not None and d >= 1 else ""
    else:
        base = f"{quien} desgasta menos el labrado: {m.fmt(v)}"
        cola = f", {d:.0f} % por encima de la flota" if d is not None and d >= 1 else ""
    return base + cola


def lectura(clave: str, grupos: Sequence[dict], metrica: str, muestra: int) -> List[str]:
    """Las frases de apoyo de una comparación: el otro extremo, la brecha, el
    ahorro posible (solo CPK) y la muestra."""
    comp = comparables(grupos, metrica, muestra)
    m = METRICAS[metrica]
    if len(comp) < 2:
        return [f"No hay al menos dos valores con {muestra} o más vidas medidas para comparar."]
    mejor, peor = comp[0], comp[-1]
    frases = [f"En el otro extremo, «{peor['categoria']}» registra {m.fmt(peor[m.campo])}."]
    a, b = mejor[m.campo], peor[m.campo]
    razon = (b / a) if m.menor_es_mejor and a else (a / b) if b else None
    if razon and razon >= 1.1:
        frases.append(f"La brecha entre el mejor y el peor valor es de {num(razon, 1)} veces.")
    if metrica == "cpk" and peor.get("km_total"):
        ahorro = (b - a) * peor["km_total"]
        if ahorro > 0:
            frases.append(f"Si los km de «{peor['categoria']}» hubieran costado como los de «{mejor['categoria']}», "
                          f"la flota habría ahorrado cerca de ${num(ahorro)}.")
    fuera = sum(1 for g in grupos if g.get(m.campo) is not None) - len(comp)
    nota = f"Se comparan {len(comp)} valores con al menos {muestra} vidas medidas"
    frases.append(nota + (f"; {fuera} quedan fuera por muestra pequeña." if fuera > 0 else "."))
    return frases


@dataclass
class ResumenVidas:
    total: int = 0
    terminadas: int = 0
    en_servicio: int = 0
    km_mediana: Optional[float] = None
    distribucion_km: List[Tuple[str, int]] = field(default_factory=list)
    motivos: List[Tuple[str, int]] = field(default_factory=list)
    mejores: List[dict] = field(default_factory=list)
    peores: List[dict] = field(default_factory=list)


TRAMOS_KM = (20_000, 40_000, 60_000, 80_000, 100_000, 120_000, 150_000, 200_000)


def resumen_vidas(vidas: Sequence[dict], km_minimo: float, tope: int = 15) -> ResumenVidas:
    """Distribución de km, motivos de fin y las mejores y peores vidas
    terminadas por CPK (solo las que superan los km mínimos)."""
    r = ResumenVidas(total=len(vidas))
    r.terminadas = sum(1 for v in vidas if v["terminada"])
    r.en_servicio = r.total - r.terminadas
    kms = [v["km"] for v in vidas if v.get("km") is not None]
    r.km_mediana = median(kms) if kms else None
    conteo = [0] * (len(TRAMOS_KM) + 1)
    for k in kms:
        conteo[next((i for i, t in enumerate(TRAMOS_KM) if k < t), len(TRAMOS_KM))] += 1
    etiquetas = []
    previo = 0
    for t in TRAMOS_KM:
        etiquetas.append(f"{num(previo / 1000)} a {num(t / 1000)} mil km")
        previo = t
    etiquetas.append(f"{num(TRAMOS_KM[-1] / 1000)} mil km o más")
    r.distribucion_km = list(zip(etiquetas, conteo))
    motivos: Dict[str, int] = {}
    for v in vidas:
        if v["terminada"]:
            motivo = v.get("motivo_fin") or "Sin dato"
            motivos[motivo] = motivos.get(motivo, 0) + 1
    r.motivos = sorted(motivos.items(), key=lambda kv: -kv[1])
    medidas = [v for v in vidas if v["terminada"] and v.get("cpk") is not None and (v.get("km") or 0) >= km_minimo]
    medidas.sort(key=lambda v: v["cpk"])
    r.mejores = medidas[:tope]
    r.peores = list(reversed(medidas[-tope:])) if len(medidas) > tope else []
    return r


def resumen_composicion(grupos: Dict[str, List[Tuple[str, int]]], total: int) -> List[str]:
    """Hallazgos de la composición del parque montado."""
    if not total:
        return ["No hay llantas montadas."]
    frases = []
    marcas = grupos.get("Marca", [])
    if marcas:
        frases.append(f"«{marcas[0][0]}» concentra el {pct(marcas[0][1], total)} del parque montado.")
        if len(marcas) >= 3:
            tres = sum(n for _, n in marcas[:3])
            frases.append(f"Las tres primeras marcas suman el {pct(tres, total)} de las llantas a piso "
                          f"({len(marcas)} marcas en total).")
    medidas = grupos.get("Medida", [])
    if medidas:
        frases.append(f"La medida más usada es {medidas[0][0]}, con el {pct(medidas[0][1], total)} "
                      f"({len(medidas)} medidas distintas).")
    vidas = dict(grupos.get("Vida", []))
    if vidas:
        reenc = total - vidas.get("VN", 0)
        frases.append(f"El {pct(reenc, total)} de las llantas a piso ya fue reencauchada al menos una vez.")
    usos = grupos.get("Tipo de uso", [])
    if usos and usos[0][0] != "Sin dato":
        frases.append(f"El uso predominante es «{usos[0][0]}» ({pct(usos[0][1], total)}).")
    return frases


# ─── Dibujo ───────────────────────────────────────────────────────────────────

TITULOS = {
    "TABLERO": ("Tablero de rendimiento de llantas",
                "CPK, kilómetros por vida y kilómetros por milímetro, comparados por marca, referencia y medida"),
    "CPK": ("Costo por kilómetro", "Qué marcas, referencias y medidas cuestan menos por cada kilómetro recorrido"),
    "KM": ("Rendimiento en kilómetros", "Cuántos kilómetros recorre cada vida de llanta, por categoría"),
    "KM_MM": ("Kilómetros por milímetro", "Cuántos kilómetros rinde cada milímetro de labrado"),
    "VIDAS": ("Detalle por vida de llanta", "Cómo rinde cada vida: kilómetros, costo, desgaste y motivo de fin"),
    "COMPOSICION": ("Composición de llantas a piso", "Cómo se reparte el parque montado por marca, medida y vida"),
}


@dataclass
class Datos:
    """Todo lo que necesita un informe; cada tipo usa una parte."""
    rendimiento: Optional[dict] = None      # {"resumen": {...}, "dimensiones": [...]}
    parque: Optional[dict] = None           # el del tablero de parque montado
    vidas: Optional[ResumenVidas] = None
    composicion: Optional[Dict[str, List[Tuple[str, int]]]] = None
    composicion_total: int = 0
    dimension: str = "marca"
    muestra: int = 5
    descripcion: str = ""                   # alcance y filtros, para el pie


def generar(tipo: str, d: Datos, enc: Encabezado) -> bytes:
    from fpdf import FPDF
    fuente = f"Fuente: módulo de llantas · {d.descripcion}" if d.descripcion else "Fuente: módulo de llantas"

    class Informe(FPDF):
        def footer(self):
            if self.page_no() == 1:
                return
            self.set_draw_color(*GRIS_CLARO)
            self.set_line_width(0.2)
            self.line(M, self.h - 12, self.w - M, self.h - 12)
            self.set_xy(M, self.h - 10.5)
            self.set_font("Helvetica", "", 6.5)
            self.set_text_color(*GRIS)
            self.cell(190, 5, limpio(fuente)[:170])
            self.set_xy(self.w - M - 70, self.h - 10.5)
            marca(self, 7, GRIS, w=34, alto=5)
            self.set_xy(self.w - M - 30, self.h - 10.5)
            self.set_font("Helvetica", "", 6.5)
            self.set_text_color(*GRIS)
            self.cell(30, 5, limpio(f"{self.page_no()} / {{nb}}"), align="R")
            enlace_web(self)

    pdf = Informe(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.alias_nb_pages()
    M = 16
    W, H = pdf.w, pdf.h
    lienzo = Lienzo(pdf, M)
    titulo, descripcion = TITULOS[tipo]

    if tipo == "TABLERO":
        _tablero(lienzo, d, enc, titulo, descripcion)
    elif tipo in METRICA_DE_TIPO:
        _metrica(lienzo, d, enc, METRICA_DE_TIPO[tipo], titulo, descripcion)
    elif tipo == "VIDAS":
        _vidas(lienzo, d, enc, titulo, descripcion)
    else:
        _composicion(lienzo, d, enc, titulo, descripcion)
    return bytes(pdf.output())


class Lienzo:
    """Las piezas de dibujo de una página de consultoría."""

    def __init__(self, pdf, margen: float):
        self.pdf, self.M = pdf, margen
        self.W, self.H = pdf.w, pdf.h
        self.fondo = pdf.h - 16

    def texto(self, x, y, s, tam=8, estilo="", color=NEGRO, w=0, alinear="L", fuente="Helvetica"):
        self.pdf.set_font(fuente, estilo, tam)
        self.pdf.set_text_color(*color)
        self.pdf.set_xy(x, y)
        self.pdf.cell(w, tam * 0.45, limpio(s), align=alinear)

    def recorte(self, s, w, tam, estilo=""):
        self.pdf.set_font("Helvetica", estilo, tam)
        s = limpio(s)
        while self.pdf.get_string_width(s) > w and len(s) > 2:
            s = s[:-2] + "."
            s = s[:-1] if self.pdf.get_string_width(s) > w else s
        return s

    def pagina(self, seccion: str, titulo: str, subtitulo: str = "") -> float:
        """Página nueva con la sección arriba, el título de acción en serif y
        una línea fina. Devuelve la y donde empieza el contenido."""
        pdf, M = self.pdf, self.M
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 6.8)
        pdf.set_text_color(*MARCA)
        pdf.set_char_spacing(1)
        pdf.set_xy(M, 10)
        pdf.cell(200, 4, limpio(seccion.upper()))
        pdf.set_char_spacing(0)
        pdf.set_font("Times", "B", 17)
        pdf.set_text_color(*AZUL_NOCHE)
        pdf.set_xy(M, 15)
        pdf.multi_cell(self.W - 2 * M, 7.2, limpio(titulo))
        y = pdf.get_y() + 1
        if subtitulo:
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*GRIS)
            pdf.set_xy(M, y)
            pdf.multi_cell(self.W - 2 * M, 4.2, limpio(subtitulo))
            y = pdf.get_y() + 1
        pdf.set_draw_color(*AZUL_NOCHE)
        pdf.set_line_width(0.5)
        pdf.line(M, y + 1, self.W - M, y + 1)
        return y + 6

    def kpis(self, y: float, items: List[Tuple[str, str, str]]) -> float:
        """Cifras grandes bajo una raya fina, sin cajas."""
        n = len(items)
        sep = 6
        ancho = (self.W - 2 * self.M - sep * (n - 1)) / n
        for i, (etiqueta, valor, nota) in enumerate(items):
            x = self.M + i * (ancho + sep)
            self.pdf.set_draw_color(*AZUL_NOCHE)
            self.pdf.set_line_width(0.6)
            self.pdf.line(x, y, x + ancho, y)
            self.texto(x, y + 2.5, etiqueta.upper(), 6.5, "B", GRIS, ancho)
            self.texto(x, y + 8, self.recorte(valor, ancho, 19, "B"), 19, "B", AZUL_NOCHE, ancho, fuente="Times")
            if nota:
                self.texto(x, y + 17.5, self.recorte(nota, ancho, 6.8), 6.8, "", GRIS, ancho)
        return y + 25

    def puntos(self, x: float, y: float, w: float, frases: List[str], tam: float = 9.5, numerados=True) -> float:
        pdf = self.pdf
        for i, f in enumerate(frases, 1):
            if y > self.fondo - 8:
                break
            if numerados:
                pdf.set_fill_color(*AZUL_NOCHE)
                pdf.rect(x, y + 0.4, 5, 5, "F")
                self.texto(x, y + 1.3, str(i), 7, "B", (255, 255, 255), 5, "C")
            else:
                pdf.set_fill_color(*MARCA)
                pdf.rect(x + 1, y + 1.6, 1.8, 1.8, "F")
            pdf.set_font("Helvetica", "", tam)
            pdf.set_text_color(*NEGRO)
            pdf.set_xy(x + 8, y)
            pdf.multi_cell(w - 8, tam * 0.5, limpio(f))
            y = pdf.get_y() + 2.4
        return y

    def nota(self, x, y, w, texto_):
        self.pdf.set_font("Helvetica", "I", 7.2)
        self.pdf.set_text_color(*GRIS)
        self.pdf.set_xy(x, y)
        self.pdf.multi_cell(w, 3.6, limpio(texto_))
        return self.pdf.get_y()

    def barras(self, x, y, w, titulo, filas: List[Tuple[str, Optional[float]]], fmt: Callable,
               ref: Optional[float] = None, ref_etq: str = "Flota", mejor_menor: Optional[bool] = None,
               max_filas: int = 12, alto: float = 5.4, etiqueta_w: Optional[float] = None) -> float:
        """Barras horizontales; con `mejor_menor` resalta el mejor (verde) y el
        peor (rojo) valor. `ref` dibuja la línea punteada de la flota."""
        pdf = self.pdf
        self.texto(x, y, titulo, 8.5, "B", NEGRO, w)
        y += 6
        filas = [(e, v) for e, v in filas if v is not None][:max_filas]
        if not filas:
            self.texto(x, y, "Sin datos suficientes.", 7.5, "", GRIS)
            return y + 6
        etq = etiqueta_w or min(52, w * 0.38)
        valor_w = 24
        largo_max = w - etq - valor_w - 2
        tope = max([v for _, v in filas] + ([ref] if ref else [])) or 1
        valores = [v for _, v in filas]
        mejor = (min(valores) if mejor_menor else max(valores)) if mejor_menor is not None and len(filas) > 1 else None
        peor = (max(valores) if mejor_menor else min(valores)) if mejor_menor is not None and len(filas) > 1 else None
        y0 = y
        rotulos = []
        for e, v in filas:
            self.texto(x, y + 0.6, self.recorte(e, etq - 2, 7.2), 7.2, "", NEGRO, etq - 2)
            color = MARCA if v == mejor else ROJO if v == peor else BARRA
            largo = max(largo_max * v / tope, 0.5)
            pdf.set_fill_color(*color)
            pdf.rect(x + etq, y + 0.8, largo, alto - 2, "F")
            rotulos.append((x + etq + largo + 1.5, y + 0.6, fmt(v), color != BARRA))
            y += alto
        if ref:
            # La línea va antes que las cifras, para no taparlas.
            rx = x + etq + largo_max * ref / tope
            pdf.set_draw_color(*AZUL_NOCHE)
            pdf.set_line_width(0.3)
            pdf.set_dash_pattern(dash=1, gap=1)
            pdf.line(rx, y0 - 1, rx, y)
            pdf.set_dash_pattern()
        for rx_, ry, s, fuerte in rotulos:
            pdf.set_font("Helvetica", "B" if fuerte else "", 7)
            pdf.set_fill_color(255, 255, 255)
            pdf.rect(rx_ - 0.5, ry - 0.3, pdf.get_string_width(limpio(s)) + 1, 3.8, "F")
            self.texto(rx_, ry, s, 7, "B" if fuerte else "", NEGRO)
        if ref:
            self.texto(rx - 20, y + 0.5, f"{ref_etq}: {fmt(ref)}", 6.5, "B", AZUL_NOCHE, 40, "C")
            y += 4
        return y + 3

    def tabla(self, x, y, w, columnas: List[Tuple[str, float, str]], filas: List[List[str]],
              resaltar: Optional[int] = None, alto: float = 5.0, tam: float = 7.2) -> Tuple[float, List[List[str]]]:
        """Tabla con encabezado y cebra. Devuelve la y final y las filas que no
        cupieron, para seguir en otra página."""
        pdf = self.pdf
        total = sum(c[1] for c in columnas)
        anchos = [w * c[1] / total for c in columnas]
        cx = x
        for (t, _, al), a in zip(columnas, anchos):
            self.texto(cx + 1, y, t, 6.8, "B", AZUL_NOCHE, a - 2, al)
            cx += a
        y += 4.5
        pdf.set_draw_color(*AZUL_NOCHE)
        pdf.set_line_width(0.4)
        pdf.line(x, y, x + w, y)
        y += 0.8
        resto = list(filas)
        i = 0
        while resto and y + alto <= self.fondo:
            fila = resto.pop(0)
            if i % 2:
                pdf.set_fill_color(*FONDO)
                pdf.rect(x, y, w, alto, "F")
            cx = x
            for j, ((_, _, al), a, val) in enumerate(zip(columnas, anchos, fila)):
                estilo = "B" if j == resaltar or j == 0 else ""
                self.texto(cx + 1, y + 1, self.recorte(val, a - 2, tam, estilo), tam, estilo, NEGRO, a - 2, al)
                cx += a
            y += alto
            i += 1
        pdf.set_draw_color(*GRIS_CLARO)
        pdf.set_line_width(0.2)
        pdf.line(x, y, x + w, y)
        return y, resto


# ─── Informes ─────────────────────────────────────────────────────────────────

def _dim(d: Datos, clave: str) -> Optional[dict]:
    return next((x for x in (d.rendimiento or {}).get("dimensiones", []) if x["clave"] == clave), None)


def _cifra(x, singular, plural):
    return f"{num(x)} {singular if x == 1 else plural}"


def _por_vidas(grupos: List[dict], metrica: str, muestra: int, limite: int) -> List[dict]:
    """Los valores con más vidas (los que pesan), ordenados por la métrica."""
    m = METRICAS[metrica]
    gs = sorted(comparables(grupos, metrica, muestra), key=lambda g: -g["vidas"])[:limite]
    return sorted(gs, key=lambda g: g[m.campo] if m.menor_es_mejor else -g[m.campo])


def _kpis_rendimiento(lz: Lienzo, y: float, r: dict, parque: Optional[dict]) -> float:
    items = [("CPK de la flota", METRICAS["cpk"].fmt(r.get("cpk")), f"{num(r.get('n_cpk'))} vidas medidas"),
             ("Km por vida", f"{num(r.get('km_promedio'))}", f"mediana {num(r.get('km_mediana'))} km"),
             ("Km por milímetro", num(r.get("km_mm")), f"{num(r.get('mm_promedio'), 1)} mm gastados por vida"),
             ("Vidas analizadas", num(r.get("vidas")), f"{num(r.get('llantas'))} llantas · {num(r.get('terminadas'))} terminadas"),
             ("Inversión", dinero(r.get("costo_total")), f"{num(r.get('km_total'))} km recorridos")]
    if parque:
        items.append(("I.R. a piso", num((parque.get("ir") or {}).get("ir"), 2), f"{num(parque.get('llantas'))} llantas montadas"))
    return lz.kpis(y, items)


def _metodo(lz: Lienzo, y: float, metricas: Sequence[str]):
    texto_ = " ".join(f"{METRICAS[m].corto}: {METRICAS[m].ayuda}" for m in metricas)
    lz.texto(lz.M, y, "Cómo se calcula", 8, "B", NEGRO)
    lz.nota(lz.M, y + 5, lz.W - 2 * lz.M, texto_ + " Cada categoría se mide con el cociente de sus sumas, no con el "
            "promedio de cada vida.")


def _pagina_tres_metricas(lz: Lienzo, d: Datos, clave: str, nombre: str):
    dim = _dim(d, clave)
    if not dim:
        return
    r = d.rendimiento["resumen"]
    titulo = hallazgo(clave, dim["grupos"], "cpk", d.muestra, r.get("cpk")) or f"Rendimiento por {nombre.lower()}"
    y = lz.pagina(f"Rendimiento por {nombre.lower()}", titulo,
                  f"Los {12} valores con más vidas y al menos {d.muestra} medidas. Verde: el mejor; rojo: el peor; "
                  f"línea punteada: la flota.")
    col = (lz.W - 2 * lz.M - 16) / 3
    fin = y
    for i, met in enumerate(("cpk", "km", "km_mm")):
        m = METRICAS[met]
        gs = _por_vidas(dim["grupos"], met, d.muestra, 12)
        fin = max(fin, lz.barras(lz.M + i * (col + 8), y, col,
                                 f"{m.titulo} ({'menor' if m.menor_es_mejor else 'mayor'} es mejor)",
                                 [(g["categoria"], g[m.campo]) for g in gs], m.fmt, ref=r.get(m.campo),
                                 mejor_menor=m.menor_es_mejor, etiqueta_w=col * 0.36))
    # Debajo, las cifras de los mismos valores, por número de vidas.
    if fin < lz.fondo - 30:
        filas = [[g["categoria"], num(g["vidas"]), num(g["llantas"]), num(g.get("cpk"), 2), num(g.get("km_promedio")),
                  num(g.get("km_mm")), num(g.get("mm_promedio"), 1), dinero(g.get("costo_total"))]
                 for g in sorted(dim["grupos"], key=lambda g: -g["vidas"])]
        lz.tabla(lz.M, fin + 4, lz.W - 2 * lz.M,
                 [(nombre, 3, "L"), ("Vidas", 1, "R"), ("Llantas", 1, "R"), ("CPK", 1, "R"), ("Km prom.", 1.1, "R"),
                  ("km/mm", 1, "R"), ("mm prom.", 1, "R"), ("Inversión", 1.3, "R")], filas)


def _pagina_parque(lz: Lienzo, p: dict):
    ir = (p.get("ir") or {}).get("ir")
    bajo = pct(p["bajo_minimo"], p["llantas"])
    titulo = (f"{num(p['llantas'])} llantas a piso con un I.R. de {num(ir, 2)}; "
              f"{num(p['bajo_minimo'])} ({bajo}) están en o bajo {num(p['profundidad_minima'], 1)} mm")
    y = lz.pagina("Parque montado", titulo, "Profundidad promedio según la última medición e índice de reencauche "
                  "(promedio de reencauches de la vida actual) de las llantas montadas.")
    col = (lz.W - 2 * lz.M - 12) / 3
    for i, (clave, nombre) in enumerate((("por_marca", "Marca"), ("por_referencia", "Referencia"), ("por_medida", "Medida"))):
        lz.texto(lz.M + i * (col + 6), y, f"A piso por {nombre.lower()}", 8.5, "B")
        filas = [[f["categoria"], num(f["llantas"]), num(f["profundidad_promedio"], 1), num(f["bajo_minimo"]),
                  num(f["ir"], 2)] for f in p.get(clave, [])[:22]]
        lz.tabla(lz.M + i * (col + 6), y + 6, col,
                 [(nombre, 3.2, "L"), ("Llantas", 1.2, "R"), ("Prof.", 1, "R"),
                  (f"<= {num(p['profundidad_minima'], 0)} mm", 1.3, "R"), ("I.R.", 0.9, "R")], filas, resaltar=4)


def _tabla_detalle(lz: Lienzo, d: Datos, clave: str, nombre: str, metrica: Optional[str] = None):
    dim = _dim(d, clave)
    if not dim or not dim["grupos"]:
        return
    grupos = dim["grupos"]
    if metrica:
        comp = comparables(grupos, metrica, d.muestra)
        grupos = comp + [g for g in grupos if g not in comp]
    cols = [(nombre, 3.4, "L"), ("Vidas", 1, "R"), ("Llantas", 1, "R"), ("CPK", 1.2, "R"), ("CPK mín.", 1.1, "R"),
            ("CPK máx.", 1.1, "R"), ("Km prom.", 1.2, "R"), ("Km mediana", 1.2, "R"), ("km/mm", 1, "R"),
            ("mm prom.", 1, "R"), ("Inversión", 1.6, "R")]
    filas = [[g["categoria"], num(g["vidas"]), num(g["llantas"]), num(g.get("cpk"), 2), num(g.get("cpk_min"), 2),
              num(g.get("cpk_max"), 2), num(g.get("km_promedio")), num(g.get("km_mediana")), num(g.get("km_mm")),
              num(g.get("mm_promedio"), 1), f"${num(g.get('costo_total'))}"] for g in grupos]
    resaltar = {"cpk": 3, "km": 6, "km_mm": 8}.get(metrica or "")
    sub = (f"Primero los {len(comparables(dim['grupos'], metrica, d.muestra))} valores comparables, de mejor a peor; "
           f"después los que tienen menos de {d.muestra} vidas medidas." if metrica
           else "Todos los valores de la categoría, ordenados por número de vidas.")
    parte = 1
    while filas:
        y = lz.pagina(f"Detalle por {nombre.lower()}",
                      f"Detalle por {nombre.lower()}" + (f" (continuación {parte})" if parte > 1 else ""), sub)
        _, filas = lz.tabla(lz.M, y, lz.W - 2 * lz.M, cols, filas, resaltar=resaltar)
        parte += 1
        if parte > 30:   # una categoría como «vehículo» puede tener miles de valores
            break


def _tablero(lz: Lienzo, d: Datos, enc: Encabezado, titulo: str, descripcion: str):
    r = (d.rendimiento or {}).get("resumen") or {}
    portada(lz.pdf, enc, titulo, descripcion,
            [_cifra(r.get("vidas", 0), "vida analizada", "vidas analizadas"),
             _cifra(r.get("llantas", 0), "llanta", "llantas"), f"CPK {METRICAS['cpk'].fmt(r.get('cpk'))}"])
    y = lz.pagina("Resumen ejecutivo", "Resumen ejecutivo", d.descripcion)
    y = _kpis_rendimiento(lz, y, r, d.parque)
    frases = []
    for clave, met in (("marca", "cpk"), ("referencia", "cpk"), ("medida", "km_mm"), ("marca", "km")):
        dim = _dim(d, clave)
        h = dim and hallazgo(clave, dim["grupos"], met, d.muestra, r.get(METRICAS[met].campo))
        if h:
            frases.append(h + ".")
    dim = _dim(d, "marca")
    if dim:
        extra = [f for f in lectura("marca", dim["grupos"], "cpk", d.muestra) if "ahorrado" in f]
        frases += extra
    if d.parque and d.parque.get("llantas"):
        p = d.parque
        frases.append(f"{num(p['bajo_minimo'])} de las {num(p['llantas'])} llantas a piso "
                      f"({pct(p['bajo_minimo'], p['llantas'])}) están en o bajo la profundidad mínima "
                      f"de {num(p['profundidad_minima'], 1)} mm.")
    if not frases:
        frases.append("No hay vidas suficientes en el periodo y alcance elegidos para comparar categorías.")
    lz.texto(lz.M, y + 2, "Hallazgos clave", 10, "B", AZUL_NOCHE)
    y = lz.puntos(lz.M, y + 9, lz.W - 2 * lz.M, frases)
    _metodo(lz, max(y + 2, lz.fondo - 22), ("cpk", "km", "km_mm"))
    if r.get("vidas"):
        for clave, nombre in PRINCIPALES:
            _pagina_tres_metricas(lz, d, clave, nombre)
    if d.parque and d.parque.get("llantas"):
        _pagina_parque(lz, d.parque)
    nombre = next((x["nombre"] for x in (d.rendimiento or {}).get("dimensiones", []) if x["clave"] == d.dimension), "Marca")
    if r.get("vidas"):
        _tabla_detalle(lz, d, d.dimension, nombre)


def _pagina_metrica(lz: Lienzo, d: Datos, clave: str, nombre: str, metrica: str):
    dim = _dim(d, clave)
    if not dim:
        return
    m = METRICAS[metrica]
    flota = d.rendimiento["resumen"].get(m.campo)
    titulo = hallazgo(clave, dim["grupos"], metrica, d.muestra, flota) or f"{m.titulo} por {nombre.lower()}"
    y = lz.pagina(f"{m.corto} por {nombre.lower()}", titulo,
                  f"{m.titulo}, {'menor' if m.menor_es_mejor else 'mayor'} es mejor. Valores con al menos "
                  f"{d.muestra} vidas medidas; verde el mejor, rojo el peor, línea punteada la flota.")
    ancho = (lz.W - 2 * lz.M) * 0.62
    gs = comparables(dim["grupos"], metrica, d.muestra)[:26]
    lz.barras(lz.M, y, ancho, f"{m.titulo} por {nombre.lower()}", [(g["categoria"], g[m.campo]) for g in gs], m.fmt,
              ref=flota, mejor_menor=m.menor_es_mejor, max_filas=26, alto=min(5.4, 120 / max(len(gs), 1) + 2))
    x = lz.M + ancho + 10
    lz.texto(x, y, "Lectura", 8.5, "B")
    lz.puntos(x, y + 7, lz.W - lz.M - x, lectura(clave, dim["grupos"], metrica, d.muestra), tam=8.5, numerados=False)


def _metrica(lz: Lienzo, d: Datos, enc: Encabezado, metrica: str, titulo: str, descripcion: str):
    m = METRICAS[metrica]
    r = (d.rendimiento or {}).get("resumen") or {}
    flota = r.get(m.campo)
    nombre_sel = next((x["nombre"] for x in (d.rendimiento or {}).get("dimensiones", []) if x["clave"] == d.dimension),
                      "Marca")
    dim_sel = _dim(d, d.dimension)
    comp = comparables(dim_sel["grupos"], metrica, d.muestra) if dim_sel else []
    portada(lz.pdf, enc, titulo, descripcion,
            [f"Flota: {m.fmt(flota)}", _cifra(r.get(m.n, 0), "vida medida", "vidas medidas"),
             _cifra(len(comp), f"{nombre_sel.lower()} comparada", f"valores de {nombre_sel.lower()} comparados")])
    y = lz.pagina("Resumen ejecutivo", "Resumen ejecutivo", d.descripcion)
    items = [(f"{m.corto} de la flota", m.fmt(flota), _cifra(r.get(m.n, 0), "vida medida", "vidas medidas"))]
    if comp:
        items.append((f"Mejor {nombre_sel.lower()}", m.fmt(comp[0][m.campo]), comp[0]["categoria"]))
        items.append((f"Peor {nombre_sel.lower()}", m.fmt(comp[-1][m.campo]), comp[-1]["categoria"]))
    items.append(("Vidas analizadas", num(r.get("vidas")), f"{num(r.get('llantas'))} llantas"))
    y = lz.kpis(y, items)
    frases = []
    vistas = [(d.dimension, nombre_sel)] + [p for p in PRINCIPALES if p[0] != d.dimension]
    for clave, _ in vistas:
        dim = _dim(d, clave)
        h = dim and hallazgo(clave, dim["grupos"], metrica, d.muestra, flota)
        if h:
            frases.append(h + ".")
    if dim_sel:
        frases += lectura(d.dimension, dim_sel["grupos"], metrica, d.muestra)[:-1]
    if not frases:
        frases.append("No hay vidas suficientes en el periodo y alcance elegidos para comparar.")
    lz.texto(lz.M, y + 2, "Hallazgos clave", 10, "B", AZUL_NOCHE)
    y = lz.puntos(lz.M, y + 9, lz.W - 2 * lz.M, frases)
    _metodo(lz, max(y + 2, lz.fondo - 18), (metrica,))
    if r.get("vidas"):
        for clave, nombre in vistas:
            _pagina_metrica(lz, d, clave, nombre, metrica)
        _tabla_detalle(lz, d, d.dimension, nombre_sel, metrica)


def _vidas(lz: Lienzo, d: Datos, enc: Encabezado, titulo: str, descripcion: str):
    r = (d.rendimiento or {}).get("resumen") or {}
    v = d.vidas or ResumenVidas()
    portada(lz.pdf, enc, titulo, descripcion,
            [_cifra(v.total, "vida", "vidas"), _cifra(v.terminadas, "terminada", "terminadas"),
             _cifra(v.en_servicio, "en servicio", "en servicio")])
    y = lz.pagina("Resumen ejecutivo", "Resumen ejecutivo", d.descripcion)
    y = lz.kpis(y, [("Vidas", num(v.total), f"{num(r.get('llantas'))} llantas"),
                    ("Terminadas", num(v.terminadas), f"{num(v.en_servicio)} en servicio"),
                    ("Km por vida", num(r.get("km_promedio")), f"mediana {num(v.km_mediana)} km"),
                    ("CPK", METRICAS["cpk"].fmt(r.get("cpk")), f"{num(r.get('n_cpk'))} vidas medidas"),
                    ("Km por milímetro", num(r.get("km_mm")), f"{num(r.get('mm_promedio'), 1)} mm por vida")])
    frases = []
    dim_vida = _dim(d, "vida")
    if dim_vida:
        h = hallazgo("vida", dim_vida["grupos"], "cpk", d.muestra, r.get("cpk"))
        if h:
            frases.append(h + ".")
        h = hallazgo("vida", dim_vida["grupos"], "km", d.muestra, r.get("km_promedio"))
        if h:
            frases.append(h + ".")
    if v.km_mediana is not None:
        frases.append(f"La mitad de las vidas recorre menos de {num(v.km_mediana)} km.")
    if v.motivos and v.terminadas:
        motivo, n = v.motivos[0]
        frases.append(f"«{motivo}» es el motivo de fin más frecuente: {pct(n, v.terminadas)} de las vidas "
                      f"terminadas.")
    if v.mejores:
        frases.append(f"La vida terminada más económica costó {METRICAS['cpk'].fmt(v.mejores[0]['cpk'])} "
                      f"({v.mejores[0]['codigo']}, {v.mejores[0]['vida']}).")
    if not frases:
        frases.append("No hay vidas de llanta en el periodo y alcance elegidos.")
    lz.texto(lz.M, y + 2, "Hallazgos clave", 10, "B", AZUL_NOCHE)
    lz.puntos(lz.M, y + 9, lz.W - 2 * lz.M, frases)
    if not v.total:
        return

    # ¿Rinde el reencauche? Una fila por número de vida.
    if dim_vida and dim_vida["grupos"]:
        titulo_ = hallazgo("vida", dim_vida["grupos"], "cpk", d.muestra, r.get("cpk")) or "Rendimiento por número de vida"
        y = lz.pagina("Rendimiento por vida", titulo_, "Nueva (VN) frente a cada reencauche: costo, kilómetros y desgaste.")
        col = (lz.W - 2 * lz.M - 10) / 2
        gs = comparables(dim_vida["grupos"], "cpk", d.muestra)
        fin = lz.barras(lz.M, y, col, "Costo por kilómetro (menor es mejor)", [(g["categoria"], g["cpk"]) for g in gs],
                        METRICAS["cpk"].fmt, ref=r.get("cpk"), mejor_menor=True)
        gs = comparables(dim_vida["grupos"], "km", d.muestra)
        fin = max(fin, lz.barras(lz.M + col + 10, y, col, "Km por vida (mayor es mejor)",
                                 [(g["categoria"], g["km_promedio"]) for g in gs],
                                 METRICAS["km"].fmt, ref=r.get("km_promedio"), mejor_menor=False))
        filas = [[g["categoria"], num(g["vidas"]), num(g["terminadas"]), num(g.get("cpk"), 2), num(g.get("km_promedio")),
                  num(g.get("km_mm")), num(g.get("mm_promedio"), 1), dinero(g.get("costo_total"))]
                 for g in dim_vida["grupos"]]
        lz.tabla(lz.M, fin + 6, lz.W - 2 * lz.M,
                 [("Vida", 1.4, "L"), ("Vidas", 1, "R"), ("Terminadas", 1.1, "R"), ("CPK", 1, "R"),
                  ("Km prom.", 1.1, "R"), ("km/mm", 1, "R"), ("mm prom.", 1, "R"), ("Inversión", 1.5, "R")], filas)

    # Distribución de kilómetros y motivos de fin.
    y = lz.pagina("Distribución", f"La mitad de las vidas recorre menos de {num(v.km_mediana)} km"
                  if v.km_mediana is not None else "Distribución de kilómetros por vida",
                  "Cuántas vidas caen en cada tramo de kilómetros y por qué terminaron las que ya salieron de servicio.")
    col = (lz.W - 2 * lz.M - 10) / 2
    lz.barras(lz.M, y, col, "Vidas por tramo de kilómetros", [(e, n) for e, n in v.distribucion_km],
              lambda x: num(x), max_filas=12, etiqueta_w=col * 0.4)
    lz.barras(lz.M + col + 10, y, col, "Motivo de fin de las vidas terminadas",
              [(e, n) for e, n in v.motivos[:12]], lambda x: f"{num(x)} ({pct(x, v.terminadas)})"
              if v.terminadas else num(x), max_filas=12, etiqueta_w=col * 0.4)

    # Mejores y peores vidas terminadas por CPK.
    if v.mejores:
        y = lz.pagina("Vidas extremas", "Las vidas terminadas más y menos económicas",
                      "Por costo por kilómetro, entre las vidas terminadas que superan los kilómetros mínimos.")
        cols = [("Llanta", 1.4, "L"), ("Vida", 0.7, "L"), ("Marca", 1.3, "L"), ("Medida", 1.3, "L"),
                ("Vehículo", 1.2, "L"), ("Km", 1, "R"), ("CPK", 1, "R"), ("km/mm", 0.9, "R")]

        def fila(x):
            return [x["codigo"], x["vida"], x.get("marca") or "-", x.get("medida") or "-", x.get("vehiculo") or "-",
                    num(x.get("km")), num(x.get("cpk"), 2), num(x.get("km_mm"))]
        col = (lz.W - 2 * lz.M - 10) / 2
        lz.texto(lz.M, y, "Más económicas", 8.5, "B", MARCA)
        lz.tabla(lz.M, y + 6, col, cols, [fila(x) for x in v.mejores], resaltar=6)
        if v.peores:
            lz.texto(lz.M + col + 10, y, "Más costosas", 8.5, "B", ROJO)
            lz.tabla(lz.M + col + 10, y + 6, col, cols, [fila(x) for x in v.peores], resaltar=6)


def _composicion(lz: Lienzo, d: Datos, enc: Encabezado, titulo: str, descripcion: str):
    g = d.composicion or {}
    total = d.composicion_total
    vidas = dict(g.get("Vida", []))
    reenc = 100 * (total - vidas.get("VN", 0)) / total if total else 0
    ir = ((d.parque or {}).get("ir") or {}).get("ir")
    portada(lz.pdf, enc, titulo, descripcion,
            [_cifra(total, "llanta a piso", "llantas a piso"), _cifra(len(g.get("Marca", [])), "marca", "marcas"),
             _cifra(len(g.get("Medida", [])), "medida", "medidas")])
    y = lz.pagina("Resumen ejecutivo", "Resumen ejecutivo", "Llantas montadas en vehículos (a piso).")
    y = lz.kpis(y, [("Llantas a piso", num(total), "montadas"),
                    ("Marcas", num(len(g.get("Marca", []))), ""),
                    ("Referencias", num(len(g.get("Referencia", []))), ""),
                    ("Medidas", num(len(g.get("Medida", []))), ""),
                    ("Reencauchadas", f"{num(reenc)} %", "al menos un reencauche"),
                    ("I.R. a piso", num(ir, 2), "promedio de reencauches")])
    lz.texto(lz.M, y + 2, "Hallazgos clave", 10, "B", AZUL_NOCHE)
    lz.puntos(lz.M, y + 9, lz.W - 2 * lz.M, resumen_composicion(g, total))
    if not total:
        return

    def con_pct(x):
        return f"{num(x)} ({pct(x, total)})"

    marcas = g.get("Marca", [])
    titulo_ = (f"«{marcas[0][0]}» concentra el {pct(marcas[0][1], total)} del parque montado"
               if marcas else "Composición por marca y medida")
    y = lz.pagina("Marca y medida", titulo_, "Llantas a piso por marca y por medida; se muestran las 18 principales.")
    col = (lz.W - 2 * lz.M - 10) / 2
    lz.barras(lz.M, y, col, "Por marca", marcas, con_pct, max_filas=18, alto=6)
    lz.barras(lz.M + col + 10, y, col, "Por medida", g.get("Medida", []), con_pct, max_filas=18, alto=6)

    titulo_ = (f"El {num(reenc)} % de las llantas a piso ya fue reencauchada" if vidas
               else "Composición por referencia, vida y uso")
    y = lz.pagina("Referencia, vida y uso", titulo_, "Las referencias más montadas, el número de vida y el tipo de uso.")
    col = (lz.W - 2 * lz.M - 20) / 3
    lz.barras(lz.M, y, col * 1.4, "Por referencia", g.get("Referencia", []), con_pct, max_filas=20, etiqueta_w=col * 0.62)
    x = lz.M + col * 1.4 + 10
    lz.barras(x, y, col * 0.8, "Por vida", g.get("Vida", []), con_pct, max_filas=10, etiqueta_w=col * 0.22)
    x += col * 0.8 + 10
    lz.barras(x, y, col * 0.8, "Por tipo de uso", g.get("Tipo de uso", []), con_pct, max_filas=10, etiqueta_w=col * 0.32)
