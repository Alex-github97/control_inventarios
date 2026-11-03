# Spec Delta

## Purpose

Que el jefe de mantenimiento y los supervisores vean el estado de la operación y decidan desde el teléfono, sin esperar a sentarse frente al portal.

## ADDED Requirements

### Requirement: Tablero del CMMS
El supervisor SHALL ver un tablero con los indicadores principales del CMMS: disponibilidad de la flota, órdenes abiertas por estado y prioridad, backlog en horas, cumplimiento de preventivos, costo de mantenimiento del periodo y activos detenidos. Los indicadores SHALL ser los mismos que calcula el portal para el mismo periodo y filtros. Cada indicador SHALL llevar a su detalle.

#### Scenario: Mismos números que el portal
- **WHEN** el supervisor abre el tablero del mes en la app y en el portal
- **THEN** la disponibilidad, el backlog y el cumplimiento de preventivos coinciden

### Requirement: Asignar y aprobar
El supervisor SHALL poder asignar órdenes a técnicos, cambiar su prioridad, aprobar o rechazar las órdenes y solicitudes que esperan su aprobación —con motivo en el rechazo— y revisar el cierre de una orden con sus fotos y firma.

#### Scenario: Aprobar desde la vía
- **WHEN** el jefe recibe una solicitud de repuesto costoso y la aprueba en la app
- **THEN** la orden sigue su flujo y el técnico la ve aprobada en su siguiente sincronización

#### Scenario: Rechazo sin motivo
- **WHEN** el supervisor intenta rechazar una solicitud sin escribir el motivo
- **THEN** la app no lo deja hasta que lo escriba

### Requirement: Alertas
El supervisor SHALL ver en la app las alertas del CMMS que le corresponden (activos detenidos, órdenes vencidas, checklists con hallazgo crítico, llantas bajo el mínimo, documentos por vencer), marcarlas como leídas y abrir el elemento que las originó.

#### Scenario: Hallazgo crítico
- **WHEN** un conductor cierra un preoperacional con frenos no conformes
- **THEN** al supervisor le aparece la alerta y desde ella abre el checklist
