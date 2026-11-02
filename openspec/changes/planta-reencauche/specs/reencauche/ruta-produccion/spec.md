# Spec Delta

## Purpose

Llevar cada carcasa por las etapas del reencauche, una tras otra, registrando quién, con qué máquina, cuándo y con qué resultado se hizo cada paso, y qué insumos consumió.

## ADDED Requirements

### Requirement: Rutas de etapas configurables
La planta SHALL tener rutas de producción formadas por etapas en orden. Una empresa nueva SHALL recibir sembrada la ruta en frío (las quince etapas, de recepción a despacho, con banda precurada y autoclave). La planta MAY crear variantes de esa ruta; el reencauche en caliente no se modela. Cada etapa SHALL declarar si es punto de decisión, qué mediciones pide y qué equipos la pueden hacer.

#### Scenario: Variante de la ruta
- **WHEN** el administrador crea una variante de la ruta en frío y desactiva la original
- **THEN** las nuevas órdenes solo pueden usar la variante y las órdenes ya abiertas con la original siguen su curso

#### Scenario: Etapa opcional
- **WHEN** una carcasa no necesita destalonado y la etapa está marcada como opcional en la ruta
- **THEN** el operario puede saltarla dejando registrado que se omitió y quién lo decidió

### Requirement: Orden de reencauche por carcasa
Cada paso de una carcasa por la planta SHALL ser una orden de reencauche con su ruta, la banda o diseño solicitado y la prioridad. Una carcasa MUST NOT tener dos órdenes abiertas a la vez.

#### Scenario: Abrir la orden al aprobar la inspección inicial
- **WHEN** la inspección inicial aprueba una carcasa
- **THEN** su orden queda en la etapa siguiente de la ruta y aparece en la cola de esa estación

### Requirement: Avance en orden
Una etapa SHALL poder registrarse solo cuando la anterior de la ruta esté terminada y, si era punto de decisión, aprobada. Cada registro SHALL guardar operario, equipo, inicio, fin, mediciones y observaciones.

#### Scenario: Saltarse una etapa obligatoria
- **WHEN** un operario escanea en el embandado una carcasa que no tiene registrado el cementado
- **THEN** la estación rechaza el registro e indica que la carcasa está en «cementado»

#### Scenario: Registro desde la terminal
- **WHEN** el operario escanea el código en la raspadora, pulsa iniciar y luego terminar con el diámetro medido
- **THEN** queda un paso con su usuario, la raspadora, las dos horas y la medición, y la carcasa pasa a la cola de inspección posterior al raspado

### Requirement: Mediciones contra especificación
Las etapas con mediciones (diámetro, ancho y perfil de raspado; longitud de banda; centrado; profundidad de labrado final) SHALL compararse contra la especificación vigente para la medida de la carcasa y la banda. Una medición fuera de tolerancia SHALL quedar marcada y MUST NOT dejar terminar la etapa sin una decisión registrada: repetir, corregir o enviar a evaluación.

#### Scenario: Raspado fuera de diámetro
- **WHEN** el diámetro de raspado medido es 2 mm menor que el mínimo especificado para 295/80 R22.5
- **THEN** la medición queda en rojo y el operario debe elegir entre repetir, enviar a evaluación o rechazar antes de cerrar la etapa

### Requirement: Reparaciones registradas
La etapa de escariado y reparación SHALL registrar cada daño intervenido con ubicación (corona, hombro, costado, talón, interior), tipo, tamaño y profundidad, y la reparación aplicada con su material. Una reparación MUST NOT registrarse si el daño excede los límites configurados para su ubicación sin una autorización técnica.

#### Scenario: Daño fuera de límite
- **WHEN** se registra un corte de 45 mm en el costado y el límite configurado para costado es 25 mm
- **THEN** el sistema pide la autorización de un usuario con rol técnico o propone rechazar la carcasa

### Requirement: Consumo de insumos por lote
Cada etapa que usa insumos (banda, cojín, cemento, parches, caucho de relleno, compuesto) SHALL descontarlos del inventario indicando el lote. Banda y cojín SHALL consumirse por la longitud cortada; cemento por la cantidad estándar de la medida, ajustable; parches por unidad.

#### Scenario: Corte de banda
- **WHEN** el operario corta 3,12 m de la banda «BDR-HT 230» lote L-0915 para una carcasa
- **THEN** el inventario de esa banda y lote baja 3,12 m y la carcasa queda asociada al lote L-0915

#### Scenario: Insumo sin existencia
- **WHEN** el lote escaneado no tiene la longitud suficiente en la ubicación de la estación
- **THEN** el consumo se rechaza indicando cuánto hay, y la etapa no se cierra

### Requirement: Cola por estación
Cada estación SHALL ver las carcasas que esperan en ella, en orden de prioridad y antigüedad, con su medida, banda pedida y cliente.

#### Scenario: Cola del autoclave
- **WHEN** el operario del autoclave abre su terminal
- **THEN** ve las carcasas encamisadas que esperan vulcanización, agrupables por receta compatible
