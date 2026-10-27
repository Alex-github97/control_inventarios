"""
La landing ya no publica precios, aunque la base los tenga guardados.

El contenido se edita desde la consola y vive en un solo documento JSON: un
contenido publicado antes del cambio, o una copia vieja pegada en el editor,
puede traer todavía los textos de la sección de tarifas.
"""
from app.api.v1.endpoints.landing import CONTENIDO_INICIAL, sin_precios


def test_quita_las_claves_de_tarifas_unidades_y_ejemplos():
    guardado = {
        "hero_lema": "Tecnología que fortalece",
        "tarifas_titulo": "Se paga lo que se usa.",
        "tarifas_texto": "Sin cobro por usuario.",
        "unidades_titulo": "Tres unidades",
        "ejemplos_texto": "Cuánto le costaría",
    }
    assert sin_precios(guardado) == {"hero_lema": "Tecnología que fortalece"}


def test_corrige_la_frase_vieja_de_los_modulos():
    guardado = {"modulos_texto": "El resto sencillamente no aparece: ni en el menú, ni en el precio."}
    assert sin_precios(guardado)["modulos_texto"] == "El resto sencillamente no aparece en el menú."


def test_no_toca_el_resto_ni_el_original():
    guardado = {"pilares": [{"clave": "01"}], "correo": "contacto@tittanware.com",
                "tarifas_titulo": "x"}
    limpio = sin_precios(guardado)
    assert limpio == {"pilares": [{"clave": "01"}], "correo": "contacto@tittanware.com"}
    assert "tarifas_titulo" in guardado


def test_el_contenido_de_fabrica_ya_sale_limpio():
    assert sin_precios(CONTENIDO_INICIAL) == CONTENIDO_INICIAL
    assert "precio" not in str(CONTENIDO_INICIAL)
