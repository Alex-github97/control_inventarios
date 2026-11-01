# Spec Delta

## Purpose

Que el tablero general de llantas compare el rendimiento y el estado del parque por marca, por referencia y por dimensión a la vez, e incluya el índice de reencauche de las llantas montadas.

## ADDED Requirements

### Requirement: Indicadores por marca, referencia y dimensión
El tablero general SHALL mostrar los mismos indicadores (CPK, km por vida, km por mm, cantidad de llantas y vidas) en tres comparaciones visibles a la vez: por marca, por referencia y por dimensión. No SHALL hacer falta cambiar un selector para pasar de una a otra.

#### Scenario: Abrir el tablero
- **WHEN** el usuario abre el tablero general
- **THEN** ve el CPK por marca, por referencia y por dimensión al mismo tiempo, cada uno con sus llantas y vidas

#### Scenario: Referencias con el mismo nombre en dos marcas
- **WHEN** dos marcas tienen una referencia llamada igual
- **THEN** la comparación por referencia las muestra separadas, rotuladas como «Marca · Referencia»

### Requirement: I.R. a piso
El tablero SHALL mostrar el índice de reencauche de las llantas montadas en vehículos (a piso): el promedio de reencauches de la vida actual de cada llanta montada (nueva = 0, primer reencauche = 1…). SHALL mostrarse en total y por marca, por referencia y por dimensión, con la distribución por número de reencauches.

#### Scenario: Flota con llantas reencauchadas
- **WHEN** hay 1.000 llantas montadas: 500 nuevas, 300 con un reencauche y 200 con dos
- **THEN** el I.R. a piso es 0,7 y la distribución muestra 500, 300 y 200

#### Scenario: Llantas en bodega no cuentan
- **WHEN** una llanta reencauchada está en bodega y no montada
- **THEN** no entra en el I.R. a piso

### Requirement: Parque montado por categoría
El tablero SHALL mostrar cuántas llantas hay montadas por marca, por referencia y por dimensión, con su profundidad promedio de la última inspección y cuántas están bajo la profundidad mínima configurada.

#### Scenario: Dimensión con llantas bajo el mínimo
- **WHEN** de 400 llantas 295/80 R22.5 montadas, 35 tienen la última profundidad bajo el mínimo
- **THEN** la fila de esa dimensión muestra 400 llantas, su profundidad promedio y 35 bajo el mínimo

### Requirement: Los filtros aplican a todo el tablero
Los filtros del tablero (periodo y los de `neumaticos-filtros-fabricacion`) SHALL aplicarse a todos sus indicadores, comparaciones e I.R. a la vez.

#### Scenario: Filtrar por dimensión
- **WHEN** se filtra por la dimensión 11R22.5
- **THEN** el CPK por marca, el de por referencia y el I.R. a piso se recalculan solo con llantas 11R22.5
