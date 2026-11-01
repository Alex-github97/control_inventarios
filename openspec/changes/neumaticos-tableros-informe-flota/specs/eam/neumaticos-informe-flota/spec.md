# Spec Delta

## Purpose

Entregar al cliente de la flota un informe PDF con el estado de sus llantas según la última inspección: primero el resumen ejecutivo y después el esquema de cada vehículo con sus profundidades y sugerencias.

## ADDED Requirements

### Requirement: Alcance del informe
El informe SHALL tomar, para cada vehículo incluido, la última inspección de cada llanta montada dentro del periodo elegido. SHALL poder generarse para toda la flota, para una lista de vehículos o filtrado por tipo de vehículo, marca, referencia y dimensión. Una posición sin llanta o una llanta sin inspección en el periodo SHALL aparecer como tal, sin inventar datos.

#### Scenario: Llanta sin inspección en el periodo
- **WHEN** una llanta montada no tiene inspección en el periodo elegido
- **THEN** su posición aparece en el esquema y en la tabla como «sin inspección en el periodo» y no cuenta como inspeccionada en el resumen

### Requirement: Resumen ejecutivo
El informe SHALL comenzar con un resumen ejecutivo que muestre:
- vehículos y llantas inspeccionados frente a los del alcance;
- marcas, dimensiones y tipos de vehículo inspeccionados, con su cantidad;
- total de novedades y porcentaje por tipo de novedad;
- profundidad promedio;
- llantas bajo el mínimo;
- I.R. a piso de lo inspeccionado.

#### Scenario: Resumen de una jornada
- **WHEN** se generan 120 vehículos y 1.320 llantas inspeccionadas con 180 novedades
- **THEN** la primera página muestra esas cifras, el reparto por marca, dimensión y tipo de vehículo, y el porcentaje de cada tipo de novedad sobre las 180

### Requirement: Tipos de novedad
Una novedad SHALL ser una condición detectada en la última inspección de una llanta. Los tipos de esta versión son:
- profundidad bajo el mínimo configurado;
- profundidad cercana al mínimo, dentro del margen de alerta;
- presión fuera del rango;
- desalineación entre duales sobre el umbral configurado;
- desgaste irregular entre hombros;
- estado visual regular o crítico.

Una llanta SHALL poder tener varias novedades, y el resumen SHALL contar novedades y también llantas con al menos una.

#### Scenario: Llanta con dos novedades
- **WHEN** una llanta está bajo el mínimo y con la presión baja
- **THEN** suma una novedad de cada tipo y cuenta una sola vez en «llantas con novedad»

### Requirement: Esquema por vehículo con tabla por posición
Después del resumen, el informe SHALL dedicar a cada vehículo:
- el encabezado con placa, tipo, marca y línea, y la fecha de la última inspección;
- el esquema de ejes con cada llanta coloreada según su estado y su profundidad;
- al lado, una tabla por posición con código, marca, referencia, dimensión, vida, profundidades medidas (izquierda, centro y derecha), presión y novedades.

#### Scenario: Tractocamión de tres ejes
- **WHEN** el informe llega al vehículo TAB001 con 10 posiciones y un repuesto
- **THEN** su página muestra el esquema de 3 ejes con las 11 llantas y la tabla de 11 filas con sus tres profundidades y su presión

### Requirement: Sugerencias en el informe
Cada vehículo SHALL listar las sugerencias generadas por las reglas de `neumaticos-sugerencias` para sus llantas. El resumen SHALL incluir el total de sugerencias por tipo.

#### Scenario: Sugerencia de rotación
- **WHEN** una regla sugiere rotar las llantas de un eje por desgaste desigual
- **THEN** la página del vehículo muestra la sugerencia con las posiciones afectadas, y el resumen la cuenta en «rotación»

### Requirement: Generación sin bloquear
El informe SHALL generarse en el servidor y descargarse como PDF. Una flota grande MUST NOT bloquear el servidor mientras se arma; más allá de un umbral de vehículos, el informe SHALL prepararse en segundo plano y avisar cuando esté listo para descargar.

#### Scenario: Flota de 3.000 vehículos
- **WHEN** en la empresa `carga` se pide el informe de toda la flota
- **THEN** el sistema avisa que lo está preparando, los demás usuarios siguen trabajando sin demoras, y el PDF queda disponible para descargar al terminar

### Requirement: Marca de la empresa
El informe SHALL llevar el nombre y el logo de la empresa, el periodo, la fecha de generación y quién lo generó, con número de página en cada hoja.

#### Scenario: Pie de página
- **WHEN** se abre cualquier página del informe
- **THEN** se ve «Página N de M», la empresa y la fecha de generación
