# Tasks

Antes de empezar: `git pull` y acordar con el compañero que reorganiza los módulos dónde va el router de reuniones.

## 1. Base: dependencias, modelo y permisos (fase 1)

- [x] 1.1 Agregar `openai` a `backend/requirements.txt` y `ffmpeg` a la imagen del backend. Las variables `OPENAI_API_KEY`, `OPENAI_MODELO_TRANSCRIPCION` y `OPENAI_MODELO_EXTRACCION` van en `core/config.py` y en `.env.prod.example`. Verificar que `docker compose build backend` termina y que en el contenedor `python -c "import openai"` y `ffmpeg -version` responden.
- [x] 1.2 Crear los modelos `crm_reunion`, `crm_reunion_participante`, `crm_reunion_tramo`, `crm_reunion_compromiso` y `crm_reunion_trabajo` (design D8), registrados en `models/__init__.py`, con sus índices dentro del candado de migraciones. Verificar que las tablas aparecen en `public` y en `cli_acme` al arrancar.
- [x] 1.3 Crear una dependencia de API que exija el módulo `crm` y el permiso de perfil `crm` (D11), con una prueba: sin el permiso responde 403 y con el permiso, 200.

## 2. Reunión, consentimiento y captura presencial (fase 1)

- [x] 2.1 Endpoints para crear, listar y ver reuniones ligadas a un cliente, con participantes y estados. Probar los escenarios del spec «Reunión ligada al cliente», incluidos el cliente de otra empresa y la empresa sin el módulo.
- [x] 2.2 Registrar la constancia del aviso y bloquear la grabación sin ella. Probar los dos escenarios de «Constancia de consentimiento antes de grabar».
- [x] 2.3 Recepción de las partes del audio con número de secuencia, verificación de que la secuencia esté completa y concatenación con `ffmpeg` (D6). Probar que con partes que llegan en desorden, o tarde, el audio final queda completo.
- [x] 2.4 Carga de un archivo existente (mp3, mp4, m4a, wav, webm), con rechazo de otros formatos. Probar los escenarios de «Carga de una grabación existente».
- [x] 2.5 Pantalla de reuniones en el CRM y grabador en el navegador con `MediaRecorder` y respaldo en IndexedDB. Verificar en el navegador real con `ci-auditor`: grabar, cortar la red, reconectar, detener, y que el audio quede completo. También que, si el micrófono está negado, salga el mensaje y la reunión siga en PROGRAMADA.

## 3. Cola de trabajos y transcripción (fase 1)

- [x] 3.1 Cola `crm_reunion_trabajo` con reclamo por `FOR UPDATE SKIP LOCKED`, reintentos espaciados y ciclo en el `lifespan` que recorre los esquemas con el módulo `crm` (D2). Probar con 4 procesos simultáneos que cada trabajo se ejecuta una sola vez.
- [x] 3.2 Trabajo TRANSCRIBIR: normalizar con `ffmpeg`, partir en silencios si pasa de 20 MB, llamar a `gpt-transcribe` con `languages=["es"]` y las palabras clave del CRM, y guardar los tramos con su minuto (D4). Probar con un audio de 70 minutos que se parte, conserva los minutos y no corta frases.
- [x] 3.3 Asignación de hablantes: automática si hay tramos por participante, «sin asignar» si no, con asignación manual. Probar los escenarios de «Hablante de cada tramo».
- [x] 3.4 Fallo y reintento de la transcripción, con estado FALLIDA y motivo. Probar «Servicio caído» y «Reintento exitoso» simulando el servicio caído.
- [x] 3.5 Corrección de tramos que conserva el texto original. Probar el escenario «Corregir un tramo».
- [ ] 3.6 Texto en vivo: el backend emite la credencial efímera y el navegador abre la sesión WebRTC con `gpt-live-transcribe` y detección de silencio local (D5). Verificar en el navegador que el texto aparece mientras se graba, y que si se corta la sesión en vivo la grabación continúa.

## 4. Extracción y revisión de compromisos (fase 1)

- [x] 4.1 Trabajo EXTRAER con `responses.parse` y su esquema Pydantic, con `store: false` (D7). Probar con tres transcripciones de ejemplo: con compromisos, sin fecha y sin compromisos. La última debe devolver una lista vacía.
- [x] 4.2 Verificación de citas, resolución de fechas relativas en `America/Bogota` y emparejamiento del responsable. Probar «Cita inexistente», «Compromiso nuestro» y «Responsable ambiguo».
- [x] 4.3 Pantalla de revisión: editar, aprobar, descartar y saltar a la evidencia. Al aprobar un compromiso nuestro se crea la `crm_actividad`; uno del cliente queda en seguimiento; al cerrar se crea la `crm_interaccion` REUNION. Probar todos los escenarios de «Nada se crea sin revisión» y de «Compromisos aprobados en el CRM».
- [x] 4.4 Reintento de la extracción sin volver a transcribir. Probar el escenario «Reintentar la extracción».

## 5. Retención y cierre de la fase 1

- [x] 5.1 Trabajo diario BORRAR_AUDIO con `retencion_audio_dias` (por defecto 90) en la configuración del CRM, y borrado manual registrado (D9). Probar «Vence el plazo» y «Borrado a solicitud» adelantando el reloj.
- [ ] 5.2 Documentar en `deploy/` cómo activar la función: la variable de OpenAI, el texto del aviso y la retención. Medir el costo real de 20 reuniones internas y anotarlo junto al tope mensual por empresa.

## 6. Bot propio para Meet y Teams (fase 2)

- [ ] 6.1 Instalar Vexa 0.12 en un servidor aparte y comprobar si entrega la grabación y los tramos por participante con `transcribe_enabled: false`. Si no los entrega, aplicar la salida preferida de D3. Dejar anotado el resultado en `design.md`.
- [ ] 6.2 Adaptador `vexa` del resultado neutral (D1): pedir el bot con el nombre «Asistente TittanWare — grabando», sondear su estado con el trabajo SONDEAR_BOT y traer el audio y los tramos. Probar con reuniones internas de Google Meet y de Teams que la reunión pasa a PROCESANDO y que los tramos traen nombres.
- [ ] 6.3 Fallos del bot: no admitido después del tiempo límite, plataforma no admitida e invitados anónimos bloqueados en Teams. Probar cada uno y que el motivo quede visible.
- [x] 6.4 Verificar con una captura simulada de un segundo proveedor que el CRM la procesa igual (escenario «Cambio de proveedor de captura»).
- [ ] 6.5 Alerta cuando un bot falla al entrar, y una medición de memoria y CPU por reunión simultánea para dimensionar el servidor del bot. Documentarlo en `deploy/`.

## 7. Zoom (fase 3)

- [ ] 7.1 App de Zoom (Meeting SDK 5.17.5 o posterior) con OAuth por usuario y pantalla para que el ejecutivo conecte su cuenta. Verificar que el token del usuario se guarda cifrado y que se puede revocar.
- [ ] 7.2 Entrada del bot con token OBF del ejecutivo presente, y rechazo cuando no hay cuenta conectada. Probar el escenario «Sin cuenta de Zoom conectada» y una reunión real de Zoom de otra cuenta.
- [ ] 7.3 Enviar la app a la revisión de Zoom y anotar en `deploy/` el estado y las condiciones de aprobación.

## 8. Verificación integral

- [ ] 8.1 Recorrido completo en el navegador real, presencial y virtual: crear la reunión, confirmar el aviso, grabar o mandar el bot, transcribir, revisar, aprobar, y ver la actividad y la interacción en el CRM. Correr el humo del CRM en `public` y en `cli_acme`.

## Workflow follow-up

- Archivar el cambio cuando terminen las fases que se decidan aplicar y el área legal haya validado el aviso.
