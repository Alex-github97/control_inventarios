# Spec Delta

## Purpose

Define cómo se guardan y validan las contraseñas y cómo se firman y verifican los tokens, con algoritmos vigentes y sin las vulnerabilidades conocidas de la librería anterior.

## ADDED Requirements

### Requirement: Contraseñas con Argon2id
Las contraseñas SHALL almacenarse con Argon2id. Una contraseña guardada con el algoritmo anterior SHALL convertirse a Argon2id la primera vez que el usuario inicie sesión correctamente, sin pedirle nada.

#### Scenario: Usuario con contraseña antigua
- **WHEN** un usuario cuya contraseña está guardada con bcrypt inicia sesión correctamente
- **THEN** entra normalmente y su contraseña queda guardada con Argon2id

### Requirement: Política de contraseñas
Toda contraseña nueva (al crear usuario, cambiarla o restablecerla) MUST tener entre 12 y 128 caracteres, MUST NOT ser una contraseña común y MUST NOT contener el nombre de usuario.

#### Scenario: Contraseña corta
- **WHEN** se intenta crear un usuario con una contraseña de 8 caracteres
- **THEN** se rechaza indicando la longitud mínima

#### Scenario: Contraseña con el usuario
- **WHEN** el usuario «jperez» intenta usar «jperez2026segura»
- **THEN** se rechaza indicando que no puede contener el nombre de usuario

### Requirement: Tokens con algoritmo fijo
Los tokens SHALL firmarse y validarse con un único algoritmo configurado; un token con otro algoritmo o sin firma MUST rechazarse. En producción, la aplicación MUST NOT arrancar con una clave de firma débil o por defecto.

#### Scenario: Token con algoritmo «none»
- **WHEN** llega un token que declara el algoritmo «none»
- **THEN** el servidor responde 401

#### Scenario: Clave de firma débil en producción
- **WHEN** la aplicación arranca en modo producción con la clave de firma por defecto
- **THEN** no arranca e indica que debe configurarse una clave fuerte
