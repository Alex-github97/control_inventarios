# Design

## Context

Ver `proposal.md` (Why) y los specs `crm/captura-reuniones`, `crm/transcripcion-reuniones` y `crm/compromisos-reunion`.

**Lo que ya hay en el código:**
- `crm_interaccion` tiene el tipo `REUNION` y un `proximo_paso` de texto libre.
- `crm_actividad` ya modela tareas con `ejecutivo_id`, `fecha_vencimiento`, `completada` y `prioridad`, con endpoints para listar, crear y completar en `endpoints/crm.py`. Los compromisos nuestros aprobados **se vuelven `crm_actividad`**; no se crea otra tabla de tareas.
- El backend corre con **3 o 4 procesos de uvicorn**, y el `lifespan` se ejecuta en cada uno. Todo trabajo de fondo debe tolerar que varios procesos lo intenten a la vez: es una lección ya aprendida en producción.
- Cada empresa vive en su propio esquema. El `search_path` hay que reponerlo en cada transacción, y eso incluye las de los trabajos de fondo.
- **Hoy los permisos de perfil solo ocultan la interfaz; la API no los verifica.** Lo que hace cumplir la API es el módulo contratado. Los endpoints nuevos deben verificar también el permiso `crm`, porque los specs lo exigen.
- El servidor de producción tiene 2 núcleos y 8 GB, y en él ya corren la plataforma y TarifaX. Ahí no cabe un Chrome por reunión.

**Lo que dice la documentación de OpenAI (octubre de 2026):**
- `gpt-transcribe` es el modelo recomendado para archivos: acepta `languages`, `keywords`, `prompt` y *streaming*, con un tope de 25 MB por archivo.
- `gpt-live-transcribe` es para el vivo, por Realtime. No entrega hablantes ni tiempos por palabra.
- `gpt-4o-*-transcribe`, `gpt-4o-transcribe-diarize` y `whisper-1` están obsoletos y se apagan el **26 de febrero de 2027**.
- *Structured Outputs* en la Responses API se usa con `client.responses.parse` y un modelo Pydantic.

## Goals / Non-Goals

**Goals:**
- Que la fase 1 (presencial y carga de archivo) funcione sola y deje lista toda la cadena: transcribir, extraer, revisar y crear en el CRM. Las fases 2 y 3 solo agregan medios de captura.
- Que cambiar de proveedor de captura o de modelo de OpenAI sea configuración y un adaptador, no una reescritura.
- Que ninguna petición web espere a OpenAI ni al bot.

**Non-Goals:**
- Atribuir hablantes automáticamente en reuniones presenciales. El modelo que lo hacía está obsoleto; se asigna a mano.
- Que el bot hable, chatee o comparta pantalla. Solo graba.
- Programar el bot automáticamente desde el calendario. Queda para un cambio posterior.
- Transcribir llamadas telefónicas o de WhatsApp.

## Decisions

**D1. Captura neutral con adaptadores.** El CRM solo conoce un resultado de captura: el audio en el volumen `uploads`, los participantes con su nombre visible y, opcionalmente, los tramos de habla con participante, inicio y fin. Hay cuatro adaptadores:
- `grabador_web`;
- `carga_archivo`;
- `vexa` (fase 2);
- `zoom` (fase 3, sobre el mismo Vexa o el SDK).

Recall.ai sería un quinto adaptador sin tocar lo demás.
*Alternativa descartada:* integrar Vexa directo en el CRM. Ataría las pantallas y los datos a un proyecto que cambia a menudo.

**D2. Cola de trabajos en la base de datos, reclamada con `FOR UPDATE SKIP LOCKED`.** Una tabla `crm_reunion_trabajo` guarda el tipo de trabajo (TRANSCRIBIR, EXTRAER, SONDEAR_BOT, BORRAR_AUDIO), el estado, los intentos y el siguiente intento. Un ciclo en el `lifespan`, como `wms_ciclo_tareas`, recorre los esquemas de empresas con el módulo `crm` y reclama trabajos. Con `SKIP LOCKED`, los 3 o 4 procesos nunca toman el mismo. Los reintentos se espacian cada vez más y tienen tope.
*Alternativas descartadas:* Celery o RQ, que serían otro servicio más que operar, y Redis guarda las sesiones con expulsión `volatile-lru`. `BackgroundTasks` de FastAPI se pierde si el proceso muere, y los procesos ya han muerto en producción.

**D3. Bot: Vexa autoalojado en un servidor aparte, solo para grabar.** Se instala Vexa 0.12 con `make all` en un Lightsail propio. El backend lo llama con `POST /bots` y su clave. Como **Vexa no tiene webhooks**, un trabajo SONDEAR_BOT consulta el estado periódicamente. La transcripción se hace con OpenAI, igual que en la fase 1, para tener una sola calidad y un solo vocabulario. De Vexa se toman la grabación y los tramos por participante.
*Punto a verificar al empezar la fase 2 (tarea 6.1):* si Vexa entrega la grabación y los tramos con `transcribe_enabled: false`. Si no los entrega, hay dos salidas. La preferida es apuntar su servicio de transcripción, que espera una API compatible con OpenAI, a la API de OpenAI. La otra es tomar los tramos de su propia transcripción y usar solo los tiempos.

**D4. Transcripción por archivo con `gpt-transcribe`.**
- *Ajuste al implementar:* `gpt-transcribe` no devuelve marcas de tiempo (solo lo hacía `whisper-1`, obsoleto). Por eso el audio se parte en los silencios en trozos de 15 a 60 segundos, y cada trozo se transcribe por separado. El tramo es el trozo: su inicio y su fin se conocen exactamente. De paso, eso resuelve el límite de 25 MB.
- Antes de transcribir, el audio se normaliza con `ffmpeg` a mono, 16 kHz y Opus. Así una hora pesa unos 15 MB.
- Si aun así pasa de 20 MB, se parte en los silencios más cercanos a cada corte, nunca a mitad de frase, y los tiempos se recalculan contra el inicio de la reunión.
- `languages=["es"]`, y en `keywords` van el cliente, sus contactos y la oportunidad.
- `ffmpeg` y la petición corren con `asyncio.to_thread` y archivos en disco, nunca con el audio entero en memoria: los procesos ya morían por falta de memoria.
- El modelo es configurable (`OPENAI_MODELO_TRANSCRIPCION`), porque los nombres cambian.

**D5. Texto en vivo por WebRTC con clave efímera.** El navegador nunca ve la `OPENAI_API_KEY`. El backend emite una credencial efímera y el navegador abre la sesión Realtime de transcripción con `gpt-live-transcribe`. Como ese modelo no admite VAD del servidor, el corte de turnos lo hace el navegador, con detección de silencio local. El vivo es independiente de la grabación: si falla, solo se oculta.
*Verificar al implementar:* el endpoint exacto para emitir la credencial efímera. La guía de transcripción solo enlaza a la de WebRTC.

**D6. Grabador web por partes.** `MediaRecorder` en webm/Opus emite un trozo cada 10 segundos.
- Cada trozo se guarda primero en IndexedDB y luego se sube con su número de secuencia.
- Si la red se cae, los trozos esperan en IndexedDB y se suben al volver la conexión.
- Al detener, el servidor verifica que la secuencia esté completa y concatena con `ffmpeg`.
- Esto cumple el «sin huecos» del spec sin depender de una conexión estable.

**D7. Extracción con Structured Outputs y verificación de citas.**
- Se usa `client.responses.parse` con un esquema Pydantic: resumen, acuerdos, riesgos y compromisos. Cada compromiso trae descripción, responsable nombrado, fecha dicha, cita y minuto.
- Se manda `store: false`, para no dejar las respuestas guardadas en OpenAI.
- Después, en nuestro código:
  - cada cita se busca en la transcripción con normalización de tildes, mayúsculas y espacios, y se descarta lo que no aparezca;
  - las fechas relativas, como «el viernes» o «mañana», se resuelven contra la fecha de la reunión en `America/Bogota`;
  - el responsable se empareja con los participantes por nombre y queda «por asignar» si hay ambigüedad.
- El modelo es configurable (`OPENAI_MODELO_EXTRACCION`); la guía recomienda hoy `gpt-6-astra`.
*Alternativa descartada:* pedirle al modelo que devuelva los identificadores del CRM. El emparejamiento en nuestro código es verificable; el del modelo no.

**D8. Datos.** Todas las tablas se crean en el esquema de cada empresa, con `create_all`. Los índices van por la vía de migración existente, dentro del candado de migraciones.
- `crm_reunion`:
  - el cliente y, si existe, la oportunidad;
  - el origen, la plataforma y el enlace;
  - el estado y el motivo de falla;
  - la constancia del aviso: usuario, fecha y hora, y texto;
  - la ruta del audio, la fecha de borrado y quién lo borró;
  - el resumen.
- `crm_reunion_participante`: un contacto o un usuario, más el nombre visible que dio la captura.
- `crm_reunion_tramo`: el inicio, el fin, el texto, el texto original si se corrigió, y el participante.
- `crm_reunion_compromiso`:
  - el tipo (ACUERDO, RIESGO o COMPROMISO) y el lado (NUESTRO o CLIENTE);
  - el responsable, la fecha o «no definida», la cita y el minuto;
  - el estado (PROPUESTO, APROBADO, DESCARTADO o CUMPLIDO);
  - `actividad_id`, que apunta a `crm_actividad`, y `interaccion_id`.
- `crm_reunion_trabajo`: la cola de D2.

Al aprobar un compromiso NUESTRO se crea la `crm_actividad`. Al cerrar la revisión se crea la `crm_interaccion` REUNION.

**D9. Retención.** Un trabajo diario BORRAR_AUDIO borra los archivos vencidos según `retencion_audio_dias` de la configuración del CRM de la empresa (por defecto 90). El borrado manual lo puede hacer un administrador de la empresa y queda registrado.

**D10. Zoom (fase 3).**
- App de Zoom del tipo Meeting SDK, con OAuth por usuario: el ejecutivo conecta su cuenta.
- Para reuniones de otra cuenta, el bot entra con un token OBF del ejecutivo presente.
- Requiere la revisión de Zoom y la versión 5.17.5 o posterior del SDK.
- Si el anfitrión instala la app, la alternativa es RTMS.

**D11. Permisos.** Los endpoints nuevos exigen el módulo contratado `crm` (como hoy) **y** el permiso de perfil `crm`, verificado en la API. Revisar compromisos exige además ser participante de la reunión o tener el rol ADMINISTRADOR.

## Risks / Trade-offs

- [Meet o Teams cambian su interfaz y el bot deja de entrar] → Alerta cuando un bot pasa a FALLIDA por «no pudo entrar». Hay que tener un responsable de actualizar Vexa, y el adaptador neutral de D1 permite cambiar a Recall.ai como salida de emergencia.
- [Una empresa cliente bloquea a los invitados anónimos de Teams] → El bot no puede entrar a esas reuniones, y el ejecutivo recibe el motivo. La salida es grabar como presencial.
- [El modelo inventa compromisos] → Las citas se verifican (D7) y se revisa siempre antes de crear nada (spec).
- [Costo de OpenAI por hora de reunión] → Medir el costo de las primeras 20 reuniones reales antes de abrirlo a todas las empresas, y poner un tope mensual por empresa en la configuración del CRM.
- [Memoria de los procesos al manejar audio] → Todo el audio se maneja en disco y con `to_thread` (D4). Los trabajos se procesan de a uno por proceso.
- [OpenAI cambia o apaga modelos] → Los modelos se configuran por variable (D4, D7). Ya se evitan los que se apagan en febrero de 2027.
- [Consentimiento y datos personales (Ley 1581)] → La constancia es obligatoria antes de grabar, el bot tiene un nombre explícito, la retención es configurable y se manda `store: false`. Falta que el área legal valide el texto del aviso.
- [El audio sale a OpenAI] → Hay que revisar las condiciones de retención de datos de la cuenta de OpenAI y pedir retención cero si aplica, antes de abrirlo a clientes externos.

## Migration Plan

1. Fase 1: se despliega como siempre, con aprobación en GitHub. Las tablas son nuevas y no tocan las existentes. La función queda oculta para las empresas sin el módulo `crm`.
2. `OPENAI_API_KEY` se agrega a `.env.prod` en el servidor, nunca al repositorio.
3. Fase 2: se crea el servidor del bot, se instala Vexa y su URL y clave van en `.env.prod`. Antes de abrirlo a todos, se prueba con reuniones internas de Meet y Teams.
4. **Reversa:** basta con ocultar la pestaña (permiso de perfil) y dejar de encolar trabajos. Las tablas nuevas pueden quedarse sin afectar nada, y el servidor del bot se apaga sin tocar la plataforma.

## Open Questions

- El tamaño del servidor del bot depende de cuántas reuniones simultáneas haya en la práctica. Se decide con la medición de la fase 2.
- El texto definitivo del aviso de grabación lo debe validar el área legal. El sistema lo guarda configurable.
