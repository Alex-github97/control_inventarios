# Tasks

## 1. Precios fuera de la landing principal

- [x] 1.1 Quitar de `frontend/landing/index.html` la sección `#tarifas` (planes, unidades, desglose y ejemplos de cuenta) y su CSS (`.planes`, `.plan`, `.unidades`, `.unidad`, `.desglose`, ejemplos de cuenta). Verificar que `grep -n -i -E "tarifas|\$[0-9]|/mes" frontend/landing/index.html` no devuelve nada de precios.
- [x] 1.2 Quitar los enlaces "Tarifas" de la barra y el pie, ajustar la frase "ni en el menú, ni en el precio" y apuntar a `#contacto` los botones que iban a tarifas. Verificar que no queda ningún `#tarifas` en `index.html`.

## 2. Precios fuera de las páginas de módulo y del generador

- [x] 2.1 En `frontend/landing-generador/generar.py`, eliminar la plantilla `PRECIO` y su CSS `.precio`, cambiar "Cuánto cuesta" por "Solicítelo" y `/#tarifas` por `/#contacto`, y quitar el enlace "Tarifas" del pie. En `catalogo.py`, retirar las claves `cobro` que ya no se usan. Verificar que el generador corre sin errores.
- [x] 2.2 Regenerar las 17 páginas de `frontend/landing/modulos/` con el generador y revisar el diff. Verificar que `grep -rn -i -E "tarifas|precio|cuánto cuesta" frontend/landing/modulos` solo devuelve el nombre del módulo TarifaX.

## 3. Contenido editable sin tarifas

- [x] 3.1 En `backend/app/api/v1/endpoints/landing.py`, ajustar `CONTENIDO_INICIAL` (frase del precio) y hacer que `GET /landing/contenido` filtre las claves `tarifas_*`. Verificar con una prueba unitaria que la respuesta no trae esas claves aunque estén guardadas.
- [x] 3.2 En el arranque (`backend/app/main.py`), eliminar una sola vez las claves `tarifas_*` de la fila de `plataforma_landing`. Verificar que al arrancar dos veces no falla y la fila queda sin esas claves.

## 4. Registro de prospectos en el backend

- [x] 4.1 Crear el modelo `LandingProspecto` (`public.landing_prospecto`, sin llaves foráneas) y registrarlo para que `create_all` lo cree. Verificar que al arrancar el backend la tabla existe en `public`.
- [x] 4.2 Agregar `POST /landing/contacto` (público): validación de campos y longitudes, campo trampa `sitio_web` y límite de 5 envíos por IP por hora contado en la tabla. Verificar con pruebas que cubren el envío correcto (201), un campo faltante (400), un texto demasiado largo (400), el campo trampa (201 sin fila guardada) y el límite por IP (429).
- [x] 4.3 Agregar `GET /soporte/prospectos` (`soporte.ver`) y `PUT /soporte/prospectos/{id}` (`soporte.atender`, estados NUEVO/CONTACTADO/DESCARTADO, guarda `atendido_por` y `atendido_en`). Verificar con pruebas el listado y su filtro, el 403 sin permiso y el 400 con un estado inválido.

## 5. Formulario en la landing

- [x] 5.1 Reemplazar el botón `mailto:` de `#contacto` por un formulario (nombre, correo, empresa, teléfono, mensaje y campo trampa oculto) que envíe a `/api/v1/landing/contacto` y muestre confirmación o error en línea. Conservar "Ya soy cliente · Ingresar" y ajustar el script de `#botonCorreo`. Verificar en el navegador que un envío válido muestra la confirmación y crea la fila, y que un envío inválido muestra el error.

## 6. Vista Prospectos en la consola

- [x] 6.1 Agregar a `soporteApi` en `frontend/src/admin/api.ts` las llamadas `prospectos(estado?)` y `cambiarEstadoProspecto(id, estado)` con su tipo. Verificar que `npm run build` compila.
- [x] 6.2 Agregar la pestaña "Prospectos" a `VISTAS` en `frontend/src/admin/Soporte.tsx`, con la tabla de solicitudes, el filtro por estado y el selector de estado. Verificar en la consola que la lista carga y que cambiar un estado se refleja al recargar.

## 7. Verificación integral

- [x] 7.1 Compilar el frontend (`npm run build` y la compilación de la consola) y correr las pruebas del backend relacionadas. Verificar que todo pasa.
- [x] 7.2 Recorrer la landing y dos páginas de módulo: no hay precios, todos los "Solicítelo" llevan a `#contacto`, y una solicitud enviada aparece en la vista Prospectos.

## Workflow follow-up

- Abrir un pull request a `main` para que el dueño del repositorio lo revise y apruebe.
- Archivar el cambio una vez aprobado y desplegado.
