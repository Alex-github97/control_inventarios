# Tareas pendientes

Estado al 27 de octubre de 2026. Las tareas están agrupadas como en los `tasks.md` de OpenSpec y ordenadas por dependencia: un grupo no debería empezarse sin cerrar los que necesita antes.

**Cómo marcar el avance:** cada tarea dice cómo comprobar que quedó hecha. Cuando una tarea pertenece a un cambio de OpenSpec, se marca también en el `tasks.md` de ese cambio; la referencia va entre corchetes, por ejemplo `[reuniones 6.1]`.

**Cambios de OpenSpec en curso:**

| Cambio | Carpeta | Avance |
|---|---|---|
| Asistente de reuniones del CRM | `openspec/changes/asistente-reuniones-crm/` | 19 de 29 |
| Porte de Daily Logistics (WMS, TMS y seguridad) | `openspec/changes/portar-wms-daily-logistics/` | 11 de 33 |
| Landing sin precios y formulario de contacto | `openspec/changes/landing-contacto-sin-precios/` | Completo, falta desplegarlo y archivarlo |

## 1. Producción: dejar el servidor de AWS al día

Bloquea todo lo demás: mientras no se apruebe un despliegue, ningún cambio llega a `tittanware.com` ni a `app.tittanware.com`.

- [ ] 1.1 **Destrabar la cola de despliegues.** En GitHub Actions hay un despliegue de `447c111` esperando aprobación desde el 27 de octubre, y los nuevos se encolan detrás. Aprobarlo despliega lo último de `main`, porque el guion siempre trae la rama actualizada. Después aprobar también el de `af40d7c`. Se verifica cuando `git log -1` en `/opt/tittanware` muestra el último commit de `main` y la landing ya no muestra precios.
- [ ] 1.2 **Recuperar los datos de producción de Hostinger.** El servidor `45.80.153.11` no responde desde el 27 de octubre. Revisar en hPanel si está apagado, suspendido o vencido, y si tiene *snapshots*. Con acceso, restaurar en AWS la base de datos, `uploads/` y el `data/` del clon de TarifaX. Se verifica cuando los usuarios reales entran en `app.tittanware.com` con su clave de siempre.
- [ ] 1.3 **Respaldo nocturno en AWS.** Programar `deploy/respaldo.sh` en el cron del usuario `deploy` y copiar los respaldos fuera del servidor, por ejemplo a S3. Hoy en AWS solo existen los respaldos previos a cada despliegue. Se verifica cuando al día siguiente hay un `.dump` completo y uno por empresa en `backups/` y en el destino externo.
- [ ] 1.4 **Clave de OpenAI.** Ponerla en `.env.prod`, directo en el servidor y nunca en el repositorio ni en un chat, y volver a desplegar. Se verifica con `GET /api/v1/crm/reuniones/config`, que debe devolver `ia_configurada: true`.
- [ ] 1.5 **Dominio `.tech` y TarifaX.** Cuando se decida, apuntar `tittanware.tech`, `administrador.tittanware.tech`, `servidor.tittanware.tech` y `tarifax-icoltrans.site` a `18.227.156.163`, borrando los registros AAAA viejos. Después, emitir sus certificados (hoy TarifaX tiene uno provisional) y generar `deploy/entrada-tarifax.js` con la cuenta de pruebas. Esto último requiere la tarea 1.2. Se verifica cuando cada dominio abre con HTTPS válido.
- [ ] 1.6 **Archivos sueltos.** Decidir qué hacer con `frontend/tools/diag2.cjs` y `backend/_ul`. El primero tiene una contraseña de producción y no debe subirse nunca. Se verifica cuando `git status` queda limpio.

## 2. Landing sin precios (cambio de Anderson)

Depende de 1.1.

- [ ] 2.1 **Verificar en producción** que la landing y las páginas de módulo no muestran precios y que el formulario de contacto crea un prospecto, visible en la consola, en **Prospectos**. Seguir la verificación integral del `tasks.md` del cambio.
- [ ] 2.2 **Archivar el cambio** con `openspec archive landing-contacto-sin-precios` cuando la tarea 2.1 esté confirmada.

## 3. Asistente de reuniones: cerrar la fase 1

Depende de 1.1 y 1.4.

- [ ] 3.1 **Ver el texto en vivo con la clave real** `[reuniones 3.6]`. Grabar una reunión con «Texto en vivo» activado y comprobar que el texto aparece mientras se habla. Que la grabación siga si el texto en vivo falla ya está probado.
- [ ] 3.2 **Medir el costo de 20 reuniones internas** `[reuniones 5.2]`, en minutos transcritos y tokens según el panel de OpenAI. Anotarlo en `deploy/ASISTENTE_REUNIONES.md` y fijar `tope_minutos_mes` por empresa.
- [ ] 3.3 **Validar con el área legal el texto del aviso de grabación** (Ley 1581 de 2012) y guardarlo en la configuración del asistente. Se verifica cuando una reunión nueva muestra el texto aprobado.

## 4. Asistente de reuniones: fase 2, bot para Meet y Teams

El código ya está hecho y probado contra un Vexa simulado (`af40d7c`). Falta la infraestructura y la prueba real. Depende de 1.4.

- [ ] 4.1 **Crear el servidor del bot** en Lightsail: Ubuntu 24.04, 8 GB, Ohio, solo el puerto 22, con la llave de despliegue. Abrir el 18056 únicamente para la IP privada de la plataforma. Se verifica cuando desde el backend de la plataforma responde `curl http://<ip-privada>:18056`.
- [ ] 4.2 **Instalar Vexa 0.12** `[reuniones 6.1]` con `make all` y configurar su transcripción con la clave de OpenAI (`TRANSCRIPTION_SERVICE_URL`, `TRANSCRIPTION_SERVICE_TOKEN` y `TRANSCRIPTION_MODEL`). Poner `VEXA_URL` y `VEXA_API_KEY` en el `.env.prod` de la plataforma. Confirmar con una reunión real que Vexa entrega la grabación y los tramos con hablante, y anotar el resultado en `design.md`.
- [ ] 4.3 **Probar con reuniones internas reales** `[reuniones 6.2]`, una de Google Meet y otra de Teams. Se verifica cuando la reunión pasa a «Por revisar» y cada tramo trae el nombre de quien habló.
- [ ] 4.4 **Provocar los fallos reales** `[reuniones 6.3]`: no admitir al bot, y una reunión de Teams que no permita invitados anónimos. Se verifica cuando el motivo se ve en la reunión y llega la alerta al CRM. Si Vexa los reporta con otras palabras, ajustar `motivo_legible` en `core/reuniones/vexa.py`.
- [ ] 4.5 **Medir memoria y CPU por reunión simultánea** `[reuniones 6.5]` y decidir el tamaño definitivo del servidor del bot. Documentarlo en `deploy/ASISTENTE_REUNIONES.md`.

## 5. Asistente de reuniones: fase 3, Zoom

Depende de 4.

- [ ] 5.1 **Registrar la app de Zoom** (Meeting SDK 5.17.5 o posterior) a nombre de la empresa, con OAuth por usuario, y la pantalla para que el ejecutivo conecte su cuenta `[reuniones 7.1]`. Se verifica cuando el token queda guardado cifrado y se puede revocar.
- [ ] 5.2 **Entrada del bot con token OBF** del ejecutivo presente en la reunión `[reuniones 7.2]`. Se verifica con una reunión real de Zoom de otra cuenta.
- [ ] 5.3 **Enviar la app a revisión de Zoom** `[reuniones 7.3]` y anotar el estado y las condiciones de aprobación.
- [ ] 5.4 **Recorrido completo** presencial y virtual en el navegador real `[reuniones 8.1]`. Después, archivar el cambio.

## 6. Porte de Daily Logistics: WMS

Daily Logistics es de solo lectura: no se toca su repositorio ni sus contenedores. Antes y después de cada grupo hay que correr `backend/tools/huella_dl.sh`.

- [ ] 6.1 **Estrategia de picking** y una sola asignación por orden `[porte 3.3]`. Verificar «Bodega en WAVE», «Estrategia no implementada» y «Generar picking dos veces».
- [ ] 6.2 **Pantallas de tareas y picking** `[porte 3.4]`: `WMSFrentes`, `WMSTareas`, `WMSPicking` y `WMSConfig`, con sus componentes.
- [ ] 6.3 **Productos y recepción** `[porte 4.1–4.4]`: subfamilias, imágenes, estados de orden de compra, consecutivos, códigos únicos con altas simultáneas, y rendimiento del inventario con paginación y exportación.
- [ ] 6.4 **Compras y bodega física** `[porte 5.1–5.3]`: cotizaciones con correo, apagado si no hay SMTP, y constructor de bodega con vista en 3D.
- [ ] 6.5 **Canales de venta y consolidación** `[porte 6.1–6.3]`: marketplaces con credenciales por empresa, y consolidación que crea la solicitud de transporte.

## 7. Porte de Daily Logistics: TMS

Depende de 6.5, porque el cargue parte de los consolidados.

- [ ] 7.1 **Capacidad por tipo de vehículo** y sugerencia de vehículo `[porte 7.1–7.2]`.
- [ ] 7.2 **Cargue y plan de carga en 3D** `[porte 7.3–7.4]`.
- [ ] 7.3 **Alta de conductores** sobre las tablas de Gestión humana `[porte 7.5]`, y las pantallas del TMS `[porte 7.6]`.
- [ ] 7.4 **Trazabilidad del viaje** `[porte 8.1–8.3]`: historial, POD por parada sin perder los existentes, estados sin atajos y liquidación con aprobación.
- [ ] 7.5 **Recorrido integral del WMS y el TMS** `[porte 9.1]` con un administrador y con un usuario restringido. Después, archivar el cambio.

## 8. Decisiones pendientes

No son tareas de código: hay que decidirlas antes de que alguien las programe.

- [ ] 8.1 **¿Repositorio privado?** Ahora es público. Hacerlo privado con la cuenta gratuita de GitHub quita la aprobación obligatoria de despliegues; habría que pasar a GitHub Pro o cambiar al despliegue manual con botón.
- [ ] 8.2 **Equivalencias de TarifaX con SICETAC** para TURBO, VANS y MINIMULA. Se cargan desde la pantalla de configuración de vehículos, no desde el repositorio.
- [ ] 8.3 **Segunda ronda de LGE**, el renombre del repositorio y la publicación de la landing definitiva.
- [ ] 8.4 **Qué más traer de Daily Logistics:** el módulo de personal (WFM), la analítica, el entrenamiento o la IA. Hoy las tareas de bodega funcionan con una regla simple de permisos, en `core/personal.py`.
- [ ] 8.5 **Workers que mueren cada 3 o 4 horas** en el servidor viejo, sin resolver. Vigilar si se repite en AWS, que ahora tiene 4 GB de swap.

## Workflow follow-up

- Al cerrar cada cambio de OpenSpec, archivarlo con `openspec archive <cambio>` y revisar que sus specs queden en `openspec/specs/`.
- Antes de empezar a trabajar y antes de cada push: `git pull`, porque hay dos personas trabajando sobre `main`.
