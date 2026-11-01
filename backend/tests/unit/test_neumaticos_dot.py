"""
Semana y año de fabricación leídos del DOT.

Un DOT ilegible no bloquea el registro: deja la llanta sin fecha de fabricación.
"""
from datetime import date

from app.core.neumaticos_dot import interpretar_dot


def test_dot_valido():
    assert interpretar_dot("DOT 4B7X ABC 2321", date(2022, 1, 1)) == (23, 2021)


def test_dot_con_espacios_y_letras_al_final():
    assert interpretar_dot("  dot 4b7x 0119 ", date(2020, 5, 1)) == (1, 2019)


def test_semana_inexistente():
    assert interpretar_dot("DOT 4B7X 6721", date(2022, 1, 1)) == (None, None)
    assert interpretar_dot("DOT 4B7X 0021", date(2022, 1, 1)) == (None, None)


def test_sin_cuatro_digitos_finales():
    assert interpretar_dot("DOT 4B7X 231", date(2022, 1, 1)) == (None, None)
    assert interpretar_dot("", date(2022, 1, 1)) == (None, None)
    assert interpretar_dot(None) == (None, None)


def test_fabricada_despues_del_registro():
    # Semana 30 de 2024 para una llanta registrada en marzo de 2024: mal digitado.
    assert interpretar_dot("DOT ABC 3024", date(2024, 3, 1)) == (None, None)


def test_corregir_dot_cambia_la_semana():
    assert interpretar_dot("DOT X 2321", date(2022, 1, 1))[0] == 23
    assert interpretar_dot("DOT X 2421", date(2022, 1, 1))[0] == 24
