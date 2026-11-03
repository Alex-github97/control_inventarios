# Tasks

Las pruebas del servidor van en `backend/tests/humo_movil.py` y crecen grupo a grupo; las de la app, en `movil/` (Jest) y `movil/e2e/` (Maestro en emulador Android). Todo se compila en Docker o en EAS: no hay Node local.

## 1. Base del repositorio y contrato con el servidor

- [x] 1.1 Crear `compartido/` con `marca.ts`, `i18n/{es,en}.json`, reglas de presentación (vida de llanta, estados de OT, rangos de profundidad) y el cliente `openapi-fetch`; el portal pasa a importar marca y textos desde `@compartido`. Verificar `tsc` del portal con cero errores y que el portal se ve igual (captura antes y después).
- [x] 1.2 Script que vuelca el OpenAPI importando `app.main` y genera `compartido/api/esquema.d.ts` con `openapi-typescript`. Verificar que un campo de prueba agregado a un esquema del servidor aparece en los tipos generados.
- [ ] 1.3 Crear `movil/` con Expo, TypeScript estricto, `expo-router`, lint que prohíbe colores literales fuera de `diseno/`, y el paso en el job `validar` que regenera tipos y compila `compartido/` y `movil/`. Verificar renombrando a propósito un campo que usa la app: el job falla señalando el archivo.
- [x] 1.4 `docs/movil/ADAPTAR.md` con el mapa de pantallas portal ↔ app y la regla de compatibilidad hacia atrás. Verificar que cubre cada módulo del CMMS de la propuesta.

## 2. Sistema de diseño

- [x] 2.1 Tokens (color de marca, Inter con escala, espaciado de 4 pt, radios, elevaciones, duraciones) en claro y oscuro, con contraste AA comprobado por script. Verificar que el script pasa y que cambiar el acento cambia toda la app.
- [ ] 2.2 Componentes base: Botón, Tarjeta, Fila, Lista (flash-list), Campo numérico grande, Hoja inferior, Chip de estado, Indicador, Esqueleto, Gráficos de barras/líneas/torta, Escáner QR; con respuesta háptica, objetivos de 48 dp y etiquetas de accesibilidad. Verificar con pruebas Jest y TalkBack en emulador.
- [ ] 2.3 Pantalla de muestra del sistema (catálogo en claro y oscuro) en una compilación de vista previa para que el usuario valide el nivel visual, el nombre y el ícono antes de construir pantallas. Verificar con la aprobación del usuario registrada en `design.md`.

## 3. Acceso y sesión de dispositivo

- [ ] 3.1 Servidor: tabla `movil_dispositivo`, `POST /movil/sesion` (exige `eam`), `POST /movil/renovar` rotativo, vencimiento a 30 días, revocación y efecto de desactivar el usuario. Verificar en `humo_movil.py` los escenarios de `acceso-dispositivo`, incluido «Empresa sin CMMS» y renovación tras revocar (401).
- [ ] 3.2 App: ingreso con empresa recordada, token de renovación en almacenamiento seguro con biometría, bloqueo a los 15 min en segundo plano y borrado de datos al recibir «revocado». Verificar con Maestro «Volver a la app» y «Teléfono perdido».
- [ ] 3.3 Portal: pestaña «Dispositivos» en Usuarios con revocar. Verificar en navegador que revocar un dispositivo deja la app sin acceso en su siguiente conexión.

## 4. Sincronización

- [ ] 4.1 Servidor: middleware `Idempotency-Key` con `movil_idempotencia` (reserva, respuesta guardada, 409 en curso, 422 si no coincide, purga a 30 días). Verificar en `humo_movil.py` que dos reintentos concurrentes de un cierre de OT con repuesto lo aplican una sola vez.
- [ ] 4.2 Servidor: `GET /movil/sincronizar` por recurso con cursor y tope, y `GET /movil/vigentes`; columna `tecnico_usuario_id` en la OT con su migración de relleno y el selector del portal que la llena. Verificar «Nueva orden asignada» y «Activo dado de baja» y que ninguna respuesta pasa de 5 s con el set de carga del CMMS.
- [ ] 4.3 Revisar que las escrituras de los recursos sincronizados actualicen `updated_at` (incluidos los `UPDATE` con SQL directo) y corregir las que no. Verificar con una prueba por recurso que un cambio aparece en `sincronizar`.
- [ ] 4.4 App: base SQLite con Drizzle, descarga incremental retomable, conciliación de vigentes y estado de sincronización visible. Verificar con Maestro «Abrir una orden sin señal» en modo avión.
- [ ] 4.5 App: cola de operaciones con ids locales, reintento con espera creciente, rechazos con el mensaje del servidor y cola aparte de fotos comprimidas. Verificar con Jest (ids locales, rechazo, reintento) y con Maestro «Se corta la señal al enviar» y «Orden cerrada por otro».

## 5. Distribución

- [ ] 5.1 Servidor: `movil_version`, `GET /movil/version`, `GET /movil/descarga` con sesión y `eam`, y respuesta 426 por `X-App-Version` menor que `MOVIL_VERSION_MINIMA`. Verificar «Enlace sin sesión», «Empresa sin CMMS» y «Cambio incompatible en el servidor» en `humo_movil.py`.
- [ ] 5.2 `deploy/recibir_apk.sh` y la llave restringida, y el flujo de GitHub Actions por etiqueta `movil-v*` (EAS Build → servidor). Verificar publicando una versión de prueba y descargándola desde el portal.
- [ ] 5.3 EAS Update con `runtimeVersion` por huella en el canal `produccion`. Verificar que una corrección de pantalla llega a un teléfono instalado sin APK nuevo, y que instalar un APK nuevo conserva sesión y cola.
- [ ] 5.4 Portal: acceso «App móvil» con versión, notas, descarga, QR y pasos de instalación, visible solo con `eam`. Verificar en navegador con una empresa con y sin CMMS.

## 6. Fase 1 · Campo

- [ ] 6.1 Torre de control móvil y ficha del activo (búsqueda, lista, QR). Verificar con Maestro «Inicio del turno» y «Encontrar un activo por su placa QR».
- [ ] 6.2 Órdenes de trabajo completas: crear con fotos, iniciar, pausar, horas, repuestos, notas, falla/causa/solución, firma y cierre con medidor. Verificar con Maestro «Cerrar una orden en el taller», «Odómetro menor que el anterior» y «Reportar una falla desde la vía», y que la orden se ve igual en el portal.
- [ ] 6.3 Checklists con todos los tipos de ítem, no conformes con foto y hallazgos críticos. Verificar «Preoperacional con hallazgo crítico».
- [ ] 6.4 Medidores y tanqueos. Verificar «Tanqueo» y que el rendimiento coincide con el portal.

## 7. Fase 1 · Llantas y supervisión

- [ ] 7.1 Inspección sobre el esquema del vehículo con colores por rango configurado, validaciones surco por surco, novedades y sugerencias. Verificar «Recorrer un tractocamión», «Profundidad que sube» y «Desgaste irregular».
- [ ] 7.2 Movimientos de llantas (montaje, desmontaje, rotación, envío a reencauche). Verificar «Rotar dos llantas».
- [ ] 7.3 Tablero del CMMS, asignar y aprobar, alertas. Verificar «Mismos números que el portal» con una prueba de paridad por indicador, «Aprobar desde la vía» y «Rechazo sin motivo».
- [ ] 7.4 Rendimiento y calidad de la fase 1: arranque en frío menor de 2 s y listas de 2.000 filas a 60 fps en un emulador de gama media, contraste AA y TalkBack en las pantallas principales. Verificar con el perfilador y dejar las cifras en `docs/movil/`.
- [ ] 7.5 Publicar la versión 1.0 por el flujo de la tarea 5.2 y recorrer con Maestro, de punta a punta y con un tramo en modo avión, un turno completo: ingresar, sincronizar, cerrar una orden, ejecutar un checklist, inspeccionar un vehículo y aprobar desde supervisor.

## 8. Fase 2 · Módulos complementarios y notificaciones

- [ ] 8.1 Lubricación: toma de muestra con etiqueta escaneada, rutas y diagnóstico. Verificar «Toma de muestra en ruta».
- [ ] 8.2 Inventario: existencias por bodega, salidas a OT y conteos. Verificar «Conteo cíclico».
- [ ] 8.3 Garantías (consulta y reclamo con fotos) y planes de mantenimiento con su próxima ejecución. Verificar «Próximo preventivo».
- [ ] 8.4 Confiabilidad, IA e informes en consulta, con PDF para abrir y compartir. Verificar «Compartir un informe» y la paridad de valores con el portal.
- [ ] 8.5 Notificaciones push: `movil_push_token`, envío en segundo plano por eventos y preferencias del usuario. Verificar «Orden asignada» en un teléfono real.

## Workflow follow-up

- Cuentas del usuario: Expo (para EAS Build y Update) y, para la fase 2, un proyecto de Firebase para FCM.
- Publicar cada fase con la aprobación del despliegue y anunciar la descarga en el portal.
- Archivar el cambio cuando el usuario haya validado las dos fases.
