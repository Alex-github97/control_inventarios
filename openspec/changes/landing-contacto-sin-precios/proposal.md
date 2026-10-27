# Proposal

## Why

La página pública (`tittanware.com`) publica tarifas, planes y ejemplos de cuenta con cifras, y la decisión comercial es dejar de mostrar precios: cada cotización se conversa. Hoy el único canal de contacto es un enlace `mailto:`, que no deja registro y obliga al visitante a tener un cliente de correo configurado; las solicitudes de quien todavía no es cliente se pierden fuera del sistema.

## What Changes

- **BREAKING (contenido público):** se elimina la sección `#tarifas` de la landing (planes, unidades, tabla de desglose, ejemplos de cuenta) y su CSS, junto con los enlaces "Tarifas" de la barra y el pie.
- Se quitan las menciones a precio y costo de cobro en las 17 páginas de módulo (`frontend/landing/modulos/*.html`): el bloque de precio, "Cuánto cuesta", "Ver las tarifas" y "Ver todas las tarifas".
- El generador de esas páginas (`frontend/landing-generador/`) deja de producir el bloque de precio, para que regenerarlas no devuelva las cifras.
- Todo enlace o botón que apuntaba a `#tarifas` apunta a `#contacto`. El texto "Cuánto cuesta" pasa a "Solicítelo".
- Se ajusta el contenido por defecto de la landing en el backend (la frase "ni en el menú, ni en el precio") y se limpia el texto de tarifas que la consola haya publicado en la base.
- En `#contacto` un formulario reemplaza el `mailto:`.
- Nuevo endpoint público para recibir esas solicitudes, con protección contra spam: campo trampa, límite de envíos por IP y validación de campos.
- Nueva tabla de prospectos en el esquema `public`, independiente de los clientes registrados y de los tickets de soporte.
- Nueva vista "Prospectos" dentro de la cola de soporte de la consola de administración, para ver las solicitudes y cambiar su estado (Nuevo, Contactado, Descartado).
- Quien ya es cliente y tiene sesión sigue usando el flujo de tickets de su empresa. El formulario público es para quien no es cliente.

## Capabilities

### New Capabilities
- `landing-publica`: qué muestra y qué no muestra la página pública y sus páginas de módulo, incluida la ausencia de precios y a dónde llevan sus llamados a la acción.
- `contacto-prospectos`: recepción de solicitudes de contacto de no clientes desde la landing, su almacenamiento separado de los clientes y su atención desde la consola de soporte.

### Modified Capabilities
<!-- No hay specs existentes en openspec/specs/. -->

## Impact

- **Frontend público:** `frontend/landing/index.html`, `frontend/landing/modulos/*.html` (17 páginas), `frontend/landing-generador/generar.py` y `catalogo.py`.
- **Backend:** `backend/app/api/v1/endpoints/landing.py` (contenido por defecto y endpoint nuevo), un modelo nuevo en `backend/app/infrastructure/models/` en el esquema `public`, que crea `create_all` al arrancar, y endpoints de consola protegidos con `soporte.ver` y `soporte.atender`.
- **Consola de administración:** `frontend/src/admin/Soporte.tsx` (pestaña nueva) y `frontend/src/admin/api.ts`.
- **Datos:** el contenido de landing guardado en `plataforma_landing` puede conservar textos de tarifas; hay que limpiarlo.
- **Infraestructura:** ninguna. nginx ya reenvía `/api/` desde `tittanware.com` al backend en el mismo origen.
