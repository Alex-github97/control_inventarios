"""
El contenido de cada folleto de módulo.

Va en un archivo aparte del generador porque esto es texto comercial y aquello
es maquinaria: quien vaya a corregir una promesa o agregar una capacidad no
debería tener que leer HTML.

LAS CAPACIDADES SON REALES
Cada lista salió de las rutas que el módulo tiene de verdad en el servidor, no
de lo que sería bonito prometer. Si algo no está en el sistema, no está acá:
un folleto que promete de más se paga en la primera demostración.
"""

# (clave, título, cómo se cobra)
#
# Los módulos que no aparecen es porque no tienen nada detrás todavía —el
# locativo, por ejemplo, tiene cero rutas— y un folleto de algo que no existe
# es la peor página que se puede publicar.

MODULOS = [
    {
        "clave": "cmms",
        "orden": "01",
        "nombre": "CMMS · EAM",
        "titulo": "Mantenimiento",
        "promesa": "De la orden de trabajo a la causa raíz, con el costo por kilómetro de cada vehículo.",
        "cobro": "vehiculo",
        "problema": (
            "El taller sabe qué se arregló, pero nadie sabe cuánto cuesta mantener "
            "un camión ni cuál de la flota se come el presupuesto. La información "
            "está en una libreta, en un WhatsApp y en la cabeza del jefe de taller; "
            "cuando hay que decidir si se repara o se cambia, se decide de memoria."
        ),
        "capacidades": [
            ("Órdenes de trabajo", "Del reporte a la ejecución, con repuestos, mano de obra, contratistas y adjuntos. Cada orden cierra con su costo real."),
            ("Planes preventivos", "Por kilómetro, por horas o por calendario. El sistema avisa antes, no después."),
            ("Llantas, vida por vida", "Montaje, rotación, volteo, profundidades por surco, reencauche y baja. Con el costo por kilómetro de cada carcasa y la alerta de profundidad mínima."),
            ("Lubricación por rutas", "Puntos, aceites, frecuencias y la ruta del lubricador. Con análisis de aceite si se toma la muestra."),
            ("Combustible", "Tanqueos, rendimiento por vehículo y desviaciones contra el histórico del mismo equipo."),
            ("Inspecciones en campo", "Checklists que se llenan desde el celular y abren la orden de trabajo cuando encuentran algo."),
            ("Repuestos del taller", "Inventario, consumo por orden y costo cargado al activo que lo usó."),
            ("Confiabilidad", "Indicadores de disponibilidad y tiempo entre fallas, con análisis de causa raíz."),
            ("Documentos del vehículo", "SOAT, técnico-mecánica, tarjetas y licencias, con aviso antes del vencimiento."),
        ],
        "conecta": (
            "Cada consumo de repuesto y cada depreciación mensual generan su asiento "
            "contable sin que nadie los vuelva a digitar. El costo por kilómetro que "
            "muestra el módulo es el mismo que sale en el estado de resultados."
        ),
        "pantallas": [
            "El tablero de la flota, con lo que está detenido y lo que vence esta semana",
            "La ficha de un vehículo con sus llantas montadas por posición",
            "Una orden de trabajo con repuestos, mano de obra y su costo",
        ],
    },
    {
        "clave": "wms",
        "orden": "02",
        "nombre": "WMS",
        "titulo": "Almacenes",
        "promesa": "Recepción, ubicación, picking y despacho, con el inventario cuadrado al cierre.",
        "cobro": "bodega",
        "problema": (
            "El inventario del sistema y el de la bodega no coinciden, y nadie sabe "
            "en qué momento se separaron. Se hace un conteo cada seis meses, se ajusta "
            "la diferencia sin explicarla, y el ciclo vuelve a empezar."
        ),
        "capacidades": [
            ("Recepción contra la orden", "Lo que llega se compara con lo que se pidió; la diferencia queda registrada con su motivo."),
            ("Ubicación y zonas", "Tipos de zona y de ubicación, con reglas de dónde puede ir cada familia de producto."),
            ("Picking por tareas", "El picking se reparte en tareas, se asigna y se sigue. Se ve quién va en qué y cuánto falta."),
            ("Despachos y devoluciones", "Salida con su transportadora y su cliente; la devolución vuelve al inventario con su causa."),
            ("Conteos cíclicos", "Conteo por zona sin parar la bodega, con el ajuste explicado en vez de anónimo."),
            ("Lotes y trazabilidad", "De la recepción al despacho, para poder responder qué pasó con un lote específico."),
            ("Maestros propios", "Productos, familias, categorías, clientes, proveedores y transportadoras, todo en la misma base."),
        ],
        "conecta": (
            "La entrada y la salida de inventario generan su asiento solas, así que el "
            "saldo de la bodega y el de la contabilidad son el mismo número y no dos "
            "que hay que conciliar."
        ),
        "pantallas": [
            "El mapa de la bodega con la ocupación por zona",
            "Una tarea de picking en curso",
            "El conteo cíclico con sus diferencias",
        ],
    },
    {
        "clave": "tms",
        "orden": "03",
        "nombre": "TMS",
        "titulo": "Transporte",
        "promesa": "Del enturnamiento a la liquidación, con el cumplimiento de entrega medido.",
        "cobro": "vehiculo",
        "problema": (
            "El viaje se coordina por teléfono, el soporte de entrega llega en papel "
            "una semana después y la liquidación del conductor se arma en una hoja de "
            "cálculo. Cuando el cliente pregunta por qué llegó tarde, no hay con qué "
            "responder."
        ),
        "capacidades": [
            ("Viajes y rutas", "Planeación del viaje con sus paradas, su vehículo y su conductor."),
            ("Enturnamiento", "La fila de vehículos disponibles, con asignación y desasignación registrada."),
            ("Seguimiento por eventos", "Cada hito del viaje queda con su hora, y de ahí sale el cumplimiento."),
            ("Soporte de entrega", "La prueba de entrega se captura en el momento, con firma y foto."),
            ("Cumplimiento de entrega", "Indicador de entregas completas y a tiempo, por cliente y por ruta."),
            ("Liquidación", "Lo que se le paga al conductor y al vehículo, calculado sobre lo que de verdad se hizo."),
            ("Costos del viaje", "Combustible, peajes y demás, cargados al viaje y no a un total mensual."),
            ("Generadores de carga", "Los clientes que despachan, con sus documentos y sus condiciones."),
        ],
        "conecta": (
            "El servicio ejecutado y el pago al proveedor generan su asiento solos. "
            "El costo del viaje llega al estado de resultados por el centro de costo "
            "del vehículo, no por una imputación al final del mes."
        ),
        "pantallas": [
            "El tablero de viajes en curso",
            "La liquidación de un viaje con sus costos",
            "El indicador de cumplimiento por cliente",
        ],
    },
    {
        "clave": "estibas",
        "orden": "04",
        "nombre": "Control de Estibas",
        "titulo": "Estibas",
        "promesa": "Dónde está cada estiba, de quién es y cuánto lleva costando.",
        "cobro": "bodega",
        "problema": (
            "Las estibas se prestan, se pierden y se cobran mal. Nadie sabe cuántas "
            "hay en la calle ni con qué cliente, y la conversación de cobro se vuelve "
            "una discusión sin documentos."
        ),
        "capacidades": [
            ("Trazabilidad completa", "Cada movimiento de cada estiba, con su fecha, su cliente y quién lo hizo."),
            ("Manifiestos", "Entrega y devolución documentadas, con lo que salió y lo que volvió."),
            ("Daños", "Registro del daño con su nivel y su responsable, para poder cobrarlo."),
            ("Faltantes y recuperaciones", "La estiba que no volvió queda marcada; si aparece, se recupera con su historia."),
            ("Costos por cliente", "Cuánto lleva costando el préstamo de estibas de cada cliente."),
            ("Carga y descarga masiva", "Movimientos por archivo cuando son cientos, con el detalle de lo que falló."),
        ],
        "conecta": (
            "El costo de las estibas por cliente alimenta la facturación y la "
            "rentabilidad del servicio, en vez de quedarse como un gasto sin dueño."
        ),
        "pantallas": [
            "El inventario de estibas por ubicación y cliente",
            "Un manifiesto de entrega",
            "El histórico de una estiba puntual",
        ],
    },
    {
        "clave": "erp",
        "orden": "05",
        "nombre": "ERP",
        "titulo": "Financiero",
        "promesa": "La contabilidad se escribe sola desde la operación. Diez hechos generan su asiento sin digitar.",
        "cobro": "plano",
        "problema": (
            "La operación pasa en un sistema y la contabilidad en otro, así que alguien "
            "se dedica a copiar de uno al otro. Las cifras nunca coinciden del todo, y "
            "el cierre de mes se convierte en una semana de conciliaciones."
        ),
        "capacidades": [
            ("Contabilidad de doble partida", "Plan de cuentas colombiano, comprobantes que cuadran o no se guardan, y períodos que se cierran."),
            ("Diez hechos automáticos", "Factura de venta y su nota crédito, factura de compra, recaudo, pago, entrada y salida de inventario, nómina, depreciación y servicio ejecutado."),
            ("Reglas contables editables", "Qué cuenta cumple cada papel se configura en pantalla. Cambiar la cuenta de cartera no es un despliegue."),
            ("Impuestos con vigencia", "IVA, retefuente, ReteICA y ReteIVA por la fecha del documento, no por la de hoy. Cuando el cero es cero, dice por qué."),
            ("Cartera y tesorería", "Facturación, recaudo, cartera por edades, bancos y conciliación con propuestas de emparejamiento."),
            ("Libros y estados", "Balance de comprobación, libro mayor, libro diario, situación financiera y resultados, todos desde el mismo movimiento."),
            ("Compras", "Requisiciones y órdenes de compra con su aprobación."),
            ("Activos fijos", "Depreciación por línea recta, saldo decreciente o suma de dígitos, con su cronograma."),
            ("Auditoría", "Quién hizo qué, cuándo y por qué. Un comprobante no se borra: se anula con su contrario."),
        ],
        "conecta": (
            "Es el módulo al que llegan todos los demás. Lo que se hace en el taller, "
            "en la bodega o en la nómina termina acá sin que nadie lo transcriba."
        ),
        "pantallas": [
            "El balance de comprobación con el aviso de si cuadra",
            "Las reglas contables: qué cuenta cumple cada papel",
            "El simulador de impuestos, que dice por qué no se retuvo",
        ],
    },
    {
        "clave": "gh",
        "orden": "06",
        "nombre": "Gestión Humana",
        "titulo": "Personas",
        "promesa": "Del reclutamiento a la nómina liquidada, que se contabiliza sola.",
        "cobro": "empleado",
        "problema": (
            "La nómina se liquida en un sistema, se paga en otro y se contabiliza a "
            "mano en un tercero. Las incapacidades y las vacaciones viven en correos, "
            "y cuando alguien pide su certificado hay que buscarlo."
        ),
        "capacidades": [
            ("Nómina liquidada", "Con sus deducciones, prestaciones y parafiscales. El asiento contable sale solo."),
            ("Contratos", "Vigencias, renovaciones y terminaciones, con aviso antes de que venzan."),
            ("Vacaciones e incapacidades", "Solicitadas, aprobadas y descontadas, sin correos de por medio."),
            ("Reclutamiento", "Vacantes, candidatos y el proceso hasta la contratación."),
            ("Evaluación de desempeño", "Períodos, competencias y resultados por colaborador."),
            ("Conductores", "La ficha del conductor con sus licencias y su historia, compartida con transporte."),
        ],
        "conecta": (
            "La liquidación de nómina es uno de los diez hechos que generan su asiento "
            "contable solos, con salud, pensión, retención y prestaciones en sus cuentas."
        ),
        "pantallas": [
            "La liquidación de un período de nómina",
            "La ficha de un colaborador con su historia",
            "El tablero de vencimientos de contrato",
        ],
    },
    {
        "clave": "sst",
        "orden": "07",
        "nombre": "SST",
        "titulo": "Seguridad y Salud",
        "promesa": "El sistema de gestión con sus evidencias, listo para cuando llegue la visita.",
        "cobro": "empleado",
        "problema": (
            "El SG-SST existe en una carpeta que se arma la semana antes de la "
            "auditoría. Los incidentes se reportan en papel, las inspecciones se "
            "firman después, y demostrar que el sistema funciona es un ejercicio de "
            "arqueología."
        ),
        "capacidades": [
            ("Matriz de riesgos", "Identificación, valoración y controles, viva en vez de anual."),
            ("Incidentes y accidentes", "Reporte, investigación y acciones, con la trazabilidad de cada uno."),
            ("Inspecciones", "Planeadas y ejecutadas, con hallazgos que se cierran."),
            ("Elementos de protección", "Entregas por persona, con su firma y su reposición."),
            ("Capacitaciones", "Quién recibió cuál, cuándo y con qué resultado."),
            ("Documentos del sistema", "Políticas, procedimientos y evidencias, en un solo lugar y con versión."),
        ],
        "conecta": (
            "Comparte las personas con Gestión Humana y las capacitaciones con "
            "Formación, así que un colaborador no se registra tres veces."
        ),
        "pantallas": [
            "La matriz de riesgos por proceso",
            "El reporte de un incidente y su investigación",
            "El control de entrega de elementos de protección",
        ],
    },
    {
        "clave": "lms",
        "orden": "08",
        "nombre": "LMS",
        "titulo": "Formación",
        "promesa": "Cursos, certificados y competencias, con el vencimiento avisado antes.",
        "cobro": "empleado",
        "problema": (
            "La formación se dicta y se olvida. Nadie sabe qué certificado tiene "
            "vencido cuál conductor hasta que un cliente lo pide, y el reentrenamiento "
            "se programa cuando ya es tarde."
        ),
        "capacidades": [
            ("Cursos y programas", "Rutas de aprendizaje por cargo, con sus requisitos previos."),
            ("Inscripciones", "Quién está en qué, con su avance y su calificación."),
            ("Evaluaciones", "Banco de preguntas, intentos y nota mínima para aprobar."),
            ("Certificados", "Emitidos con su vigencia; el vencimiento avisa antes de llegar."),
            ("Matriz de competencias", "Qué sabe cada persona contra lo que su cargo exige, y dónde está el hueco."),
            ("Inducción", "El proceso de entrada del nuevo, con lo que tiene que ver antes de operar."),
        ],
        "conecta": (
            "Las competencias exigidas por Calidad y las capacitaciones de Seguridad y "
            "Salud se dictan y se certifican acá, sin llevar tres listas paralelas."
        ),
        "pantallas": [
            "La matriz de competencias por cargo",
            "Un curso con su avance por participante",
            "El tablero de certificados por vencer",
        ],
    },
    {
        "clave": "qms",
        "orden": "09",
        "nombre": "QMS",
        "titulo": "Calidad",
        "promesa": "No conformidades, acciones y auditorías que se cierran, no que se archivan.",
        "cobro": "plano",
        "problema": (
            "El sistema de calidad vive en documentos de Word y en un plan de acciones "
            "que nadie revisa entre auditorías. Las no conformidades se levantan y se "
            "cierran sin que nada cambie, porque no hay quién siga la acción."
        ),
        "capacidades": [
            ("Procesos y procedimientos", "El mapa de procesos con sus documentos versionados."),
            ("No conformidades", "Con su fuente, su análisis y su acción; se cierran cuando la acción se hizo."),
            ("Acciones correctivas", "Tareas con responsable y fecha, no una casilla de texto."),
            ("Auditorías", "Programa, ejecución y hallazgos, con el seguimiento hasta el cierre."),
            ("Indicadores y metas", "Medición contra meta, por proceso y por período."),
            ("Quejas y encuestas", "La voz del cliente entra como fuente de mejora, no como un correo suelto."),
            ("Evaluación de proveedores", "Criterios, calificación y consecuencia."),
        ],
        "conecta": (
            "Los hallazgos pueden abrir órdenes de trabajo en mantenimiento y las "
            "competencias requeridas se dictan en Formación."
        ),
        "pantallas": [
            "El mapa de procesos con sus indicadores",
            "Una no conformidad con su análisis y su acción",
            "El programa de auditorías del año",
        ],
    },
    {
        "clave": "grc",
        "orden": "10",
        "nombre": "GRC",
        "titulo": "Riesgo y Cumplimiento",
        "promesa": "Obligaciones, controles y evidencias, con la prueba de que se cumplieron.",
        "cobro": "plano",
        "problema": (
            "Las obligaciones legales están repartidas entre el jurídico, el contador "
            "y la gerencia. Cuando llega una revisión, demostrar que el control existe "
            "y que se ejecutó cuesta más que ejecutarlo."
        ),
        "capacidades": [
            ("Matriz de riesgos", "Riesgo, control y tratamiento, con su responsable."),
            ("Obligaciones", "Qué hay que cumplir, cada cuánto y quién responde."),
            ("Controles y evidencias", "Cada ejecución del control deja su prueba adjunta."),
            ("Políticas", "Publicadas, versionadas y con constancia de quién las leyó."),
            ("Incidentes", "Registro, tratamiento y lecciones."),
            ("Continuidad del negocio", "Planes y simulacros, con el resultado de cada uno."),
            ("Comités", "Convocatoria, acta y compromisos con seguimiento."),
        ],
        "conecta": (
            "Comparte el maestro de terceros con el financiero, así que la debida "
            "diligencia de un proveedor y su cuenta por pagar hablan del mismo tercero."
        ),
        "pantallas": [
            "La matriz de riesgos con sus controles",
            "El calendario de obligaciones",
            "Un control con sus evidencias de ejecución",
        ],
    },
    {
        "clave": "dms",
        "orden": "11",
        "nombre": "DMS",
        "titulo": "Gestión Documental",
        "promesa": "Expedientes con versión, flujo de aprobación y tabla de retención.",
        "cobro": "plano",
        "problema": (
            "Los documentos viven en carpetas compartidas donde hay tres versiones del "
            "mismo archivo y nadie sabe cuál rige. Las aprobaciones se dan por correo y "
            "la retención documental es un documento que nadie aplica."
        ),
        "capacidades": [
            ("Expedientes y carpetas", "Estructura propia por tipo de documento, no una carpeta plana."),
            ("Versiones", "Cada cambio deja versión; la vigente se sabe siempre cuál es."),
            ("Flujos de aprobación", "Quién revisa, quién aprueba y en qué orden, con su constancia."),
            ("Firmas", "El documento firmado queda atado a quién lo firmó y cuándo."),
            ("Metadatos configurables", "Campos propios por tipo de documento, para poder buscarlo después."),
            ("Tabla de retención", "Cuánto se guarda cada cosa y qué pasa al vencer."),
            ("Auditoría de acceso", "Quién abrió qué documento y cuándo."),
        ],
        "conecta": (
            "Los documentos del vehículo, del colaborador y del proveedor se guardan "
            "acá y se ven desde su ficha, sin duplicar el archivo."
        ),
        "pantallas": [
            "Un expediente con sus versiones",
            "Un flujo de aprobación en curso",
            "La tabla de retención documental",
        ],
    },
    {
        "clave": "crm",
        "orden": "12",
        "nombre": "CRM",
        "titulo": "Comercial",
        "promesa": "Del prospecto a la cotización, con el histórico de cada cliente a la mano.",
        "cobro": "plano",
        "problema": (
            "El pipeline vive en la cabeza del comercial y en su celular. Cuando se va, "
            "se lleva la relación; y mientras está, nadie más sabe qué se le prometió a "
            "cada cliente."
        ),
        "capacidades": [
            ("Prospectos y oportunidades", "El embudo con su etapa, su valor y su probabilidad."),
            ("Cotizaciones", "Armadas sobre el tarifario, no sobre una plantilla suelta."),
            ("Interacciones", "Cada llamada, visita y correo queda en la ficha del cliente."),
            ("Contratos", "Lo pactado, con sus vigencias y sus condiciones."),
            ("Tickets", "Lo que el cliente reclama, con su respuesta y su tiempo."),
            ("Indicadores comerciales", "Por ejecutivo, por cliente y por período."),
        ],
        "conecta": (
            "El cliente del CRM es el mismo tercero del financiero: la cotización que "
            "se gana se vuelve factura sin volver a escribir el NIT."
        ),
        "pantallas": [
            "El embudo comercial por etapa",
            "La ficha de un cliente con su histórico",
            "Una cotización armada sobre el tarifario",
        ],
    },
    {
        "clave": "tarifax",
        "orden": "13",
        "nombre": "TarifaX",
        "titulo": "Motor de Tarifas",
        "promesa": "La tarifa de un flete calculada en segundos, con la distancia real de la ruta.",
        "cobro": "plano",
        "problema": (
            "Cotizar un flete toma media hora y depende de quién lo haga. Dos personas "
            "cotizan distinto el mismo viaje, y nadie puede explicarle al cliente de "
            "dónde salió el número."
        ),
        "capacidades": [
            ("Cotización inmediata", "Origen, destino y tipo de vehículo; sale la tarifa con su desglose."),
            ("Distancias reales", "La ruta se calcula, no se estima con una tabla vieja."),
            ("Tarifas SICETAC", "Los tipos de vehículo y las referencias del sistema oficial."),
            ("Cotización masiva", "Un archivo con cientos de rutas devuelve todas sus tarifas."),
            ("Configuración propia", "Los factores y recargos de la empresa, no los de una plantilla."),
            ("Mapeo de vehículos", "La flota propia contra los tipos oficiales, hecho una vez."),
        ],
        "conecta": (
            "La tarifa calculada alimenta la cotización comercial y el viaje de "
            "transporte, así que lo cotizado y lo facturado son el mismo número."
        ),
        "pantallas": [
            "Una cotización con su desglose",
            "La ruta calculada sobre el mapa",
            "La cotización masiva por archivo",
        ],
    },
    {
        "clave": "scm",
        "orden": "14",
        "nombre": "SCM",
        "titulo": "Proveedores",
        "promesa": "Solicitudes, órdenes y evaluación de proveedores, con criterio y no con memoria.",
        "cobro": "plano",
        "problema": (
            "Se le compra siempre al mismo porque es el que contesta, no porque sea el "
            "que cumple. La evaluación de proveedores es un formato que se llena una "
            "vez al año para la auditoría."
        ),
        "capacidades": [
            ("Solicitudes de compra", "Del área que necesita, con su justificación y su aprobación."),
            ("Órdenes de compra", "Lo pedido, a quién, en qué condiciones y para cuándo."),
            ("Maestro de proveedores", "Con sus documentos, sus condiciones y su historia."),
            ("Evaluación", "Criterios definidos, calificación periódica y consecuencia visible."),
        ],
        "conecta": (
            "La orden de compra llega a cuentas por pagar y la factura del proveedor "
            "genera su asiento con su retención calculada según el tercero."
        ),
        "pantallas": [
            "El tablero de solicitudes por aprobar",
            "Una orden de compra con su seguimiento",
            "La evaluación de un proveedor",
        ],
    },
    {
        "clave": "mes",
        "orden": "15",
        "nombre": "MES",
        "titulo": "Producción",
        "promesa": "La planta en línea: órdenes, consumos, paradas y eficiencia real del equipo.",
        "cobro": "plano",
        "problema": (
            "Se sabe cuánto se produjo pero no cuánto se pudo haber producido. Las "
            "paradas se cuentan a ojo, el consumo de material se ajusta al final del "
            "mes y el desperdicio aparece como una diferencia de inventario."
        ),
        "capacidades": [
            ("Órdenes de producción", "Del plan a la ejecución, con su avance en tiempo real."),
            ("Líneas y celdas", "El flujo de la planta como un esquema, con sus operaciones en orden."),
            ("Fórmulas y recetas", "Lo que lleva cada producto, para saber qué debió consumirse."),
            ("Consumos y desperdicio", "Lo que de verdad se usó contra lo que debía usarse."),
            ("Paradas", "Con su causa y su duración, que es de donde sale la eficiencia."),
            ("Eficiencia del equipo", "Disponibilidad, rendimiento y calidad, calculados y no estimados."),
            ("Trazabilidad por lote", "Del producto terminado hacia atrás, hasta la materia prima."),
        ],
        "conecta": (
            "El consumo de materia prima y la entrada de producto terminado mueven el "
            "inventario, y el inventario genera su asiento contable."
        ),
        "pantallas": [
            "El esquema de la línea con su estado",
            "Una orden de producción en curso",
            "El indicador de eficiencia con sus paradas",
        ],
    },
    {
        "clave": "aps",
        "orden": "16",
        "nombre": "APS",
        "titulo": "Planeación",
        "promesa": "Pronóstico, capacidad y plan de abastecimiento, con escenarios que se comparan.",
        "cobro": "plano",
        "problema": (
            "Se compra por corazonada y se produce contra el pedido del día. El "
            "inventario sobra donde no se necesita y falta donde sí, y el plan de "
            "ventas y operaciones es una reunión sin números."
        ),
        "capacidades": [
            ("Pronósticos", "Sobre la historia real de la demanda, no sobre una meta."),
            ("Capacidad contra carga", "Qué se puede hacer contra qué hay que hacer, y dónde no da."),
            ("Plan de materiales", "Qué comprar y cuándo, calculado desde la demanda."),
            ("Inventario óptimo", "Cuánto conviene tener de cada cosa, con su nivel de servicio."),
            ("Escenarios", "Varias hipótesis comparadas lado a lado antes de decidir."),
            ("Consenso de ventas y operaciones", "El plan acordado queda registrado, con quién lo acordó."),
        ],
        "conecta": (
            "Toma la demanda del comercial y la capacidad de producción, y devuelve "
            "las órdenes sugeridas que compras convierte en órdenes reales."
        ),
        "pantallas": [
            "El pronóstico contra la demanda real",
            "Carga contra capacidad por recurso",
            "Dos escenarios comparados",
        ],
    },
    {
        "clave": "ags",
        "orden": "17",
        "nombre": "AGS",
        "titulo": "Agenda de Servicios",
        "promesa": "Citas, profesionales y cobro, para el negocio que trabaja con agenda.",
        "cobro": "plano",
        "problema": (
            "La agenda es un cuaderno o un chat. Se cruzan citas, no se sabe cuánto "
            "produce cada profesional, y la comisión se calcula a mano al final de la "
            "quincena."
        ),
        "capacidades": [
            ("Agenda por profesional", "Con sus horarios, sus ausencias y sus servicios."),
            ("Citas", "Reservadas, confirmadas, atendidas o perdidas, cada una con su estado."),
            ("Catálogo de servicios", "Con su duración y su precio, congelado al momento de la cita."),
            ("Cobro", "Completar el servicio exige cobrarlo, así que la caja cuadra."),
            ("Autoagendamiento", "El cliente final reserva por su cuenta, sin llamar."),
            ("Reportes", "Producción por profesional y por servicio, con su comisión."),
        ],
        "conecta": (
            "El servicio cobrado entra a la facturación y genera su asiento, con la "
            "comisión del profesional calculada sobre la mano de obra."
        ),
        "pantallas": [
            "La agenda del día por profesional",
            "El cobro de una cita atendida",
            "La producción por profesional del mes",
        ],
    },
]

# Cómo se cobra cada uno, para el bloque de precio del folleto.
COBROS = {
    "vehiculo": {
        "titulo": "Se cobra por vehículo",
        "valor": "$14.900",
        "detalle": "al mes por vehículo con movimiento, con todo lo del camión adentro: "
                   "mantenimiento, llantas, transporte, lubricación, combustible, "
                   "inspecciones, repuestos, confiabilidad y documentos.",
    },
    "empleado": {
        "titulo": "Se cobra por empleado",
        "valor": "$3.900",
        "detalle": "al mes por empleado en nómina —no por usuario del sistema—, con "
                   "nómina, seguridad y salud, y formación incluidas.",
    },
    "bodega": {
        "titulo": "Se cobra por bodega",
        "valor": "$199.000",
        "detalle": "al mes por sede o centro de distribución, con posiciones y "
                   "movimientos sin límite, y control de estibas incluido.",
    },
    "plano": {
        "titulo": "Va dentro del plan",
        "valor": "Sin costo por unidad",
        "detalle": "no se mide: entra en el plan contratado. En Operación se elige "
                   "entre los módulos incluidos; en Plataforma vienen todos.",
    },
}
