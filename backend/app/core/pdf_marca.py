"""
Piezas comunes de los informes PDF: la portada de consultoría (logo del cliente
al centro, firma de TittanWare al pie), el logotipo tipográfico y el texto que
la fuente Helvetica puede escribir.

La usan el informe de estado de la flota y los informes de rendimiento y
composición de llantas, para que todos los PDF se vean como una sola familia.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

NEGRO = (26, 26, 26)
GRIS = (100, 116, 139)
GRIS_CLARO = (226, 232, 240)
FONDO = (248, 250, 252)
AZUL_NOCHE = (5, 28, 44)
MARCA = (39, 136, 74)

MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
         "noviembre", "diciembre")

_REEMPLAZOS = {"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", "≤": "<=", "≥": ">=",
               " ": " "}


def limpio(valor) -> str:
    """Texto que la fuente Helvetica del PDF puede escribir (latin-1)."""
    texto = "" if valor is None else str(valor).replace("\r", "")
    for viejo, nuevo in _REEMPLAZOS.items():
        texto = texto.replace(viejo, nuevo)
    return texto.encode("latin-1", "replace").decode("latin-1")


@dataclass
class Encabezado:
    empresa: str
    periodo: str
    generado_por: str
    generado_en: datetime
    logo: Optional[str] = None   # ruta local de una imagen


URL_WEB = "https://tittanware.com"


def marca(pdf, tam, color, w=0, alinear="L", alto=None):
    """El logotipo de TittanWare: Helvetica en versales con espaciado amplio,
    la misma lectura que el logotipo tipográfico de la aplicación. Enlaza a la
    web de TittanWare."""
    pdf.set_font("Helvetica", "B", tam)
    pdf.set_text_color(*color)
    pdf.set_char_spacing(tam * 0.22)
    pdf.cell(w, alto or tam * 0.45, "TITTANWARE", align=alinear, link=URL_WEB)
    pdf.set_char_spacing(0)


def enlace_web(pdf, color=None, tam=6.5, texto="tittanware.com"):
    """«tittanware.com», con enlace, centrado en el borde inferior de la página.

    Todos los PDF de la plataforma lo llevan en cada hoja. Va en los últimos
    5 mm, por debajo del pie de cada informe, y deja el cursor donde estaba
    para no mover lo que se esté escribiendo."""
    x, y = pdf.get_x(), pdf.get_y()
    corte, margen = pdf.auto_page_break, pdf.b_margin
    pdf.set_auto_page_break(False)
    pdf.set_font("Helvetica", "", tam)
    pdf.set_text_color(*(color or GRIS))
    pdf.set_char_spacing(0)
    pdf.set_xy(0, pdf.h - 5.6)
    pdf.cell(pdf.w, 3.6, texto, align="C", link=URL_WEB)
    pdf.set_auto_page_break(corte, margen)
    pdf.set_xy(x, y)


def medidas_logo(ruta: str, ancho_max: float, alto_max: float):
    """Ancho y alto para que el logo quepa en la caja sin deformarse."""
    from PIL import Image
    with Image.open(ruta) as img:
        w, h = img.size
    escala = min(ancho_max / w, alto_max / h)
    return w * escala, h * escala


def portada(pdf, enc: Encabezado, titulo: str, descripcion: str, cifras: List[str],
            etiqueta: str = "INFORME DE GESTIÓN DE LLANTAS"):
    """Portada sobria de informe de consultoría: mucho blanco, el logo del
    cliente al centro, el título en serif y la firma de TittanWare al pie."""
    W, H, M = pdf.w, pdf.h, 22
    pdf.add_page()

    def linea(y, x0=M, x1=None, color=AZUL_NOCHE, grosor=0.6):
        pdf.set_draw_color(*color)
        pdf.set_line_width(grosor)
        pdf.line(x0, y, W - M if x1 is None else x1, y)

    def centrado(y, s, fuente, estilo, tam, color):
        pdf.set_font(fuente, estilo, tam)
        # Un título largo se achica hasta caber en una línea.
        while tam > 18 and pdf.get_string_width(limpio(s)) > W - 2 * M:
            tam -= 1
            pdf.set_font(fuente, estilo, tam)
        pdf.set_text_color(*color)
        pdf.set_xy(M, y)
        pdf.cell(W - 2 * M, tam * 0.45, limpio(s), align="C")

    # Cabecera: etiqueta del documento y fecha, sobre una línea fina.
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*AZUL_NOCHE)
    pdf.set_char_spacing(1.2)
    pdf.set_xy(M, 14)
    pdf.cell(150, 4, limpio(etiqueta))
    pdf.set_char_spacing(0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*GRIS)
    pdf.set_xy(W - M - 80, 14)
    pdf.cell(80, 4, limpio(f"{MESES[enc.generado_en.month - 1].capitalize()} de {enc.generado_en.year}"), align="R")
    linea(20)

    # Logo del cliente al centro; sin logo, su nombre en grande.
    caja_w, caja_h, caja_y = 120.0, 48.0, 34.0
    dibujado = False
    if enc.logo:
        try:
            lw, lh = medidas_logo(enc.logo, caja_w, caja_h)
            pdf.image(enc.logo, x=(W - lw) / 2, y=caja_y + (caja_h - lh) / 2, w=lw, h=lh)
            dibujado = True
        except Exception:   # noqa: BLE001 — un logo ilegible no impide el informe
            pass
    if not dibujado and enc.empresa:
        centrado(caja_y + caja_h / 2 - 6, enc.empresa, "Times", "B", 26, AZUL_NOCHE)

    # Título, subtítulo y una regla corta de acento.
    centrado(98, titulo, "Times", "B", 34, AZUL_NOCHE)
    centrado(115, f"{enc.empresa} · {enc.periodo}" if enc.empresa else enc.periodo, "Helvetica", "", 11.5, GRIS)
    linea(126, W / 2 - 16, W / 2 + 16, MARCA, 1.2)
    centrado(132, descripcion, "Helvetica", "", 10, NEGRO)
    if cifras:
        centrado(140, "   |   ".join(cifras), "Helvetica", "", 8.5, GRIS)

    # Pie: banda azul noche con quién lo pidió y la firma de TittanWare.
    alto = 26
    pdf.set_fill_color(*AZUL_NOCHE)
    pdf.rect(0, H - alto, W, alto, "F")
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(203, 213, 225)
    pdf.set_xy(M, H - alto + 8)
    pdf.cell(140, 4, limpio(f"Preparado para {enc.empresa}" if enc.empresa else "Informe de la flota"))
    pdf.set_xy(M, H - alto + 13)
    pdf.cell(140, 4, limpio(f"Generado el {enc.generado_en:%d/%m/%Y %H:%M} por {enc.generado_por}"))
    pdf.set_xy(W - M - 90, H - alto + 7.5)
    marca(pdf, 15, (255, 255, 255), w=90, alinear="R")
    pdf.set_font("Helvetica", "", 5.8)
    pdf.set_text_color(148, 163, 184)
    pdf.set_char_spacing(0.6)
    pdf.set_xy(W - M - 110, H - alto + 15.5)
    pdf.cell(110, 3, limpio("TECNOLOGÍA QUE FORTALECE · SOLUCIONES QUE TRASCIENDEN"), align="R")
    pdf.set_char_spacing(0)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(203, 213, 225)
    pdf.set_xy(W - M - 60, H - alto + 19.5)
    pdf.cell(60, 3.5, "tittanware.com", align="R", link=URL_WEB)
