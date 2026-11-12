# Spec Delta

## Purpose

Permite segmentar por rama de la jerarquía los informes, tableros y exportes de llantas, TittanLite, combustible y lubricación, y las búsquedas de las apps móviles.

## ADDED Requirements

### Requirement: Selector de nodo en los informes
Los informes y tableros de llantas (incluidos el informe de flota, la pila de desecho y la sección TittanLite), combustible y lubricación SHALL ofrecer un filtro por nodo de la jerarquía. Elegir un nodo MUST incluir los activos de todos sus subniveles.

#### Scenario: Tablero de llantas por cliente
- **WHEN** en Informes de neumáticos se elige el nodo «Transportes ABC»
- **THEN** el tablero muestra solo las llantas montadas en vehículos de «Transportes ABC» y de sus flotas

#### Scenario: Combustible por flota
- **WHEN** en Combustible se elige «Flota Bogotá»
- **THEN** el rendimiento km/gal, el consumo y el ranking se calculan solo con los vehículos de esa flota

### Requirement: Combinación con los demás filtros
El filtro por nodo SHALL combinarse con los filtros existentes (fechas, tipo, marca, línea, modelo, placa) como intersección. Las opciones de los demás filtros MUST limitarse a lo que existe dentro del nodo elegido.

#### Scenario: Nodo y marca
- **WHEN** se elige el nodo «Transportes ABC» y la marca «Kenworth»
- **THEN** el informe incluye solo los Kenworth de «Transportes ABC», y la lista de marcas solo ofrece las que tiene ese cliente

### Requirement: Selector limitado al alcance
El selector de nodo SHALL mostrar solo las ramas dentro del alcance del usuario. Un usuario con una sola rama asignada MUST ver su rama preseleccionada.

#### Scenario: Usuario de un cliente
- **WHEN** un usuario con solo «Transportes ABC» abre un informe
- **THEN** el selector muestra «Transportes ABC» y sus subniveles, ya elegido, sin ofrecer otros clientes

### Requirement: El nodo viaja en los exportes
Los Excel y PDF generados con un nodo elegido SHALL incluir solo esa rama y mostrar la ruta del nodo en el encabezado. Las filas de los Excel MUST traer una columna con la ruta del nodo de cada activo.

#### Scenario: PDF del informe de flota
- **WHEN** se descarga el informe de flota de llantas con «Flota Bogotá» elegida
- **THEN** el PDF dice «Redllantas › Transportes ABC › Flota Bogotá» en el encabezado y solo trae esos vehículos

### Requirement: Filtro en las apps móviles
Las apps TittanWare y TittanLite SHALL permitir elegir un nodo para acotar la búsqueda de activos y placas y las listas de trabajo. La app MUST recordar el último nodo elegido en el dispositivo.

#### Scenario: Inspector de TittanLite
- **WHEN** un inspector elige «Flota Medellín» en TittanLite y busca vehículos
- **THEN** la lista solo muestra vehículos de «Flota Medellín», y al abrir la app de nuevo sigue elegida

### Requirement: Activos sin asignar
Para los usuarios que ven toda la empresa, el selector SHALL ofrecer también la opción «Sin asignar», que muestra los activos sin nodo.

#### Scenario: Revisar pendientes de clasificar
- **WHEN** un administrador elige «Sin asignar» en el informe de combustible
- **THEN** el informe muestra solo los vehículos que todavía no tienen nodo
