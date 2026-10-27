# Spec Delta

## Purpose

Controla la vida de cada sesión de usuario desde el servidor, para que un token robado o una pantalla abierta y olvidada no den acceso indefinido a la plataforma.

## ADDED Requirements

### Requirement: Sesión registrada en el servidor
Cada inicio de sesión SHALL crear una sesión en el servidor, y el token emitido MUST referirse a ella. Una petición con un token válido cuya sesión no exista o esté cerrada MUST rechazarse con 401.

#### Scenario: Sesión cerrada con token vigente
- **WHEN** una sesión se cierra y luego se usa su token antes de que el token venza
- **THEN** el servidor responde 401

#### Scenario: Almacén de sesiones caído
- **WHEN** el almacén de sesiones no responde
- **THEN** el servidor rechaza las peticiones autenticadas en lugar de dejarlas pasar

### Requirement: Cierre por inactividad real
Una sesión SHALL vencer 10 minutos después de la última actividad real del usuario (teclado, mouse o pantalla) y MUST NOT durar más de 12 horas en total. Las consultas automáticas de la interfaz MUST NOT alargarla.

#### Scenario: Usuario inactivo
- **WHEN** el usuario no interactúa durante 10 minutos aunque la pantalla siga consultando datos
- **THEN** la sesión se cierra y la interfaz vuelve al inicio de sesión mostrando el motivo

#### Scenario: Aviso previo
- **WHEN** falta un minuto para el cierre por inactividad
- **THEN** la interfaz muestra un aviso con cuenta regresiva y la opción de continuar

### Requirement: Cierre de sesión explícito y por cambios de cuenta
Cerrar sesión SHALL cerrar la sesión en el servidor y en todas las pestañas del navegador. Cambiar la propia contraseña SHALL cerrar las demás sesiones del usuario; restablecerla, desactivar al usuario o cambiarle el rol SHALL cerrar todas.

#### Scenario: Cambio de rol
- **WHEN** un administrador cambia el rol de un usuario con sesión abierta
- **THEN** la siguiente petición de ese usuario recibe 401 y al volver a entrar ve el motivo

### Requirement: Freno de intentos de inicio de sesión
El inicio de sesión MUST bloquearse temporalmente tras 5 intentos fallidos de un mismo usuario o 20 desde una misma IP en 15 minutos, y SHALL responder con el mismo mensaje y en un tiempo similar ante usuario inexistente, contraseña errada, usuario bloqueado o inactivo.

#### Scenario: Fuerza bruta sobre un usuario
- **WHEN** se intenta ingresar 6 veces seguidas con contraseña errada para un mismo usuario
- **THEN** el sexto intento se rechaza aunque la contraseña sea correcta, hasta que pase la ventana de 15 minutos

#### Scenario: Usuario inexistente
- **WHEN** se intenta ingresar con un usuario que no existe
- **THEN** el mensaje es el mismo que para una contraseña errada
