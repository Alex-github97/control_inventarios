# Spec Delta

## Purpose

Explicar la pila de descarte: por qué se dan de baja las llantas, de qué marca y referencia son las que más se dañan y cuántas vidas alcanzaron antes de botarse.

## ADDED Requirements

### Requirement: Descarte por motivo de daño
El tablero de descarte SHALL mostrar, para las llantas dadas de baja en el periodo y los filtros elegidos, la cantidad y el porcentaje por motivo de daño, tomados del catálogo de daños que se configura en Configuración de llantas. Las bajas sin daño registrado SHALL agruparse como «Sin motivo registrado» y nunca omitirse.

#### Scenario: Reparto por motivo
- **WHEN** en el trimestre hubo 1.000 bajas, 420 con daño «Corte en costado», 300 con «Desgaste normal» y 280 sin daño registrado
- **THEN** el tablero muestra 42 %, 30 % y 28 % «Sin motivo registrado», y los tres suman 1.000

#### Scenario: Motivo nuevo en configuración
- **WHEN** el administrador agrega el daño «Separación de banda» en Configuración y se registra una baja con ese daño
- **THEN** el tablero muestra el nuevo motivo sin cambios de programación

### Requirement: Descarte por motivo de fin de vida
El tablero SHALL mostrar también la cantidad por motivo de fin de vida, el otro catálogo configurable de la baja, separado del motivo de daño.

#### Scenario: Dos catálogos
- **WHEN** una baja tiene daño «Corte en costado» y motivo de fin de vida «Daño irreparable»
- **THEN** cuenta en el reparto por daño y en el reparto por fin de vida, cada uno en su gráfico

### Requirement: Daños por marca y por referencia
El tablero SHALL mostrar el recuento de bajas por marca y por referencia, cruzado con el motivo de daño, de manera que se vea qué daños concentra cada marca y cada referencia.

#### Scenario: Marca con más cortes
- **WHEN** se mira el cruce de marca por motivo
- **THEN** se ve, por ejemplo, que la marca A tiene 180 bajas por «Corte en costado» y la marca B, 40, con el total de bajas de cada una

#### Scenario: Referencia de una marca
- **WHEN** se filtra el tablero por la marca A
- **THEN** el recuento por referencia muestra solo las referencias de la marca A con sus daños

### Requirement: I.R. de la pila de descarte
El tablero SHALL mostrar el índice de reencauche (I.R.) de las llantas descartadas: el promedio de reencauches que tenía cada llanta al darse de baja (nueva = 0, primer reencauche = 1, segundo = 2…). SHALL mostrarse en total y por marca y por referencia, junto con cuántas llantas hay en cada número de reencauches.

#### Scenario: Cálculo del I.R.
- **WHEN** se descartaron 10 llantas: 4 nuevas, 3 con un reencauche, 2 con dos y 1 con tres
- **THEN** el I.R. es (0·4 + 1·3 + 2·2 + 3·1) ÷ 10 = 1,0 y la distribución muestra 4, 3, 2 y 1

### Requirement: Evolución del descarte
El tablero SHALL mostrar las bajas por mes en el periodo, con la posibilidad de separar la serie por motivo de daño.

#### Scenario: Tendencia mensual
- **WHEN** se elige el último año
- **THEN** se ven 12 meses con la cantidad de bajas de cada uno, y al elegir un motivo se ve solo su serie

### Requirement: Del tablero a la lista
Al pulsar un motivo, una marca o una referencia del tablero, SHALL abrirse la lista paginada de la pila de descarte filtrada por esa categoría, con los mismos filtros del tablero.

#### Scenario: Ver las llantas de un motivo
- **WHEN** se pulsa «Corte en costado» en el tablero
- **THEN** se abre la lista de descarte con solo las bajas por ese motivo y el total coincide con el del tablero
