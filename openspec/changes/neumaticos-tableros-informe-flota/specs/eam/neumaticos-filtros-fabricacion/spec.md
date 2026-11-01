# Spec Delta

## Purpose

Filtrar los tableros de llantas por las categorías que importan, incluida la fecha de fabricación que trae el DOT, de la misma manera en el tablero general y en la pila de descarte.

## ADDED Requirements

### Requirement: Año y semana de fabricación desde el DOT
El sistema SHALL obtener la semana y el año de fabricación de los últimos cuatro dígitos del DOT (formato SSAA: semana de 01 a 53 y año de dos dígitos, desde el 2000). Un DOT ausente, con menos de cuatro dígitos finales, con una semana fuera de rango o con una fecha posterior a la del registro de la llanta SHALL quedar como «Sin DOT válido».

#### Scenario: DOT válido
- **WHEN** se registra una llanta con DOT «DOT 4B7X ABC 2321»
- **THEN** queda con semana 23 y año 2021

#### Scenario: DOT inválido
- **WHEN** se registra una llanta con DOT «DOT 4B7X 6721»
- **THEN** la llanta se guarda y queda como «Sin DOT válido», porque la semana 67 no existe

### Requirement: Llantas existentes interpretadas
Las llantas ya registradas SHALL quedar con su año y semana de fabricación interpretados de su DOT una sola vez, al desplegar, y SHALL reinterpretarse cada vez que se edite el DOT.

#### Scenario: Corregir un DOT
- **WHEN** se corrige el DOT de una llanta de «…2321» a «…2421»
- **THEN** su semana de fabricación pasa a 24 y los tableros la cuentan en la semana 24

### Requirement: Filtros comunes
El tablero general y el tablero de descarte SHALL ofrecer los filtros de marca, referencia, dimensión, año de fabricación y semana de fabricación, de selección múltiple, además del periodo. La lista de referencias SHALL limitarse a las de las marcas elegidas.

#### Scenario: Filtro por año de fabricación
- **WHEN** se filtra el tablero de descarte por años de fabricación 2019 y 2020
- **THEN** todos sus gráficos cuentan solo bajas de llantas fabricadas en esos años

#### Scenario: Referencias según la marca
- **WHEN** se eligen las marcas A y B
- **THEN** el filtro de referencia ofrece solo referencias de A y de B

#### Scenario: Llantas sin DOT
- **WHEN** se filtra por año de fabricación
- **THEN** el filtro ofrece la opción «Sin DOT válido» para incluir o excluir esas llantas

### Requirement: Filtros aplicados en el servidor
Los filtros SHALL aplicarse en el servidor sobre todas las llantas, y los valores ofrecidos en cada filtro SHALL salir de los datos de la empresa.

#### Scenario: Empresa con 96 mil llantas
- **WHEN** en la empresa `carga` se filtra el tablero de descarte por marca y año de fabricación
- **THEN** los totales cuadran con la lista de descarte filtrada igual, y la respuesta no bloquea el servidor
