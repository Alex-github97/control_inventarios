# Spec Delta

## Purpose

Permite a cada empresa organizar sus activos en un árbol propio de niveles libres (proveedor, cliente, flota, operación…) para segmentar y restringir la información del CMMS por rama.

## ADDED Requirements

### Requirement: Árbol organizativo por empresa
El sistema SHALL permitir a cada empresa mantener un árbol de nodos, cada uno con nombre, código único dentro de la empresa y un padre opcional, sin límite fijo de niveles. El árbol de una empresa MUST ser invisible para las demás.

#### Scenario: Crear una rama de varios niveles
- **WHEN** un administrador crea «Transportes ABC» bajo «Redllantas» y «Flota Bogotá» bajo «Transportes ABC»
- **THEN** el árbol muestra los tres niveles anidados en ese orden

#### Scenario: Código repetido
- **WHEN** se intenta crear un nodo con un código que ya usa otro nodo de la misma empresa
- **THEN** el sistema rechaza la operación con un mensaje que nombra el nodo que ya tiene ese código

### Requirement: Mover un nodo sin crear ciclos
El sistema SHALL permitir cambiar el padre de un nodo y MUST rechazar cualquier cambio que deje al nodo como descendiente de sí mismo. Al mover un nodo, sus descendientes y activos MUST moverse con él.

#### Scenario: Mover una flota a otro cliente
- **WHEN** se mueve «Flota Bogotá» de «Transportes ABC» a «Logística XYZ»
- **THEN** la flota, sus subniveles y sus activos aparecen bajo «Logística XYZ»

#### Scenario: Ciclo
- **WHEN** se intenta poner «Transportes ABC» bajo su propio hijo «Flota Bogotá»
- **THEN** el sistema rechaza el cambio y el árbol queda igual

### Requirement: Desactivar en vez de borrar
El sistema SHALL permitir desactivar un nodo sin activos ni subniveles activos. Un nodo con activos o subniveles activos MUST NOT poder desactivarse ni borrarse. Un nodo desactivado MUST NOT ofrecerse para asignar activos nuevos.

#### Scenario: Nodo con activos
- **WHEN** se intenta desactivar un nodo que tiene 12 activos
- **THEN** el sistema lo impide e indica que hay 12 activos que mover primero

### Requirement: Asignar un activo a un nodo
Cada activo SHALL poder pertenecer a lo sumo a un nodo activo. La asignación es opcional. Se elige en el formulario del activo y se ve en su hoja de vida con la ruta completa (p. ej. «Redllantas › Transportes ABC › Flota Bogotá»).

#### Scenario: Activo con nodo
- **WHEN** se edita la placa ABC123 y se elige «Flota Bogotá»
- **THEN** la hoja de vida de ABC123 muestra «Redllantas › Transportes ABC › Flota Bogotá»

#### Scenario: Activo sin nodo
- **WHEN** un activo no tiene nodo
- **THEN** el sistema lo muestra como «Sin asignar» y sigue funcionando igual que hoy

### Requirement: Asignación en bloque e importación
El sistema SHALL permitir asignar un nodo a varios activos seleccionados de la lista a la vez, y aceptar una columna de nodo (por código o por ruta de nombres) en el importador de activos por Excel. Una fila con un nodo inexistente MUST rechazarse con su número de fila.

#### Scenario: Asignar 40 vehículos de una vez
- **WHEN** se seleccionan 40 activos en la lista y se elige «Flota Medellín»
- **THEN** los 40 quedan en ese nodo y el árbol suma 40 en esa rama

#### Scenario: Importación con nodo desconocido
- **WHEN** la fila 17 del Excel trae el nodo «FLOTA-ZZ», que no existe
- **THEN** la importación informa «fila 17: nodo FLOTA-ZZ no existe» y no aplica esa fila

### Requirement: Árbol inicial desde sede y ubicación
El sistema SHALL ofrecer un asistente que proponga nodos a partir de los valores existentes de sede y ubicación (o área) de los activos, muestre la propuesta con el conteo de activos y, al confirmarla, cree los nodos y asigne los activos.

#### Scenario: Propuesta desde datos existentes
- **WHEN** los activos tienen sedes «Bogotá» y «Cali» con ubicaciones «Patio 1» y «Patio 2»
- **THEN** el asistente propone «Bogotá › Patio 1», «Bogotá › Patio 2», etc., con cuántos activos caen en cada uno, y no cambia nada hasta que se confirma

### Requirement: Conteo por rama
El árbol SHALL mostrar en cada nodo cuántos activos tiene, contando los de toda su rama.

#### Scenario: Conteo acumulado
- **WHEN** «Flota Bogotá» tiene 42 activos y «Flota Medellín» 35, ambos bajo «Transportes ABC»
- **THEN** «Transportes ABC» muestra 77
