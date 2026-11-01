# Proposal

## Why

El submódulo de llantas registra bien la operación, pero la muestra a medias. La pila de descarte es una lista sin análisis: no dice por qué se botan las llantas ni de qué marca o referencia son. El tablero de rendimiento compara una categoría a la vez, sin el índice de reencauche ni filtros por fecha de fabricación. Y no hay un informe que se le pueda entregar al cliente de la flota con el estado de sus llantas, que es lo que se pide después de cada jornada de inspección.

## What Changes

- **Tablero de la pila de descarte**: cuántas llantas se dieron de baja, por motivo de daño (del catálogo de daños que se configura en *Configuración* de llantas) y por motivo de fin de vida, con el recuento de daños por marca y por referencia, la evolución en el tiempo y el índice de reencauche (I.R.) de lo descartado.
- **Índice de reencauche (I.R.)**: promedio de reencauches de un grupo de llantas (nueva = 0, primer reencauche = 1, segundo = 2…). Se muestra en el tablero de descarte y, para las llantas montadas (**a piso**), en el tablero general.
- **Tablero general ampliado**: los indicadores que hoy se ven por marca se ven también **por referencia y por dimensión**, al mismo tiempo, junto con el I.R. a piso.
- **Filtros comunes** en los dos tableros: marca, referencia, dimensión, **año y semana de fabricación**, tomados del DOT. El DOT se interpreta al guardarse la llanta, y las llantas existentes se interpretan una vez.
- **Histórico de la llanta** con el número de inspecciones y de rotaciones realizadas en total y en la vida actual.
- **Informe PDF del estado de la flota**:
  - empieza con un **resumen ejecutivo** de la última inspección de cada vehículo: vehículos, llantas, marcas, dimensiones y tipos de vehículo inspeccionados, cantidad de novedades y porcentaje por tipo de novedad;
  - sigue con el **esquema de llantas de cada vehículo** y, al lado, una tabla por posición con sus profundidades;
  - cierra con **sugerencias generadas automáticamente**.
- **Sugerencias configurables**: un catálogo de reglas, cada una con su condición y su texto, que se evalúan sobre la última inspección. La primera versión se siembra con las reglas que ya usan las alertas (profundidad mínima, presión fuera de rango, desalineación entre duales). Las reglas definitivas se cargarán de los documentos que el usuario va a entregar.

Decisión para revisar: las **novedades** del informe se derivan de la inspección con las reglas actuales (profundidad bajo el mínimo, presión fuera de rango, desalineación y estado visual regular o crítico). Hoy la inspección no registra daños del catálogo. Si se quiere que el inspector marque daños en cada llanta, hay que ampliar la captura de la inspección, y eso queda fuera de este cambio.

## Capabilities

### New Capabilities
- `eam/neumaticos-descarte-tablero`: análisis de la pila de descarte por motivo de daño, motivo de fin de vida, marca y referencia, con su I.R.
- `eam/neumaticos-tablero-general`: indicadores de llantas por marca, referencia y dimensión, con el I.R. a piso.
- `eam/neumaticos-filtros-fabricacion`: interpretación del DOT y filtros por marca, referencia, dimensión, año y semana de fabricación, comunes a los tableros.
- `eam/neumaticos-historial`: conteo de inspecciones y rotaciones en el histórico de cada llanta.
- `eam/neumaticos-informe-flota`: informe PDF con resumen ejecutivo, esquema por vehículo y tabla por posición.
- `eam/neumaticos-sugerencias`: reglas configurables que generan sugerencias a partir de la última inspección.

### Modified Capabilities
(ninguna: `openspec/specs/` todavía no tiene capacidades publicadas)

## Impact

- **Backend**:
  - Rutas nuevas en `eam_neumaticos_informes.py`: tablero de descarte, tablero general, informe de flota y sugerencias.
  - En `eam.py`: el conteo en el histórico y la interpretación del DOT al crear o editar una llanta.
  - Columnas `dot_anio` y `dot_semana` en `eam_neumatico`, con índices y relleno dentro del candado de `main._migrar_esquema`.
  - Tablas nuevas para las reglas de sugerencia.
  - El PDF se arma en el servidor con `fpdf2`, que ya es dependencia.
- **Frontend**: `EAMNeumaticos.tsx` (pestaña Descarte con su tablero e histórico de la llanta), `EAMNeumaticosReportes.tsx` y `RendimientoLlantas.tsx` (tablero general), y Configuración de llantas (reglas de sugerencia). El PDF del navegador `reporteFlotaPDF.ts` queda reemplazado por el del servidor.
- **Rendimiento**: todo agregado en SQL y paginado, siguiendo `consultas-con-volumen`. La empresa `carga` (96 mil llantas y 63 mil bajas) es la prueba.
