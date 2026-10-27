# Design

## Context

- La landing es HTML estático (`frontend/landing/index.html`) servido por nginx en `tittanware.com`. Sus textos editables se piden a `GET /api/v1/landing/contenido`, en el mismo origen. El nginx de la landing ya reenvía `/api/` al backend, así que un `POST` desde el formulario no necesita CORS.
- Las 17 páginas de `frontend/landing/modulos/` las produce `frontend/landing-generador/generar.py` a partir de `catalogo.py`. El bloque `PRECIO` y los enlaces a `/#tarifas` salen de plantillas del generador.
- El esquema `public` no se versiona con Alembic: las tablas de plataforma (`soporte_ticket`, `plataforma_cliente`, `plataforma_landing`) las crea `create_all` al arrancar (`backend/app/main.py`), y las columnas nuevas se agregan con `ALTER TABLE ... IF NOT EXISTS` en el mismo arranque.
- La cola de soporte de la consola está en `frontend/src/admin/Soporte.tsx`, con pestañas `VISTAS`. Sus llamadas a la API van en `soporteApi` dentro de `frontend/src/admin/api.ts`. Los permisos se exigen con `exigir("soporte.ver")` y `exigir("soporte.atender")`.
- El backend corre con varios workers: el estado en memoria del proceso no es confiable, como ya se vio con `scan_sesion`.

## Goals / Non-Goals

**Goals:**
- Que nunca vuelvan a aparecer precios, ni al editar a mano ni al regenerar las páginas de módulo.
- Recibir y atender solicitudes de no clientes sin tocar el modelo de clientes ni el de tickets.

**Non-Goals:**
- Notificar por correo cada solicitud nueva (no hay SMTP configurado en el proyecto). Se puede agregar después.
- Convertir un prospecto en cliente o en contacto del CRM desde la consola.
- CAPTCHA de terceros.

## Decisions

### Tabla `public.landing_prospecto` creada por `create_all`
Modelo `LandingProspecto` con `__table_args__ = {"schema": ESQUEMA_PLATAFORMA}`, igual que `SoporteTicket`. Columnas: `id`, `nombre`, `correo`, `empresa`, `telefono`, `mensaje`, `origen` (la página desde la que se envió), `ip`, `user_agent`, `estado` (`NUEVO`/`CONTACTADO`/`DESCARTADO`), `atendido_por`, `atendido_en`, y las marcas de `TimestampMixin`. No tiene llaves foráneas.
- *Alternativa descartada:* una migración Alembic. Las tablas de `public` no se versionan así en este proyecto; mezclar los dos mecanismos para una sola tabla confunde más de lo que ayuda.
- *Alternativa descartada:* una base de datos aparte. El usuario eligió el esquema `public`.

### Endpoint público `POST /api/v1/landing/contacto` en `landing.py`
Vive junto a `GET /landing/contenido`, que ya es público. No exige sesión.
- Validación con Pydantic: `EmailStr` para el correo, longitudes máximas (nombre 160, correo 200, empresa 200, teléfono 40, mensaje 4000) y texto recortado.
- **Campo trampa** `sitio_web`: va oculto en el formulario. Si llega relleno, se responde `201` y no se guarda nada, para no darle pistas al bot.
- **Límite por IP en base de datos:** se cuentan las filas de `landing_prospecto` de esa IP en la última hora. Con 5 o más, se responde `429`. La IP se toma como en `auth._ip` (última entrada de `X-Forwarded-For`). Contar en la tabla funciona igual con varios workers y no agrega dependencias.
- *Alternativa descartada:* `slowapi` o un limitador en memoria, que por worker no sirve.
- *Alternativa descartada:* `limit_req` en nginx. Sería válido, pero mueve la regla a la infraestructura y la deja sin pruebas en el backend.

### Endpoints de consola en `soporte.py`
- `GET /soporte/prospectos?estado=` con `exigir("soporte.ver")`, del más reciente al más antiguo y con un tope de 500 filas.
- `PUT /soporte/prospectos/{id}` con `exigir("soporte.atender")`. Recibe `{estado}`, valida que sea uno de los tres y guarda `atendido_por` y `atendido_en`.
- Se ubican en el router de soporte porque la vista vive en la cola de soporte y comparte sus permisos.

### Formulario sin framework en `index.html`
`#contacto` conserva su texto y el botón "Ya soy cliente · Ingresar" (el camino del cliente con sesión). El botón `mailto:` se reemplaza por un `<form>` con `fetch('/api/v1/landing/contacto')` y mensajes en línea de éxito o error. El script que hoy arma el `mailto:` (`#botonCorreo`) se ajusta. `#correoPie` sigue mostrando el correo, que es útil como dato de contacto.

### Precios fuera del generador
En `generar.py` se elimina la plantilla `PRECIO` y su uso. "Cuánto cuesta" pasa a "Solicítelo" y los `/#tarifas` pasan a `/#contacto`. Luego se regeneran las 17 páginas con el generador, en lugar de editarlas a mano, para que la fuente y el resultado coincidan. Las claves `cobro` de `catalogo.py` dejan de usarse y se retiran.

### Limpieza del contenido publicado
`GET /landing/contenido` filtra las claves que empiezan por `tarifas_` antes de responder. Además, al arrancar se eliminan una sola vez de la fila de `plataforma_landing`. Así, si alguien vuelve a publicar un contenido viejo desde la consola, tampoco reaparece.

## Risks / Trade-offs

- [Un bot rota IPs y salta el límite] → El campo trampa filtra lo básico. Si aparece abuso real, se agrega `limit_req` en nginx o un CAPTCHA.
- [Detrás de un proxy distinto, `X-Forwarded-For` podría no traer la IP real] → Se usa la misma regla que el login, que ya está probada en este despliegue.
- [Guardar IP y user agent son datos personales] → Solo se usan para el límite antiservicio. La retención puede definirse más adelante.
- [Regenerar las páginas de módulo podría traer otros cambios de contenido no publicados] → Se revisa el diff de las 17 páginas antes de hacer commit.

## Migration Plan

1. Desplegar el backend: `create_all` crea `landing_prospecto` y el arranque limpia las claves `tarifas_*`.
2. Desplegar el frontend (landing y consola).
3. Para revertir: volver al commit anterior. La tabla nueva puede quedarse vacía sin afectar nada.
