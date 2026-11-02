# Spec Delta

## Purpose

Registrar cada ciclo de vulcanización con su receta, las llantas que llevó y las condiciones reales del ciclo, para que una desviación detenga todas las llantas afectadas.

## ADDED Requirements

### Requirement: Recetas de vulcanización
La planta SHALL mantener recetas validadas que fijan temperatura, presión, vacío y tiempo, con sus tolerancias, para una combinación de banda o compuesto, cojín y autoclave. El sistema MUST NOT traer temperaturas ni tiempos por defecto: cada receta la define la planta según el manual del fabricante.

#### Scenario: Banda sin receta
- **WHEN** se intenta cargar en el autoclave una carcasa cuya banda no tiene receta validada para ese autoclave
- **THEN** la carga se rechaza indicando que falta la receta para esa combinación

### Requirement: Ciclo con carga
Un ciclo SHALL registrar el autoclave, la receta, las carcasas cargadas y el operario. Todas las carcasas de un ciclo MUST compartir receta, y su número MUST NOT exceder la capacidad declarada del equipo.

#### Scenario: Mezclar recetas
- **WHEN** el operario escanea para el mismo ciclo una carcasa con receta A y otra con receta B
- **THEN** la segunda se rechaza indicando que el ciclo ya está armado con la receta A

#### Scenario: Capacidad excedida
- **WHEN** el autoclave tiene capacidad para 12 llantas y se escanea la decimotercera
- **THEN** la carga se rechaza

### Requirement: Encamisado verificado antes de cargar
Una carcasa MUST NOT cargarse en el autoclave sin el registro del encamisado con la prueba de vacío conforme.

#### Scenario: Fuga de vacío
- **WHEN** el encamisado de una carcasa registra que no conserva el vacío
- **THEN** la carcasa queda en encamisado hasta que se registre una nueva prueba conforme

### Requirement: Variables reales del ciclo
Un ciclo SHALL registrar temperatura, presión, vacío y tiempo reales: ingresados por el operario al cerrar el ciclo o recibidos del controlador del equipo si existe la conexión. El sistema SHALL compararlos contra la receta y marcar cada variable como conforme o desviada.

#### Scenario: Registro manual
- **WHEN** el operario cierra el ciclo con temperatura máxima, presión media, vacío mínimo y duración
- **THEN** el ciclo queda con cada variable comparada contra la tolerancia de la receta

### Requirement: Retención por desviación
Un ciclo con una o más variables desviadas SHALL retener automáticamente todas sus carcasas hasta que calidad las libere o las rechace.

#### Scenario: Tiempo corto
- **WHEN** un ciclo terminó 8 minutos antes de lo que fija su receta, fuera de la tolerancia
- **THEN** las 12 carcasas del ciclo quedan retenidas con el motivo «ciclo con desviación de tiempo»

### Requirement: Ocupación de equipos
El sistema SHALL mostrar el estado de cada autoclave (libre, en ciclo con su hora estimada de fin, en mantenimiento) y la utilización de cada uno en el periodo.

#### Scenario: Tablero de autoclaves
- **WHEN** el jefe de planta abre el tablero de vulcanización
- **THEN** ve cada autoclave con su ciclo en curso, cuántas llantas lleva y a qué hora termina
