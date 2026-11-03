# Spec Delta

## Purpose

Completar en la app el resto de módulos del CMMS —lubricación, inventario de repuestos, garantías, planes, confiabilidad, IA e informes— y avisar al usuario con notificaciones aunque no tenga la app abierta.

## ADDED Requirements

### Requirement: Lubricación
El usuario SHALL poder registrar la toma de una muestra de aceite (activo, compartimento, horas o km del aceite, etiqueta escaneada), seguir sus rutas de lubricación marcando cada punto atendido y consultar el diagnóstico de los análisis con su semáforo e interpretación.

#### Scenario: Toma de muestra en ruta
- **WHEN** el técnico toma una muestra del motor de un camión y escanea la etiqueta del frasco
- **THEN** la muestra queda registrada con el activo, el compartimento y la etiqueta, lista para enviar al laboratorio

### Requirement: Inventario de repuestos
El usuario SHALL poder consultar las existencias de un repuesto por bodega (por búsqueda o código de barras), registrar salidas a una orden de trabajo y ejecutar los conteos que se le asignen, con las reglas del portal.

#### Scenario: Conteo cíclico
- **WHEN** el bodeguero cuenta un repuesto y registra 14 unidades donde el sistema esperaba 15
- **THEN** el conteo queda con la diferencia para su aprobación, igual que en el portal

### Requirement: Garantías y planes
El usuario SHALL poder consultar las garantías vigentes de un activo o componente y abrir un reclamo con fotos; y consultar los planes de mantenimiento de un activo con su próxima ejecución por fecha o medidor.

#### Scenario: Próximo preventivo
- **WHEN** el técnico consulta los planes de un camión
- **THEN** ve cada plan con cuántos kilómetros o días faltan para su próxima ejecución

### Requirement: Confiabilidad, IA e informes en consulta
La app SHALL mostrar en modo consulta los indicadores de confiabilidad (MTBF, MTTR, disponibilidad por activo), las predicciones de la IA y los informes del CMMS, con los mismos valores del portal y gráficos adaptados a pantalla pequeña. Los informes en PDF SHALL poder abrirse y compartirse desde el teléfono.

#### Scenario: Compartir un informe
- **WHEN** el supervisor genera el informe de estado de llantas de la flota en la app
- **THEN** obtiene el mismo PDF del portal y lo puede compartir por correo o mensajería

### Requirement: Notificaciones push
La app SHALL recibir notificaciones push de los eventos que correspondan al usuario: orden asignada, aprobación pendiente, alerta crítica, registro rechazado en la sincronización. Tocar la notificación SHALL abrir el elemento. El usuario SHALL poder elegir qué notificaciones recibe.

#### Scenario: Orden asignada
- **WHEN** el supervisor asigna una orden urgente a un técnico
- **THEN** el teléfono del técnico recibe la notificación y, al tocarla, abre la orden
