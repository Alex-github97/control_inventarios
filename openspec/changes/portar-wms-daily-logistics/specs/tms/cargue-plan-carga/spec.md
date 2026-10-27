# Spec Delta

## Purpose

Arma la carga de cada vehículo a partir de lo que el WMS pide transportar, verifica que quepa por peso, volumen y ejes, y deja creado el viaje con sus paradas.

## ADDED Requirements

### Requirement: Capacidad por tipo de vehículo
El TMS SHALL guardar por tipo de vehículo el peso máximo, el volumen máximo y las medidas internas de la caja. Un vehículo sin capacidad propia MUST usar la de su tipo, y uno con capacidad propia MUST usar la menor de las dos.

#### Scenario: Vehículo más grande que su tipo
- **WHEN** un vehículo declara 12 t y su tipo admite 10 t
- **THEN** la verificación de carga usa 10 t

#### Scenario: Sugerencia de vehículo
- **WHEN** el WMS estima la carga de tres órdenes que suman 4 t y 20 m³
- **THEN** el sistema sugiere el tipo de vehículo más pequeño que las admite y lista los vehículos disponibles de ese tipo o mayores

### Requirement: Cargue de vehículos desde solicitudes de transporte
El TMS SHALL permitir abrir un cargue para un vehículo propio, o para una transportadora con placa si es tercerizado, y asignarle consolidados de las solicitudes de transporte pendientes, con clic o escaneando su etiqueta. Cada asignación MUST verificarse contra la capacidad del vehículo. Al confirmar el cargue SHALL crearse un despacho del WMS por orden y un viaje del TMS con una parada por destino.

#### Scenario: Consolidado que no cabe
- **WHEN** se asigna un consolidado que haría pasar el cargue del peso máximo del vehículo
- **THEN** la asignación se rechaza con el peso que sobra y el cargue no cambia

#### Scenario: Confirmar cargue
- **WHEN** se confirma un cargue con dos consolidados hacia dos ciudades
- **THEN** nacen los despachos del WMS de sus órdenes, un viaje con dos paradas de entrega y la solicitud queda atendida si no le quedan consolidados

#### Scenario: Consolidado en dos cargues
- **WHEN** se intenta asignar un consolidado que ya está en otro cargue abierto
- **THEN** la asignación se rechaza

### Requirement: Plan de carga en 3D
El TMS SHALL calcular para un cargue o viaje la ubicación de cada bulto dentro de la caja (lo de la última parada al fondo), el peso y volumen ocupados, el centro de gravedad y el peso sobre cada eje, y dar un veredicto APTO, ADVERTENCIA o NO_APTO, mostrándolo en 3D.

#### Scenario: Bultos que no caben
- **WHEN** los bultos de un cargue no caben en la caja del vehículo
- **THEN** el veredicto es NO_APTO y se listan los bultos que quedaron por fuera

#### Scenario: Carga descentrada
- **WHEN** toda la carga queda contra un costado de la caja
- **THEN** el veredicto es ADVERTENCIA por centro de gravedad descentrado

### Requirement: Conductor en un solo paso
El TMS SHALL permitir crear un conductor con sus datos personales y de licencia en un solo formulario, guardándolo en las tablas de Gestión humana (colaborador y conductor) que usa la planeación, sin duplicar personas con el mismo documento.

#### Scenario: Documento repetido
- **WHEN** se crea un conductor con el documento de un colaborador que ya existe
- **THEN** se rechaza indicando que la persona ya está registrada
