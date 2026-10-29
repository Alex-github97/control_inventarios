# Tasks

Cada optimización se verificó comparando la respuesta contra la versión anterior del backend corriendo al lado (puerto 8001), sobre la empresa `carga`, con los mismos parámetros.

## 1. Base

- [x] 1.1 `app/core/paginacion.py`: `contar`, `poner_total` y `pagina`, con la convención de `erp._pagina` (`X-Total-Count`, `X-Limite`, `X-Desplazamiento`, expuestas al navegador).
- [x] 1.2 `frontend/src/utils/paginaServidor.ts`: `pedirPagina` (filas + total de la cabecera) y `useRetardado`, para no consultar con cada tecla.
- [x] 1.3 Índices de llantas (`inspeccion`, `movimiento`, `vida` y `neumatico` por llanta, fecha, estado o activo) y de cargas de lubricación por fecha, en `main._migrar_esquema`, dentro del candado.

## 2. CMMS: lo que tumbaba el servidor o daba error

- [x] 2.1 `GET /eam/lube/cargas`: una consulta con producto, motivo y rellenos, por trozos. Pasa de más de 180 s, cuando la prueba se cortaba, a 0,35 s.
- [x] 2.2 `GET /eam/neumaticos/inspecciones/ultimas`: el orden por la fecha máxima sale del índice y el detalle va por LATERAL solo para la página. Daba 500 y ahora responde en 1 s por cada 1.000 llantas.
- [x] 2.3 `GET /eam/neumaticos/reportes/estado-flota`: LATERAL de la última inspección del periodo, columnas en lugar de ORM y diccionarios en lugar de modelos. Pasa de 31 s a 5 s.
- [x] 2.4 `GET /eam/neumaticos/movimientos`: UNION de movimientos y altas, filtrada, ordenada y cortada en la base, con búsqueda en el servidor. Pasa de 14-25 s a 0,4 s.
- [x] 2.5 `GET /eam/combustible/rendimiento`: suma por vehículo en la base. Pasa de 20 s a 1 s.
- [x] 2.6 `GET /eam/neumaticos` (filtros `sin_baja`, `ubicacion`, `busqueda` y trozos opcionales) y `GET /eam/neumaticos/descarte` (por trozos).
- [x] 2.7 `GET /eam/neumaticos/indicadores`: ajustes en la misma consulta, por trozos y con búsqueda.
- [x] 2.8 `GET /eam/planes/cumplimiento?con_detalle=false`: sin repetir tareas y repuestos por cada activo cubierto. Pasa de 19 MB a 7,7 MB.
- [x] 2.9 Rendimiento de llantas: columnas en lugar de ORM y cálculo en un hilo. `rendimiento/vidas` va por trozos y con búsqueda; entero eran 230 mil vidas.
- [x] 2.10 Analítica: órdenes indexadas por equipo y el inicio de su observación calculado una vez. Antes había 300 millones de comparaciones. La predicción usa búsquedas binarias, una muestra fija sobre 60.000 fotos y un hilo; anomalías y Weibull leen solo las columnas que usan.
- [x] 2.11 Pantallas de llantas: consulta general, descarte, bitácora e indicadores paginados en el servidor. Las exportaciones llevan todo lo filtrado, hasta 20.000 filas. Órdenes de trabajo y planes toman el detalle de la rutina de `/planes`.
- [x] 2.12 Medir todas las rutas GET del CMMS (132) contra `carga`. La medición encontró las del grupo 2.13.
- [x] 2.13 Lo que encontró la medición:
  - `referencias-profundidad` sin vehículo: 209 s; ahora va por trozos.
  - Tablero de interpretación de lubricación: reparaciones resueltas en memoria (antes, una consulta por muestra), cálculo en un hilo, paginado y con filtro por estado en el servidor. Pasa de 22 s a 3 s; con 5 años eran 83 MB.
  - Dispersión: columnas, y hasta 3.000 puntos por parámetro, siempre con todos los fuera de rango; la recta y las cifras se calculan con todos.
  - Pendientes de lubricación: un agregado en lugar de dos consultas por carga. Pasa de 8 s a 0,8 s.
  - Extensión de vida: pasa de 10 s a 3 s.
  - Confiabilidad (indicadores, Pareto, criticidad) y reportes del CMMS: órdenes como columnas. Cada uno es de 4 a 10 veces más rápido.
  - Alertas de combustible: pasan de 5,7 s a 2,9 s.
  - Reportes planos (órdenes, mano de obra, repuestos): por páginas, con el Excel completo hasta 20.000 filas.
- [x] 2.14 Listas por id con `= ANY(:arreglo)` (`app/core/consultas.en_lista`) en lubricación: con más de 32.767 muestras, `IN (...)` daba 500.
- [ ] 2.15 Comparar los reportes del CMMS contra la versión anterior después de paginarlos. Quedó pendiente porque se apagaron los contenedores locales.

## 3. Despliegue

- [ ] 3.1 Subir a `main`, aprobar el despliegue y medir en producción con la empresa `carga`: las mismas pantallas, sin reinicios de procesos en `docker logs prod_backend`.

## 4. Siguiente fase: el resto de la plataforma

El barrido estático (`backend/tools/barrido_consultas.py`: consultas dentro de ciclos y listas sin tope en rutas GET) marcó estas rutas sobre tablas que crecen con la operación. No hay datos masivos de estos módulos para medirlas: primero hay que sembrarlos, como se hizo con el CMMS (`tools/sembrar_cmms.py`), y corregirlas midiendo.

- [ ] 4.1 Talento humano (`hcm.py`): nómina (novedades, liquidaciones, detalle de periodo), incapacidades, vacaciones, reclutamiento, evaluaciones, capacitaciones y SST. Todas hacen una consulta por fila y devuelven todo.
- [ ] 4.2 Capacitación (`lms.py`, `lms_aprendizaje.py`): inscripciones, certificados, foros y reportes de horas. Hacen una consulta por fila.
- [ ] 4.3 Contabilidad (`erp.py`, `erp_contable.py`, `erp_gestion.py`): balance general, balance de comprobación, estados financieros, libro diario, consolidación y ejecución presupuestal. Hacen una suma por cuenta o por rango.
- [ ] 4.4 WMS (`wms*.py`): inventario, recepciones, conteos, órdenes de compra, portal del cliente, indicadores por operario, maquila, olas y contenedores.
- [ ] 4.5 MES (`mes*.py`): órdenes, inspecciones, tablero, SPC, paradas, desperdicio y trazabilidad de lote.
- [ ] 4.6 POS (`pos.py`): ventas, devoluciones y turnos. Ya tienen tope (500 y 300), pero hacen una consulta por fila.
- [ ] 4.7 CRM, calidad (QMS), GRC, TMS, flota, fletes, locativo y agenda (AGS): tableros, alertas, matrices y reportes marcados por el barrido.
