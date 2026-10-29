# Proposal

## Why

Con la empresa de prueba `carga` (3.000 equipos, 7,1 millones de filas del CMMS) varias pantallas tardaban entre 15 segundos y varios minutos, una daba error 500, y abrir las cargas de lubricación tumbó los tres procesos del backend en producción.

La causa del último caso es concreta. En la versión de uvicorn que usamos (0.32), el proceso principal pregunta a cada proceso, cada pocos segundos, si sigue vivo. El que no contesta en 5 segundos se da por colgado y se mata, y ese plazo no se puede configurar. Una respuesta de decenas de miles de filas ocupa el proceso más de 5 segundos seguidos, así que una sola pantalla abierta deja sin servicio a todos los usuarios de todas las empresas. Es, con mucha probabilidad, el «los workers mueren cada 3-4 horas» que estaba sin resolver.

Los patrones que lo producen se repiten en toda la plataforma:
- traer tablas completas a Python para quedarse con unas pocas filas;
- hacer una consulta por cada fila;
- recorrer toda la historia por cada equipo;
- devolver listas sin tope.

## What Changes

- **Las listas que crecen sin tope van por trozos.** Reciben `limite` y `desplazamiento`, y mandan el total en la cabecera `X-Total-Count`, con la misma convención que ya usaba contabilidad (`erp._pagina`). El cuerpo sigue siendo un arreglo, así que quien consumía la ruta como lista sigue funcionando. Donde la pantalla dependía de la lista entera, el tope por defecto se fija para no romperla, y la pantalla pasa a pedir por páginas.
- **La base de datos hace el trabajo:**
  - uniones y agregados en lugar de una consulta por fila;
  - LATERAL para «la última de cada una»;
  - columnas en lugar de objetos ORM completos donde son cientos de miles.
- **Índices** para las búsquedas por llanta y fecha, y por fecha de carga de lubricación, creados en el arranque dentro del candado de migraciones.
- **El cálculo pesado que no cabe en SQL corre en un hilo aparte** (`asyncio.to_thread`): la analítica de llantas y la predicción de fallas.
- **La predicción de fallas entrena con una muestra fija** cuando la historia pasa de 60.000 fotos: misma semilla, mismo resultado cada vez.
- **Pantallas:** en llantas, la consulta general, el descarte, la bitácora y los indicadores filtran y paginan en el servidor. El detalle por vida del rendimiento también. Las exportaciones llevan todo lo filtrado, hasta 20.000 filas.

## Capabilities

### New Capabilities

- `plataforma/consultas-con-volumen`: cómo debe responder una consulta de la API cuando la empresa tiene volumen de datos de años: tiempo, tamaño y forma de paginar.

### Modified Capabilities

Ninguna con spec escrita: las rutas tocadas no tienen specs en `openspec/specs`.

## Impact

- Backend:
  - `app/core/paginacion.py` (nuevo);
  - `eam.py`, `eam_neumaticos_informes.py`, `eam_analitica.py`, `combustible.py` y `lubricacion_operacion.py`;
  - los índices en `main._migrar_esquema`.
- Frontend:
  - `utils/paginaServidor.ts` (nuevo);
  - `EAMNeumaticos.tsx`, `RendimientoLlantas.tsx`, `EAMOrdenesTrabajo.tsx` y `EAMPlanesMant.tsx`.
- Contrato de la API: rutas que antes devolvían todo aceptan `limite` y `desplazamiento`. Las de lubricación (cargas), últimas inspecciones, descarte, bitácora y detalle por vida aplican un tope por defecto, y quien las use sin paginar recibe el primer trozo, con el total en la cabecera.
- Fuera de alcance de esta entrega: las rutas de otros módulos que el barrido marcó (ver `tasks.md`, grupo 4). No hay datos masivos de esos módulos para medirlas.
