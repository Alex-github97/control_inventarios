"""
Novedades y sugerencias de llantas a partir de la última inspección.

Una sola definición para todos los que las muestran: el informe PDF de flota,
la vista del vehículo y la vista previa de las reglas. Si cada uno contara las
novedades a su manera, el resumen del informe y la pantalla no coincidirían.

- **Novedades**: condiciones fijas, con los umbrales de la configuración de
  llantas (profundidad mínima y su margen, rango de presión, desalineación por
  eje, diferencia entre hombros, estado visual).
- **Sugerencias**: reglas que escribe la empresa. Cada condición compara un
  campo de una lista cerrada (`CAMPOS`) con un valor; nunca es una expresión
  libre, así que una regla no puede ejecutar nada ni referirse a un dato que
  no existe.

La primera parte no toca la base y tiene pruebas unitarias. `cargar_flota`, al
final, es el único que consulta.
"""
import string
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence

# ─── Campos y operadores de las reglas ────────────────────────────────────────

# campo → (nombre en pantalla, tipo, unidad u opciones)
CAMPOS: Dict[str, tuple] = {
    "profundidad_minima": ("Profundidad mínima", "num", "mm"),
    "profundidad_promedio": ("Profundidad promedio", "num", "mm"),
    "diferencia_hombros": ("Diferencia entre hombros", "num", "mm"),
    "presion": ("Presión", "num", "psi"),
    "presion_vs_recomendada": ("Presión frente a la recomendada", "num", "%"),
    "presion_fuera_rango": ("Presión fuera del rango configurado", "texto", ["SI", "NO"]),
    "diferencia_par_dual": ("Diferencia con su par dual", "num", "mm"),
    "diferencia_eje": ("Más gastada que la mejor del eje por", "num", "mm"),
    "reencauches": ("Número de reencauches", "num", ""),
    "vida": ("Vida", "texto", ["VN", "R1", "R2", "R3", "R4"]),
    "tipo_uso": ("Tipo de uso", "texto", ["DIRECCIONAL", "TRACCION", "REMOLQUE", "MULTIPOSICION", "REPUESTO"]),
    "eje": ("Eje (0 = repuesto)", "num", ""),
    "estado_visual": ("Estado visual", "texto", ["BUENO", "REGULAR", "CRITICO"]),
    "km_desde_rotacion": ("Km desde la última rotación o montaje", "num", "km"),
}
OPERADORES_NUM = ("<", "<=", ">", ">=", "=", "!=")
OPERADORES_TEXTO = ("=", "!=")
TIPOS_REGLA = ("ROTACION", "REENCAUCHE", "RETIRO", "PRESION", "ALINEACION", "OTRO")

TIPOS_NOVEDAD: Dict[str, str] = {
    "PROFUNDIDAD_MINIMA": "Profundidad en o bajo el mínimo",
    "PROFUNDIDAD_ALERTA": "Profundidad cerca del mínimo",
    "PRESION": "Presión fuera de rango",
    "DESALINEACION": "Desalineación en el eje",
    "DESGASTE_IRREGULAR": "Desgaste irregular entre hombros",
    "ESTADO_VISUAL": "Estado visual regular o crítico",
}


def validar_condicion(campo: str, operador: str, valor: str) -> Optional[str]:
    """El error de una condición, o None si es válida. Se llama al guardar la
    regla: una condición inválida no llega a la base."""
    if campo not in CAMPOS:
        return f"El campo «{campo}» no existe."
    tipo = CAMPOS[campo][1]
    if tipo == "num":
        if operador not in OPERADORES_NUM:
            return f"El operador «{operador}» no sirve para un número."
        try:
            float(str(valor).replace(",", "."))
        except ValueError:
            return f"«{valor}» no es un número."
    else:
        if operador not in OPERADORES_TEXTO:
            return f"Un campo de texto solo admite = o !=."
        if str(valor).strip().upper() not in CAMPOS[campo][2]:
            return f"«{valor}» no es un valor de {CAMPOS[campo][0]}."
    return None


# ─── Datos de una llanta inspeccionada ────────────────────────────────────────

@dataclass
class Umbrales:
    profundidad_minima: float = 3.0
    margen_alerta: float = 2.0
    presion_min: float = 90.0
    presion_max: float = 120.0
    umbral_desalineacion: float = 2.0
    diferencia_hombros: float = 3.0


@dataclass
class LlantaInsp:
    neumatico_id: int
    codigo: str
    activo_id: int
    posicion: str
    posicion_label: str = ""
    eje: Optional[int] = None
    lado: Optional[str] = None
    marca: Optional[str] = None
    referencia: Optional[str] = None
    medida: Optional[str] = None
    tipo_uso: Optional[str] = None
    reencauches: int = 0
    izq: Optional[float] = None
    centro: Optional[float] = None
    der: Optional[float] = None
    presion: Optional[float] = None
    presion_recomendada: Optional[float] = None
    estado_visual: Optional[str] = None
    fecha: Optional[datetime] = None          # de la última inspección; None = sin inspección
    km_inspeccion: Optional[float] = None
    km_rotacion: Optional[float] = None       # odómetro de la última rotación o montaje
    observaciones: Optional[str] = None
    en_filtro: bool = True

    @property
    def inspeccionada(self) -> bool:
        return self.fecha is not None

    @property
    def medidas(self) -> List[float]:
        return [x for x in (self.izq, self.centro, self.der) if x is not None]

    @property
    def pmin(self) -> Optional[float]:
        return min(self.medidas) if self.medidas else None

    @property
    def pprom(self) -> Optional[float]:
        return round(sum(self.medidas) / len(self.medidas), 1) if self.medidas else None

    @property
    def dif_hombros(self) -> Optional[float]:
        if self.izq is None or self.der is None:
            return None
        return round(abs(self.izq - self.der), 1)

    @property
    def vida(self) -> str:
        return "VN" if not self.reencauches else f"R{self.reencauches}"


@dataclass
class Novedad:
    tipo: str
    texto: str


@dataclass
class Sugerencia:
    regla_id: int
    regla: str
    tipo: str
    prioridad: int
    texto: str
    neumatico_id: int
    posicion: str
    valores: Dict[str, Any] = field(default_factory=dict)


# ─── Novedades ────────────────────────────────────────────────────────────────

def _por_eje(llantas: Iterable[LlantaInsp]) -> Dict[tuple, List[LlantaInsp]]:
    grupos: Dict[tuple, List[LlantaInsp]] = {}
    for ll in llantas:
        if ll.inspeccionada and ll.eje and ll.pmin is not None:
            grupos.setdefault((ll.activo_id, ll.eje), []).append(ll)
    return grupos


def novedades(llantas: Sequence[LlantaInsp], u: Umbrales) -> Dict[int, List[Novedad]]:
    """Las novedades de cada llanta inspeccionada (id → lista). Una llanta sin
    inspección en el periodo no tiene novedades: no se inventan datos."""
    salida: Dict[int, List[Novedad]] = {}

    def anotar(ll, tipo, texto):
        salida.setdefault(ll.neumatico_id, []).append(Novedad(tipo, texto))

    for ll in llantas:
        if not ll.inspeccionada:
            continue
        p = ll.pmin
        if p is not None and p <= u.profundidad_minima:
            anotar(ll, "PROFUNDIDAD_MINIMA", f"{p} mm, en o bajo el mínimo de {u.profundidad_minima} mm")
        elif p is not None and p <= u.profundidad_minima + u.margen_alerta:
            anotar(ll, "PROFUNDIDAD_ALERTA", f"{p} mm, a menos de {u.margen_alerta} mm del mínimo")
        if ll.presion is not None and (ll.presion < u.presion_min or ll.presion > u.presion_max):
            anotar(ll, "PRESION", f"{ll.presion} psi, fuera de {u.presion_min}-{u.presion_max}")
        if ll.dif_hombros is not None and ll.dif_hombros > u.diferencia_hombros:
            anotar(ll, "DESGASTE_IRREGULAR", f"{ll.dif_hombros} mm entre hombros")
        if (ll.estado_visual or "").upper() in ("REGULAR", "CRITICO"):
            anotar(ll, "ESTADO_VISUAL", f"Estado visual {ll.estado_visual.lower()}")

    # Desalineación: como la alerta del módulo, se marca la llanta más gastada
    # del eje cuando la diferencia con la mejor pasa el umbral.
    for (_, eje), grupo in _por_eje(llantas).items():
        if len(grupo) < 2:
            continue
        profs = [g.pmin for g in grupo]
        dif = round(max(profs) - min(profs), 1)
        if dif > u.umbral_desalineacion:
            peor = min(grupo, key=lambda g: g.pmin)
            anotar(peor, "DESALINEACION", f"{dif} mm de diferencia en el eje {eje}")
    return salida


# ─── Sugerencias ──────────────────────────────────────────────────────────────

def variables(llantas: Sequence[LlantaInsp], u: Umbrales) -> Dict[int, Dict[str, Any]]:
    """Los valores de cada campo de `CAMPOS` para cada llanta inspeccionada."""
    ejes = _por_eje(llantas)
    salida = {}
    for ll in llantas:
        if not ll.inspeccionada:
            continue
        grupo = ejes.get((ll.activo_id, ll.eje), [])
        mejor = max((g.pmin for g in grupo), default=None)
        par = [g for g in grupo if g is not ll and g.lado == ll.lado]
        presion_vs = None
        if ll.presion is not None and ll.presion_recomendada:
            presion_vs = round(100 * (ll.presion - ll.presion_recomendada) / ll.presion_recomendada, 1)
        km_rot = None
        if ll.km_inspeccion is not None and ll.km_rotacion is not None:
            km_rot = max(0.0, ll.km_inspeccion - ll.km_rotacion)
        salida[ll.neumatico_id] = {
            "profundidad_minima": ll.pmin,
            "profundidad_promedio": ll.pprom,
            "diferencia_hombros": ll.dif_hombros,
            "presion": ll.presion,
            "presion_vs_recomendada": presion_vs,
            "presion_fuera_rango": None if ll.presion is None else
            ("SI" if ll.presion < u.presion_min or ll.presion > u.presion_max else "NO"),
            # El par dual es la otra llanta del mismo lado del eje, si hay solo una.
            "diferencia_par_dual": round(abs(ll.pmin - par[0].pmin), 1)
            if len(par) == 1 and ll.pmin is not None else None,
            "diferencia_eje": round(mejor - ll.pmin, 1) if mejor is not None and ll.pmin is not None
            and len(grupo) > 1 else None,
            "reencauches": ll.reencauches,
            "vida": ll.vida,
            "tipo_uso": (ll.tipo_uso or "").upper() or None,
            "eje": ll.eje,
            "estado_visual": (ll.estado_visual or "").upper() or None,
            "km_desde_rotacion": km_rot,
        }
    return salida


def _cumple(valor, operador: str, objetivo: str) -> bool:
    if valor is None:
        return False
    if isinstance(valor, str):
        a, b = valor.upper(), str(objetivo).strip().upper()
        return a == b if operador == "=" else a != b
    b = float(str(objetivo).replace(",", "."))
    return {"<": valor < b, "<=": valor <= b, ">": valor > b, ">=": valor >= b,
            "=": valor == b, "!=": valor != b}[operador]


class _Marcadores(dict):
    def __missing__(self, clave):
        return "{" + clave + "}"


def _redondear(v):
    return round(v, 1) if isinstance(v, float) else v


def sugerencias(llantas: Sequence[LlantaInsp], reglas: Sequence[Any], u: Umbrales) -> Dict[int, List[Sugerencia]]:
    """Las sugerencias de cada llanta (id → lista ordenada por prioridad).

    `reglas` son objetos con id, nombre, tipo, prioridad, texto, activa y
    condiciones (cada una con campo, operador y valor). Una regla inactiva o
    sin condiciones no genera nada."""
    vars_ = variables(llantas, u)
    por_id = {ll.neumatico_id: ll for ll in llantas}
    salida: Dict[int, List[Sugerencia]] = {}
    for regla in reglas:
        conds = list(regla.condiciones or [])
        if not regla.activa or not conds:
            continue
        for nid, v in vars_.items():
            if not all(_cumple(v.get(c.campo), c.operador, c.valor) for c in conds):
                continue
            ll = por_id[nid]
            datos = _Marcadores({k: _redondear(x) for k, x in v.items() if x is not None})
            datos.update(codigo=ll.codigo, posicion=ll.posicion_label or ll.posicion,
                         profundidad=_redondear(ll.pmin), marca=ll.marca or "", referencia=ll.referencia or "",
                         medida=ll.medida or "")
            texto = string.Formatter().vformat(regla.texto, (), datos)
            salida.setdefault(nid, []).append(Sugerencia(
                regla_id=regla.id, regla=regla.nombre, tipo=regla.tipo, prioridad=regla.prioridad,
                texto=texto, neumatico_id=nid, posicion=ll.posicion,
                valores={c.campo: _redondear(v.get(c.campo)) for c in conds}))
    for lista in salida.values():
        lista.sort(key=lambda s: (s.prioridad, s.regla))
    return salida


# Las reglas con las que arranca una empresa: las mismas tres alertas que ya
# tenía el módulo, escritas como reglas para que se puedan editar.
def reglas_iniciales(u: Umbrales) -> List[dict]:
    return [
        dict(nombre="Retirar por profundidad mínima", tipo="RETIRO", prioridad=1,
             texto="Retirar la llanta {codigo} de la {posicion} para reencauche o descarte: "
                   "{profundidad} mm, en o bajo el mínimo.",
             condiciones=[("profundidad_minima", "<=", f"{u.profundidad_minima:g}")]),
        dict(nombre="Ajustar presión", tipo="PRESION", prioridad=2,
             texto="Ajustar la presión de la {posicion} ({codigo}): {presion} psi, fuera del rango.",
             condiciones=[("presion_fuera_rango", "=", "SI")]),
        dict(nombre="Revisar alineación o rotar", tipo="ALINEACION", prioridad=2,
             texto="Revisar alineación o rotar en el eje {eje}: la {posicion} ({codigo}) está "
                   "{diferencia_eje} mm más gastada que la mejor del eje.",
             condiciones=[("diferencia_eje", ">", f"{u.umbral_desalineacion:g}")]),
    ]
