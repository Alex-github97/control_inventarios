# Spec Delta

## Purpose

Que un usuario entre a la app con las mismas credenciales del portal y que su teléfono quede con una sesión propia, segura y revocable, que no se caiga a mitad de un turno sin señal.

## ADDED Requirements

### Requirement: Ingreso con las credenciales del portal
La app SHALL pedir el código de la empresa, el usuario y la contraseña, igual que el portal, y SHALL respetar sus mismas reglas: bloqueo por intentos fallidos, usuario inactivo y módulos contratados. La app MUST NOT dejar entrar a una empresa que no tenga contratado el CMMS.

#### Scenario: Empresa sin CMMS
- **WHEN** un usuario de una empresa que no contrató el CMMS ingresa en la app
- **THEN** la app no le abre sesión y le explica que su empresa no tiene el módulo de mantenimiento

#### Scenario: Recordar la empresa
- **WHEN** el usuario ya entró una vez desde ese teléfono
- **THEN** la app recuerda el código de la empresa y el usuario, y solo le pide la contraseña o la huella

### Requirement: Sesión de dispositivo
Al ingresar, el teléfono SHALL quedar registrado como un dispositivo del usuario, con su nombre, modelo y última actividad. La sesión del dispositivo SHALL renovarse sin pedir de nuevo la contraseña mientras el dispositivo esté vigente, y SHALL seguir permitiendo trabajar sin señal durante al menos 7 días. La credencial MUST guardarse en el almacenamiento seguro del teléfono.

#### Scenario: Turno sin señal
- **WHEN** un técnico trabaja 10 horas en un patio sin señal
- **THEN** la app no le pide volver a ingresar y lo registrado se envía al recuperar la conexión

#### Scenario: Teléfono que vuelve después de mucho tiempo
- **WHEN** el dispositivo no se conecta en más de 30 días
- **THEN** la sesión vence y la app pide de nuevo la contraseña, sin perder lo que estaba pendiente de enviar

### Requirement: Desbloqueo biométrico
La app SHALL ofrecer desbloquear con huella o rostro cuando el teléfono lo admita, y SHALL bloquearse tras 15 minutos en segundo plano. El desbloqueo biométrico MUST NOT reemplazar la contraseña del primer ingreso.

#### Scenario: Volver a la app
- **WHEN** el usuario vuelve a la app después de 20 minutos
- **THEN** la app le pide huella o rostro, o la contraseña si no tiene biometría

### Requirement: Revocar un dispositivo
Desde el portal, un administrador de la empresa y el propio usuario SHALL poder ver los dispositivos vinculados y revocarlos. Un dispositivo revocado MUST perder el acceso en su siguiente conexión y SHALL borrar los datos locales de la empresa.

#### Scenario: Teléfono perdido
- **WHEN** el administrador revoca el teléfono que un técnico perdió
- **THEN** en cuanto ese teléfono se conecte la app cierra la sesión y borra los datos de la empresa guardados en él

#### Scenario: Usuario desactivado
- **WHEN** se desactiva el usuario en el portal
- **THEN** todos sus dispositivos pierden el acceso en su siguiente conexión
