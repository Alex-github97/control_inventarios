# Spec Delta

## Purpose

Representa la forma real de cada bodega (contorno, áreas, posiciones) para conocer su ocupación y verla en plano y en 3D.

## ADDED Requirements

### Requirement: Constructor de bodega
El WMS SHALL permitir dibujar el plano de una bodega: contorno, muros en polilínea, áreas de forma libre y curvas, posiciones con su tipo, y textos y líneas en el piso. El plano SHALL guardarse completo y reabrirse igual.

#### Scenario: Guardar y reabrir
- **WHEN** se dibuja una bodega con dos áreas curvas y se guarda
- **THEN** al reabrirla aparecen las mismas áreas, posiciones y textos en el mismo lugar

### Requirement: Ocupación y espacio
El WMS SHALL calcular la ocupación de cada posición y área a partir de las existencias y de la capacidad del tipo de posición, y mostrarla en el plano.

#### Scenario: Posición llena
- **WHEN** las existencias de una posición alcanzan su capacidad
- **THEN** la posición se muestra como llena en el plano y en la ocupación del área

### Requirement: Mapa y vista 3D con la forma real
El mapa de la bodega y su vista 3D SHALL dibujarse con la forma real definida en el constructor, no con una cuadrícula genérica.

#### Scenario: Bodega en L
- **WHEN** una bodega tiene contorno en forma de L
- **THEN** el mapa y la vista 3D muestran la forma de L con sus posiciones
