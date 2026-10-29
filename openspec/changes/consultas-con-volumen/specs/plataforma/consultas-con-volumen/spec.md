# Spec Delta

## Purpose

Que ninguna consulta de la API deje sin servicio al servidor ni congele el navegador cuando una empresa acumula años de operación.

## ADDED Requirements

### Requirement: Ninguna respuesta bloquea el proceso
Una consulta MUST NOT ocupar el proceso del backend 5 segundos seguidos sin soltarlo. Pasado ese tiempo, el supervisor de uvicorn mata el proceso y corta a todos los usuarios conectados a él. El cálculo de CPU que no se pueda pasar a la base SHALL correr en un hilo aparte.

#### Scenario: Pantalla pesada con otros usuarios conectados
- **WHEN** un usuario abre el informe de rendimiento de llantas de una flota de 3.000 equipos
- **THEN** los demás usuarios atendidos por el mismo proceso siguen recibiendo respuesta mientras el informe se calcula, y ningún proceso se reinicia

### Requirement: Listas por trozos
Una ruta que devuelve filas de una tabla que crece con la operación SHALL aceptar `limite` y `desplazamiento` y SHALL mandar el total en la cabecera `X-Total-Count`, expuesta al navegador. El cuerpo SHALL seguir siendo un arreglo.

#### Scenario: Pedir una página
- **WHEN** la pantalla de descarte pide `limite=100&desplazamiento=200`
- **THEN** recibe las bajas 201 a 300, de la más reciente a la más antigua, y la cabecera `X-Total-Count` dice cuántas hay en total

#### Scenario: Cliente que no pagina
- **WHEN** una integración llama la ruta sin `limite`
- **THEN** recibe el primer trozo del tope por defecto, o la lista entera si la ruta no tiene tope por defecto, y en ambos casos el total en la cabecera

### Requirement: Filtrar en el servidor
Cuando una lista va por trozos, la búsqueda y los filtros de la pantalla SHALL aplicarse en el servidor sobre todos los registros, no sobre la página cargada.

#### Scenario: Buscar en la bitácora
- **WHEN** el usuario busca una llanta en la bitácora de movimientos
- **THEN** ve todos los movimientos de esa llanta en toda la historia, no solo los que estaban entre los últimos 500

### Requirement: Sin una consulta por fila
Una ruta MUST NOT hacer una consulta a la base por cada fila que devuelve ni por cada registro que recorre. Los datos relacionados SHALL venir en la misma consulta o en un número fijo de consultas.

#### Scenario: Cargas de lubricación
- **WHEN** se listan las cargas de lubricación de una flota con 57.000 cargas
- **THEN** producto, motivo de drenaje y rellenos llegan en la misma consulta y la respuesta tarda menos de un segundo

### Requirement: Mismo resultado
Una optimización MUST NOT cambiar el contenido de la respuesta para los mismos filtros, salvo el orden entre empates y el redondeo de sumas de punto flotante. La única excepción es un cambio que el spec declare. En la predicción de fallas con más de 60.000 observaciones se declara el entrenamiento con una muestra fija.

#### Scenario: Comparación contra la versión anterior
- **WHEN** se llama una ruta optimizada y la versión anterior con los mismos parámetros sobre la misma base
- **THEN** las dos respuestas tienen las mismas filas y los mismos valores
