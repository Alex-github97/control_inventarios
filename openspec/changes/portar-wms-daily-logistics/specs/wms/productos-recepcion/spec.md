# Spec Delta

## Purpose

Enriquece los datos maestros de producto y hace trazable la recepción, desde el estado de cada línea de la orden de compra hasta el destino de lo recibido.

## ADDED Requirements

### Requirement: Datos maestros de producto enriquecidos
Cada producto SHALL admitir subfamilia con código, SKU numérico, marca, referencia e imágenes. Los códigos de producto MUST ser únicos aun cuando se creen productos al mismo tiempo.

#### Scenario: Altas simultáneas
- **WHEN** dos usuarios crean productos de la misma subfamilia al mismo tiempo
- **THEN** cada producto recibe un código distinto

### Requirement: Clasificación de productos
El WMS SHALL clasificar los productos (por ejemplo, por rotación) y mostrar la clasificación en la ficha y en los listados.

#### Scenario: Producto de alta rotación
- **WHEN** un producto concentra la mayor parte de las salidas del periodo
- **THEN** aparece en la clase de mayor rotación

### Requirement: Códigos de barras y lectura
El WMS SHALL generar e imprimir códigos de barras de productos y posiciones y SHALL permitir leerlos con la cámara del dispositivo para identificar el producto o la posición.

#### Scenario: Lectura en recepción
- **WHEN** el operario lee con la cámara el código de un producto durante la recepción
- **THEN** la línea correspondiente de la orden se selecciona sin teclear

### Requirement: Estado de la orden de compra y de cada línea
Cada orden de compra y cada una de sus líneas SHALL tener un estado (pendiente, parcial, completa, cerrada) que se actualice con lo recibido, y el historial de cambios de estado SHALL quedar consultable.

#### Scenario: Recepción parcial
- **WHEN** se recibe la mitad de una línea
- **THEN** la línea queda «parcial» y la orden también, hasta completar o cerrar

### Requirement: Distribución de lo recibido
Al recibir, el WMS SHALL permitir enviar cada cantidad a estantería o a cross docking, y lo enviado a cross docking MUST NOT quedar como existencia almacenada.

#### Scenario: Cross docking
- **WHEN** parte de una recepción se distribuye a cross docking
- **THEN** esa parte queda disponible para despacho sin pasar por una posición de almacenamiento
