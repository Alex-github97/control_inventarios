# Spec Delta

## Purpose

Define qué publica la página comercial de TittanWare y sus páginas de módulo, en particular que no muestran precios y que sus llamados a la acción llevan al formulario de contacto.

## ADDED Requirements

### Requirement: Sin precios en la página pública
La landing y las páginas de módulo SHALL NOT mostrar precios, tarifas, planes con valor, costos por unidad ni ejemplos de cuenta en dinero.

#### Scenario: Landing sin sección de tarifas
- **WHEN** un visitante abre `tittanware.com`
- **THEN** la página no contiene una sección de tarifas ni cifras en pesos asociadas a planes o unidades
- **AND** la barra y el pie no ofrecen un enlace "Tarifas"

#### Scenario: Página de módulo sin precio
- **WHEN** un visitante abre cualquier página en `/modulos/`
- **THEN** la página no muestra el valor del módulo ni enlaces a tarifas

#### Scenario: Regenerar las páginas de módulo
- **WHEN** se regeneran las páginas de módulo con el generador
- **THEN** las páginas resultantes tampoco contienen precios ni enlaces a tarifas

### Requirement: Llamados a la acción hacia contacto
Todo botón o enlace de la landing y de las páginas de módulo que antes llevaba a tarifas SHALL llevar a la sección de contacto de la landing (`/#contacto`). El llamado que antes decía "Cuánto cuesta" SHALL decir "Solicítelo".

#### Scenario: Botón de una página de módulo
- **WHEN** un visitante pulsa "Solicítelo" en una página de módulo
- **THEN** llega a la sección de contacto de la landing

#### Scenario: Ningún enlace roto a tarifas
- **WHEN** se buscan enlaces a `#tarifas` en la landing y en las páginas de módulo
- **THEN** no hay ninguno

### Requirement: Contenido editable sin textos de tarifas
El contenido por defecto de la landing y el contenido publicado desde la consola SHALL NOT incluir textos de tarifas ni frases sobre el precio.

#### Scenario: Contenido publicado anterior
- **WHEN** la base tenía guardado contenido de landing con claves o textos de tarifas
- **THEN** después del cambio el contenido público que entrega el backend no los incluye
