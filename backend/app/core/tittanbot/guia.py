"""
La guía de uso que TittanBot consulta para las preguntas de soporte.

Una entrada por tarea frecuente, con dónde está y los pasos. Se busca por
palabras y se devuelven las tres que más coinciden: así el modelo responde con
la ruta real del menú y no con pasos inventados. Para agregar una, basta con
sumarla a GUIA.
"""
import unicodedata
from typing import List, Tuple

GUIA: List[Tuple[str, str]] = [
    ("navegar menu buscar pantalla favoritos atajos",
     "El menú está a la izquierda: la franja oscura tiene los módulos y el panel claro las pantallas del "
     "módulo activo. Ctrl+K busca cualquier pantalla de cualquier módulo; Ctrl+B oculta o muestra el menú; "
     "la estrella al pasar el puntero sobre una pantalla la deja en Favoritos, arriba del menú."),
    ("crear orden de trabajo ot correctiva preventiva",
     "CMMS › Mantenimiento › Órdenes de Trabajo › botón «Nueva OT». Elija el activo, el tipo (correctiva, "
     "preventiva…), la prioridad y describa el trabajo; el número lo asigna el sistema. También puede "
     "pedírmelo a mí y la creo con su confirmación."),
    ("cerrar completar orden kanban estado iniciar",
     "En Órdenes de Trabajo, arrastre la tarjeta en el tablero Kanban a la columna del estado (En proceso, "
     "Completada) o abra la OT y cambie el estado. Al completar, registre las horas reales y los repuestos: "
     "de ahí salen el MTTR y el costo."),
    ("planes mantenimiento preventivo rutina programar",
     "CMMS › Mantenimiento › Planes de Mant.: defina la rutina por kilómetros, horas o días y asígnela a los "
     "activos. Las OT preventivas se generan cuando el equipo llega al intervalo."),
    ("checklist inspeccion preoperacional",
     "CMMS › Mantenimiento › Checklists: plantillas por tipo de equipo; una respuesta mala puede generar una OT "
     "automáticamente. Los técnicos también los llenan desde la app móvil."),
    ("registrar muestra aceite laboratorio boletin lubricacion",
     "CMMS › Lubricación › Lubricación › botón «Registrar muestra» (o el ícono del frasco en la fila del "
     "compartimento). Puede cargar el boletín del laboratorio en PDF o foto y los parámetros se llenan solos; "
     "la lectura del equipo viene propuesta. Para muchas muestras use «Plantilla» y «Cargar» (Excel)."),
    ("cambio de aceite carga drenaje relleno lubricacion",
     "CMMS › Lubricación › Lubricación, en la fila del compartimento: la gota oscura registra el cambio de "
     "aceite (pide el motivo del drenaje) y la gota clara un relleno (aceite agregado sin cambiar la carga)."),
    ("interpretacion informe aceite pdf cliente asesor firma",
     "CMMS › Lubricación › Interpretación de muestras: pestañas de cobertura, tablero, conclusiones, por "
     "placa, correlación y criterios. El botón «Informe para el cliente» genera el PDF de flota firmado; el de "
     "una muestra sale del detalle de la muestra con «Informe PDF». Los datos del asesor y su firma se "
     "configuran en Configuración › Lubricación › Asesor e informes."),
    ("llantas neumaticos montaje rotacion inspeccion profundidad reencauche",
     "CMMS › Neumáticos: montaje y desmontaje por posición, rotaciones, inspecciones de profundidad y presión, "
     "reencauche por lotes y descarte. El odómetro no puede retroceder y la profundidad no puede subir (salvo "
     "reencauche o reesculturado). Los informes de CPK y rendimiento están en Informes de neumáticos."),
    ("combustible tanqueo rendimiento",
     "CMMS › Combustible: registre tanqueos con la lectura del odómetro; el sistema calcula el rendimiento y "
     "avisa consumos anómalos."),
    ("inventario repuestos garantias",
     "CMMS › Inventario: existencias de repuestos y su kárdex; los repuestos usados en una OT descuentan del "
     "inventario. Garantías: reclamaciones a proveedores con sus documentos."),
    ("tablero indicadores filtrar grafico power bi",
     "CMMS › General › Torre de Control: clic en una barra filtra todo el tablero, Ctrl+clic suma valores, "
     "arrastrar elige un tramo y Esc limpia los filtros. Al pasar el puntero, cada cifra explica cómo se "
     "calcula."),
    ("usuarios perfiles permisos acceso",
     "Configuración › Usuarios y perfiles (solo con el permiso «Usuarios y perfiles»). Cada perfil marca a qué "
     "módulos entra la persona; el permiso «TittanBot» habilita este asistente."),
    ("app movil android descargar apk tecnico",
     "El botón del teléfono, arriba a la derecha, descarga la app Android para técnicos (desde el teléfono "
     "descarga el APK directamente). Los técnicos ven sus órdenes asignadas."),
    ("soporte ticket error problema ayuda",
     "Soporte técnico: el ícono del auricular arriba a la derecha abre la mesa de ayuda con sus tickets. "
     "También puedo abrir el ticket por usted con lo que me cuente."),
]


def _norma(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


def buscar(tema: str) -> List[str]:
    palabras = {w for w in _norma(tema).split() if len(w) > 2}
    puntuadas = sorted(((sum(1 for w in palabras if w in _norma(c)), t) for c, t in GUIA), reverse=True)
    mejores = [t for p, t in puntuadas if p > 0][:3]
    return mejores or ["No hay una entrada de la guía para eso. Si es un error, ofrezca abrir un ticket."]
