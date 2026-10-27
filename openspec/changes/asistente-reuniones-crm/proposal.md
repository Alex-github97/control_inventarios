# Proposal

## Why

En el CRM, lo que se acuerda en una reunión vive en la memoria del ejecutivo o en el campo `proximo_paso` de la interacción: un texto de 200 caracteres sin responsable ni fecha. Los compromisos se pierden y nadie los sigue. La plataforma ya tiene las piezas para cerrar ese hueco: clientes, contactos, oportunidades, actividades con vencimiento y despliegue propio. Además, OpenAI ofrece hoy transcripción en español y extracción estructurada con calidad suficiente.

## What Changes

- Una **reunión** pasa a ser un registro del CRM ligado a un cliente, y opcionalmente a una oportunidad. Tiene su origen (presencial o virtual), sus participantes, su grabación, su transcripción y su estado.
- **Reuniones presenciales:** el ejecutivo graba desde la aplicación, en el celular o el portátil. Puede ver la transcripción en vivo y al terminar sube el audio. No hace falta ningún servicio de terceros. (Fase 1)
- **Reuniones virtuales:** un **bot propio**, autoalojado en un servidor aparte y basado en el proyecto abierto Vexa, entra a Google Meet y Microsoft Teams con el enlace de la reunión. (Fase 2) A Zoom entra con la autorización que Zoom exige desde marzo de 2026. (Fase 3)
- La captura se hace detrás de una **interfaz neutral**: el CRM recibe audio y transcripción sin saber qué los produjo. Así se puede cambiar el bot por Recall.ai u otro proveedor sin tocar el CRM.
- **Transcripción** con los modelos vigentes de OpenAI (`gpt-transcribe` para el archivo, `gpt-live-transcribe` para el vivo), con los nombres del cliente y sus contactos como palabras clave.
- **Extracción con un modelo de OpenAI:** saca de la transcripción el resumen, los acuerdos, los riesgos y los **compromisos**, cada uno con responsable, fecha y la cita textual que lo respalda.
- **Revisión humana obligatoria:** los compromisos llegan como propuestas. Solo los que el ejecutivo aprueba se vuelven actividades del CRM, si son nuestros, o compromisos del cliente con seguimiento, si son del cliente.
- **Consentimiento y retención (Ley 1581 de 2012):**
  - no se graba sin dejar constancia del aviso;
  - el bot se identifica como grabador;
  - el audio se borra al vencer el plazo de retención de la empresa.

## Capabilities

### New Capabilities

- `crm/captura-reuniones`: el registro de la reunión, cómo se obtiene su audio (grabación en la aplicación o bot en la reunión virtual), el consentimiento, la retención del audio y la independencia del proveedor de captura.
- `crm/transcripcion-reuniones`: cómo se convierte el audio en una transcripción en español utilizable: en vivo y final, audio largo, atribución de hablantes y manejo de fallos.
- `crm/compromisos-reunion`: la extracción de compromisos, acuerdos y riesgos desde la transcripción, la evidencia de cada uno, la revisión humana y su paso a actividades y seguimiento del CRM.

### Modified Capabilities

Ninguna. No hay specs del CRM en `openspec/specs/`. Las actividades (`crm_actividad`) y las interacciones (`crm_interaccion`) existentes se reutilizan sin cambiar su comportamiento actual.

## Impact

- **Backend:**
  - modelos nuevos del CRM: reunión, participantes, transcripción, compromiso;
  - extensión de `endpoints/crm.py` o un router propio;
  - trabajos en segundo plano para transcribir y extraer;
  - la dependencia `openai` en `requirements.txt`;
  - migraciones en el esquema de cada empresa.
- **Frontend:**
  - pestaña de reuniones en el CRM;
  - grabador en el navegador con transcripción en vivo;
  - pantalla de revisión de compromisos.
- **Infraestructura:**
  - `OPENAI_API_KEY` en `.env.prod`;
  - un **segundo servidor** para el bot (fase 2), con un Chrome por reunión simultánea;
  - almacenamiento del audio en el volumen `uploads`.
- **Terceros:** las API de OpenAI (el audio y el texto salen del servidor) y, en fase 3, una app de Zoom revisada por Zoom.
- **Módulos:** se activa con el módulo contratado `crm` y el permiso de perfil `crm`. La organización de la plataforma por módulos la lleva otro compañero en paralelo, así que hay que coordinar con él antes de aplicar.
