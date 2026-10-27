# Asistente de reuniones del CRM

Graba o recibe la grabación de una reunión, la transcribe con OpenAI y propone el resumen, los acuerdos, los riesgos y los compromisos. Nada entra al CRM hasta que alguien lo revisa y lo aprueba. Ver `openspec/changes/asistente-reuniones-crm/`.

## Activarlo en el servidor

1. **La clave de OpenAI.** Va en `.env.prod`, y nunca en el repositorio:

   ```
   OPENAI_API_KEY=sk-...
   ```

   Los modelos tienen valores por defecto. Se cambian sin tocar código, porque OpenAI los renombra y retira:

   ```
   OPENAI_MODELO_TRANSCRIPCION=gpt-transcribe      # archivo, por trozos
   OPENAI_MODELO_VIVO=gpt-live-transcribe          # texto en vivo (WebRTC)
   OPENAI_MODELO_EXTRACCION=gpt-6-astra            # Structured Outputs
   ```

2. **Reconstruir la imagen del backend.** Entran `ffmpeg` y el SDK `openai`. El despliegue automático lo hace solo; a mano sería `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build backend`.

3. **Comprobar.** En **CRM → Reuniones** desaparece el aviso «La transcripción no está configurada». Por API, `GET /api/v1/crm/reuniones/config` devuelve `ia_configurada: true`.

Sin clave, la función no se rompe. Se puede grabar y subir reuniones: los trabajos esperan en la cola y arrancan solos cuando se configura la clave. El texto en vivo responde 503 y la grabación sigue.

## Configuración por empresa

La edita un administrador de la empresa con `PUT /api/v1/crm/reuniones/config`:

| Campo | Por defecto | Qué hace |
|---|---|---|
| `aviso_texto` | Texto genérico | El aviso que se lee a los asistentes. **Debe validarlo el área legal (Ley 1581 de 2012).** Cada reunión guarda el texto que se mostró ese día. |
| `retencion_audio_dias` | 90 | A los N días se borra el audio. La transcripción y los compromisos se conservan. |
| `tope_minutos_mes` | Sin tope | Reservado para limitar el costo mensual por empresa. |

## Cómo funciona por dentro

- **Cola en la base de datos** (`crm_reunion_trabajo`). La procesan los procesos de uvicorn, que se reparten los trabajos con `FOR UPDATE SKIP LOCKED`: ningún trabajo se ejecuta dos veces. Si un proceso muere a mitad, el trabajo vuelve a quedar disponible cuando vence su préstamo (45 minutos para transcribir y 10 para lo demás). Hay hasta 5 intentos, espaciados cada vez más.
- **Audio en disco**, en el volumen `uploads`, bajo `uploads/reuniones/<esquema>/<id>/`. Nunca se carga entero en memoria.
- **Transcripción por trozos de 15 a 60 segundos**, cortados en los silencios. `gpt-transcribe` no devuelve marcas de tiempo, así que el minuto de cada tramo es el inicio de su trozo.
- **Citas verificadas.** Lo que el modelo propone sin una cita que aparezca en la transcripción no se muestra.
- **Retención:** una vez por hora y por empresa, con candado.

## Datos que salen del servidor

El audio de cada trozo y la transcripción van a OpenAI. La extracción se pide con `store: false`. Antes de abrirlo a clientes externos, hay que revisar las condiciones de retención de datos de la cuenta de OpenAI y pedir retención cero si aplica.

## Costo

**Pendiente de medir.** Antes de abrirlo a todas las empresas, hay que medir el costo real de 20 reuniones internas: minutos transcritos y tokens de extracción, según el uso del panel de OpenAI. Con esa cifra se fija `tope_minutos_mes`.

## Pruebas

- **Backend:** `docker exec -w /app -e PYTHONPATH=/app ci_backend python tests/humo_reuniones.py`. Prueba 62 escenarios de los specs, con OpenAI simulado y audio real generado con ffmpeg.
- **Navegador:** `frontend/tools/probar_reuniones.cjs`. Cubre el micrófono negado, la grabación con corte de red, el texto en vivo caído y la revisión completa. Los datos los crea y los borra `backend/tests/datos_reuniones_navegador.py`.
