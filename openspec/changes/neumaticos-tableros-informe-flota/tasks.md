# Tasks

Cada respuesta nueva se comprueba contra la empresa `carga` (96 mil llantas, 63 mil bajas) con los guiones de medición de `consultas-con-volumen`. Las pruebas de navegador van en `frontend/tools/probar_neumaticos_tableros.cjs`, con `ci-auditor`.

## 1. Base: DOT, filtros e I.R.

- [x] 1.1 Función `interpretar_dot` y columnas `dot_semana`/`dot_anio` en `eam_neumatico`, con índice y relleno en SQL dentro del candado de `_migrar_esquema`, recalculadas al crear o editar una llanta. Verificar con pruebas unitarias los escenarios «DOT válido», «DOT inválido» y «Corregir un DOT», y en `carga` contar cuántas quedaron «Sin DOT válido».
- [x] 1.2 `core/neumaticos_filtros.py`: filtro común (marca, referencia, dimensión, año y semana de fabricación en listas, periodo) y `GET /eam/neumaticos/reportes/opciones-filtro`, con referencias acotadas a las marcas elegidas. Verificar «Referencias según la marca» y «Llantas sin DOT».
- [x] 1.3 Definición del I.R. (a piso y descarte) como agregado SQL. Verificar el escenario «Cálculo del I.R.» con datos construidos a mano, y en `carga` comparar `reencauches` contra las vidas registradas, reportando las diferencias si las hay.

## 2. Tablero de la pila de descarte

- [x] 2.1 `GET /eam/neumaticos/reportes/descarte`: reparto por daño (con «Sin motivo registrado») y por motivo de fin de vida, cruces marca × daño y referencia × daño, I.R. con distribución y serie mensual, con el filtro común. Verificar en pruebas «Reparto por motivo», «Dos catálogos», «Marca con más cortes» y «Tendencia mensual», y en `carga` que responde en menos de 3 s sin reiniciar procesos.
- [x] 2.2 La lista `GET /eam/neumaticos/descarte` acepta el filtro común, `dano_id` y `motivo_fin_vida_id`. Verificar «Ver las llantas de un motivo»: el total de la lista coincide con el del tablero.
- [x] 2.3 Tablero en la pestaña Descarte de `EAMNeumaticos.tsx`, encima de la lista, con filtros, gráficos y salto a la lista. Verificar en navegador con `carga` que «Motivo nuevo en configuración» aparece sin recargar código, y que `tsc` termina sin errores.

## 3. Tablero general

- [x] 3.1 `rendimiento` acepta `dimensiones=marca,referencia,medida` y el filtro común, y rotula la referencia «Marca · Referencia». Verificar que sin el parámetro responde igual que hoy (comparando con `comparar.py`) y el escenario «Referencias con el mismo nombre en dos marcas».
- [x] 3.2 `GET /eam/neumaticos/reportes/parque`: llantas montadas, profundidad promedio y bajo el mínimo por marca, referencia y dimensión, más el I.R. a piso con su distribución. Verificar «Flota con llantas reencauchadas», «Llantas en bodega no cuentan» y «Dimensión con llantas bajo el mínimo».
- [x] 3.3 `TableroRendimiento` con tres paneles visibles (marca, referencia, dimensión), el I.R. a piso, el parque montado y los filtros comunes. Verificar en navegador «Abrir el tablero» y «Filtrar por dimensión».

## 4. Histórico de la llanta

- [x] 4.1 `GET /eam/neumaticos/{nid}/resumen-historial` con conteos de inspecciones, rotaciones y volteos, totales y de la vida actual, con la fecha de la última de cada uno. Verificar «Llanta con historia», «Llanta nueva sin movimientos», «Rotaciones y volteos» y «Desmontaje y montaje».
- [x] 4.2 Encabezado del histórico con los conteos, que al pulsarlos filtran el detalle. Verificar en navegador «Ver las rotaciones».

## 5. Novedades y sugerencias

- [x] 5.1 Umbrales nuevos en `eam_neumatico_config` (margen de alerta de profundidad y diferencia entre hombros) y `core/neumaticos_novedades.py` con los seis tipos de novedad sobre la última inspección. Verificar en pruebas «Llanta con dos novedades» y que las tres novedades heredadas coinciden con `/eam/neumaticos/alertas` en `carga`.
- [x] 5.2 Tablas de reglas y condiciones, lista cerrada de campos y operadores, evaluación con marcadores en el texto y siembra de las tres reglas iniciales. Verificar «Crear una regla», «Regla sobre el par dual», «Empresa nueva» y que una condición con un campo desconocido se rechaza al guardar.
- [x] 5.3 CRUD de reglas en Configuración de llantas, con editor de condiciones y vista previa de cuántas llantas la cumplen. Sugerencias en la vista del vehículo, con su regla y los valores que la dispararon. Verificar en navegador «Desactivar una regla» y «Por qué se sugirió».

## 6. Informe PDF de flota

- [x] 6.1 `core/informe_flota_pdf.py` con `fpdf2`: resumen ejecutivo, página por vehículo con esquema (portado de `dibujarEsquema`) y tabla por posición, sugerencias, logo, pie y numeración. Verificar generando el PDF de 5 vehículos de `demoflota` y revisando visualmente cada sección contra «Resumen de una jornada», «Tractocamión de tres ejes», «Llanta sin inspección en el periodo» y «Pie de página».
- [x] 6.2 `POST /eam/neumaticos/reportes/informe-flota` con el alcance (toda la flota, vehículos o filtros). Hasta 200 vehículos responde el PDF directo; con más, encola en la tabla de trabajos (`SKIP LOCKED`) y ofrece consulta de estado y descarga. Verificar «Flota de 3.000 vehículos» en `carga`: ningún proceso se reinicia (`docker logs`) y otro usuario sigue navegando mientras se genera.
- [x] 6.3 Botón de informe en `EAMNeumaticosReportes.tsx` con el alcance y el aviso de «preparando», y retiro de `reporteFlotaPDF.ts`. Verificar en navegador la descarga de un informe chico y de uno encolado, y que `tsc` no deja referencias rotas.

## 7. Integración

- [ ] 7.1 Recorrido en navegador con `carga`: filtros de fabricación en los dos tableros, salto del tablero de descarte a la lista, histórico de una llanta, regla nueva visible en el vehículo y en el informe. Verificar con `probar_neumaticos_tableros.cjs`, sin errores de página ni de API y sin respuestas de más de 5 s.
  - 2026-11-01, local con `carga`: todo el recorrido funcional pasa (26 comprobaciones; también `probar_neumaticos_paginas.cjs`), sin errores de página. Queda abierta por el criterio de tiempo: `GET /reportes/rendimiento` tarda 11-14 s porque carga todas las vidas y montajes de la flota (cálculo que ya existía; corre en un hilo y no tumba procesos). Un 503 aislado fue un corte de Redis de sesiones en el entorno local.

## Workflow follow-up

- Cargar las reglas definitivas de sugerencia cuando el usuario entregue los documentos (configuración, sin código).
- Desplegar con la aprobación de GitHub y medir en producción con `carga`.
- Archivar el cambio después de la revisión del usuario.
