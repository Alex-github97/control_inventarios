"""
Los módulos que se pueden contratar, y a qué rutas corresponde cada uno.

Esta tabla es la que convierte «el cliente contrató EAM» en algo que el
servidor puede hacer cumplir: sin el mapa de prefijos, la lista de módulos
contratados sería decorativa y cualquiera podría entrar a un módulo que no paga
escribiendo la URL a mano.
"""
from typing import Dict, List, NamedTuple, Optional


class Modulo(NamedTuple):
    clave: str
    nombre: str
    # Prefijos de la API que pertenecen a este módulo.
    prefijos: tuple
    # Los que no se pueden quitar: sin ellos no se puede ni entrar ni
    # administrar la propia empresa, así que no tiene sentido venderlos aparte.
    esencial: bool = False


MODULOS: List[Modulo] = [
    Modulo("control", "Control de Estibas",
           ("/estibas", "/movimientos", "/manifiestos", "/danos", "/trazabilidad",
            "/dashboard", "/ubicaciones", "/consultas", "/scan-sessions")),
    Modulo("tarifax", "TarifaX · Motor de Tarifas", ("/tarifax",)),
    Modulo("grc",     "GRC · Riesgo y Cumplimiento", ("/grc",)),
    Modulo("qms",     "QMS · Calidad", ("/qms",)),
    Modulo("dms",     "DMS · Gestión Documental", ("/dms",)),
    Modulo("tms",     "TMS · Transporte", ("/tms", "/fletes")),
    # La gestión de flotas se unificó acá: era un módulo aparte que vendía lo
    # mismo —vehículos, combustible, documentos, rutinas— desde otra puerta.
    # Sus rutas siguen existiendo y ahora pertenecen al CMMS, así que quien
    # contrata mantenimiento tiene la flota y no hay que venderlas por separado.
    # Se pudo hacer sin romper nada porque ningún cliente tenía `flota` activo.
    Modulo("eam",     "CMMS / EAM · Mantenimiento",
           ("/eam", "/mantenimiento", "/lubricacion", "/flota", "/vehiculos")),
    Modulo("ags",     "AGS · Agenda de Servicios", ("/ags",)),
    Modulo("wms",     "WMS · Almacenes", ("/wms",)),
    Modulo("gh",      "Gestión Humana", ("/hcm", "/gh")),
    Modulo("command", "Command Center", ("/command-center",)),
    Modulo("lms",     "LMS · Formación", ("/lms",)),
    Modulo("crm",     "CRM · Comercial", ("/crm",)),
    Modulo("mes",     "MES · Producción", ("/mes",)),
    Modulo("aps",     "APS · Planeación", ("/aps",)),
    Modulo("erp",     "ERP · Financiero", ("/erp",)),
    Modulo("scm",     "SCM · Cadena de Suministro", ("/scm",)),
    Modulo("sst",     "SST · Seguridad y Salud", ("/sst",)),
    # OJO: hoy no tiene NINGUNA ruta en el servidor. Se deja declarado para no
    # romper contratos existentes, pero no se debe vender hasta que exista algo
    # detrás; por eso tampoco aparece en la página pública.
    Modulo("locativa", "Mantenimiento Locativo", ("/locative",)),
    # Sin esto nadie entra ni administra su empresa: no se vende aparte.
    Modulo("base", "Acceso y administración",
           ("/auth", "/usuarios", "/roles", "/alertas", "/proveedores", "/catalogos",
            "/plataforma"),
           esencial=True),
]

POR_CLAVE: Dict[str, Modulo] = {m.clave: m for m in MODULOS}

# Los que toda empresa tiene desde el primer día, sin negociarlos.
ESENCIALES = tuple(m.clave for m in MODULOS if m.esencial)

# Lo que se activa por defecto al dar de alta una empresa. Se deja en lo mínimo
# a propósito: es más fácil habilitar lo que se vendió que descubrir tarde que
# un cliente lleva meses usando algo que nunca contrató.
POR_DEFECTO = ESENCIALES + ("control",)


def modulo_de_ruta(ruta: str) -> Optional[str]:
    """A qué módulo pertenece una ruta de la API, o None si a ninguno.

    Se compara sobre lo que sigue a `/api/v1`. El prefijo más largo gana, para
    que `/eam` no le robe una ruta a un módulo con un prefijo más específico.
    """
    resto = ruta.split("/api/v1", 1)[-1] if "/api/v1" in ruta else ruta
    mejor: Optional[str] = None
    largo = -1
    for m in MODULOS:
        for p in m.prefijos:
            if (resto == p or resto.startswith(p + "/") or resto.startswith(p + "?")) and len(p) > largo:
                mejor, largo = m.clave, len(p)
    return mejor
