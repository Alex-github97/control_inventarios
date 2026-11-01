# Spec Delta

## Purpose

Medir el comportamiento de cada etapa de la planta, no solo cuántas llantas salen, con indicadores calculados a partir de los registros de producción y no digitados a mano.

## ADDED Requirements

### Requirement: Indicadores calculados de los registros
Todo indicador SHALL calcularse de los pasos, decisiones, ciclos, consumos y reclamos registrados, para un periodo y con filtros por cliente, medida, marca, banda, equipo y operario. Ningún indicador SHALL digitarse a mano.

#### Scenario: Filtro por marca
- **WHEN** se filtra el tablero por la marca «Michelin» en octubre
- **THEN** todos los indicadores se recalculan solo con las carcasas Michelin recibidas o procesadas en octubre

### Requirement: Recepción e inspección
El sistema SHALL calcular llantas recibidas, aceptación inicial (aprobadas ÷ recibidas), rechazo inicial, porcentaje de condicionales, rechazos por marca, medida y motivo, y tiempo promedio de inspección.

#### Scenario: Aceptación inicial
- **WHEN** en el periodo se recibieron 1.000 carcasas y la inspección inicial aprobó 820
- **THEN** la aceptación inicial es 82 %

### Requirement: Rechazo por etapa y rendimiento de carcasas
El sistema SHALL mostrar en qué etapa se rechazan las carcasas y el rendimiento de carcasas (terminadas y aprobadas ÷ recibidas).

#### Scenario: Embudo de la planta
- **WHEN** se abre el embudo del mes
- **THEN** se ve cuántas carcasas salieron del flujo en cada punto de inspección y el rendimiento final

### Requirement: Primera pasada
El sistema SHALL calcular el rendimiento de primera pasada (FPY): carcasas terminadas conformes sin repetir etapas, correcciones ni retenciones, sobre carcasas procesadas.

#### Scenario: Corrección autorizada
- **WHEN** una llanta aprobada en inspección final necesitó una corrección autorizada
- **THEN** cuenta como terminada pero no como primera pasada

### Requirement: Tiempos y productividad
El sistema SHALL calcular el tiempo promedio por etapa, el tiempo total de la planta (recepción a producto terminado), las llantas por turno y por máquina, la productividad (terminadas ÷ horas-hombre) y la utilización de autoclaves y prensas.

#### Scenario: Cuello de botella
- **WHEN** el tiempo de espera promedio antes del embandado es el mayor de todas las etapas
- **THEN** el tablero lo destaca como la etapa con más espera

### Requirement: Vulcanización y consumos
El sistema SHALL calcular ciclos realizados, llantas por ciclo, porcentaje de ciclos con desviación por variable, consumo de banda por referencia (metros por llanta), consumo de cojín, cemento y parches, y reparaciones por carcasa.

#### Scenario: Desviaciones por autoclave
- **WHEN** el autoclave 2 tuvo 6 de 40 ciclos con desviación de presión
- **THEN** el indicador muestra 15 % de ciclos con desviación de presión para el autoclave 2

### Requirement: Calidad final, garantías y costo
El sistema SHALL calcular aprobación final, defectos por tipo, reclamos y garantías procedentes por cada 100 llantas entregadas, y costo por llanta (insumos consumidos más mano de obra registrada, sobre llantas aprobadas).

#### Scenario: Garantías por cada 100
- **WHEN** en el semestre se entregaron 2.000 llantas y se dictaminaron 14 garantías procedentes
- **THEN** el indicador muestra 0,7 garantías por cada 100 llantas

### Requirement: Indicadores con volumen
Los indicadores SHALL agregarse en la base de datos y responder sin bloquear el servidor con años de operación de una planta grande.

#### Scenario: Un año de operación
- **WHEN** se consulta el tablero anual de una planta con 150.000 carcasas procesadas
- **THEN** el tablero responde en pocos segundos y ningún proceso del servidor se reinicia
