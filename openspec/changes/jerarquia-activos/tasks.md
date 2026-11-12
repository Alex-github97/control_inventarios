# Tasks

## 1. Modelo y migración

- [ ] 1.1 Modelos `EAMJerarquiaNodo` y `UsuarioJerarquiaNodo`, y columnas `nodo_id` en `EAMActivo`, `EAMNeumatico` y el destinatario de mensajería; migración aditiva en `main.py` dentro del advisory lock, con índices (`ruta text_pattern_ops`, `nodo_id`). Verificar: reiniciar `ci_backend` y comprobar con `\d` en `cli_carga` y `cli_redllantas` que existen tablas, columnas e índices, y que un segundo arranque no falla.
- [ ] 1.2 Servicio del árbol (`core/jerarquia.py`): crear, renombrar, mover (reescribe la `ruta` de la rama y rechaza ciclos), desactivar (rechaza si hay activos o hijos activos) y conteo acumulado por rama. Verificar: pruebas unitarias de ciclo, movimiento con descendientes, código repetido, desactivación bloqueada y conteo acumulado.

## 2. API y pantalla del árbol

- [ ] 2.1 Rutas `/eam/jerarquia` (árbol con conteos, CRUD, mover) y asignación del nodo en el formulario de activo y en bloque (`POST /eam/activos/asignar-nodo`). Verificar: pruebas de API para crear, mover y asignar en bloque 40 activos, y que el conteo del padre suba en 40.
- [ ] 2.2 Asistente desde sede y ubicación (`propuesta` sin escribir y `aplicar-propuesta` transaccional, con textos normalizados). Verificar: prueba con «Bogota»/«Bogotá » que propone un solo nodo, y que `propuesta` no cambia la base.
- [ ] 2.3 Columna de nodo (código o ruta de nombres) en el importador de activos por Excel, con error por fila. Verificar: prueba con un nodo inexistente en la fila 17 que reporta «fila 17» y aplica las demás.
- [ ] 2.4 Componente `SelectorNodo` en `frontend/compartido/` y pestaña «Jerarquía» de `EAMActivos.tsx` reescrita sobre el árbol real (crear, renombrar, arrastrar para mover, desactivar, asistente). Ruta del nodo en la hoja de vida y selector en el formulario y la acción en bloque. Regenerar el contrato OpenAPI. Verificar: `tsc` con 0 errores y un recorrido con `ci-auditor` que crea dos niveles, mueve uno y asigna activos sin errores de página.

## 3. Alcance del usuario (núcleo)

- [ ] 3.1 `core/alcance_activos.py`: dependencia `alcance`, `Alcance.total`, subconsulta de activos por prefijos, `filtrar`, `filtrar_neumatico`, `exigir` (404) y `exigir_activo`, más la intersección con el filtro `nodo_id`. Verificar: pruebas unitarias para ADMINISTRADOR con nodos (total), usuario sin nodos (total), usuario con dos ramas, nodo fuera de alcance (404) y «Sin asignar».
- [ ] 3.2 Asignación de nodos a usuarios en la gestión de usuarios (API y pantalla), aplicada desde la siguiente petición. Verificar: prueba de API que asigna, consulta, quita la rama y vuelve a consultar sin iniciar sesión de nuevo.
- [ ] 3.3 Registro `ALCANCE_RUTAS` y prueba unitaria que recorre `app.routes` y falla si una ruta bajo `/eam`, `/lubricacion`, `/movil`, `/flota`, `/vehiculos` o `/tittanbot` no declara `alcance` ni está exenta. Al principio la prueba lista las rutas pendientes; se completa en el grupo 4. Verificar: la prueba corre y lista lo que falta.
- [ ] 3.4 Esquema de prueba de fugas: dos ramas con placas y códigos marcados, datos de llantas, OT, tanqueos, checklists, lubricación y TittanLite en ambas, y un usuario restringido a «A». Prueba de integración que llama todas las rutas GET del CMMS con ids de «B» y busca los marcadores, incluidos Excel y PDF convertidos a texto. Verificar: la prueba corre y reporta las fugas actuales; se cierran en el grupo 4.

## 4. Aplicar el alcance módulo por módulo

- [ ] 4.1 Activos, OT, planes, documentos, garantías, causa raíz, dashboard, analítica y confiabilidad (`eam.py`, `eam_dashboard.py`, `eam_analitica.py`, `eam_confiabilidad.py`, `core/confiabilidad.py`, `eam_causa_raiz*.py`, `eam_garantias_apoyo.py`, `eam_reportes.py`), lecturas y escrituras. Verificar: estas rutas salen de la lista pendiente de 3.3 y no tienen fugas en 3.4.
- [ ] 4.2 Llantas: `nodo_id` de la llanta al montar y al cambiar el nodo del vehículo; alcance en inventario, inspecciones, movimientos, reencauche, disposición y pila de desecho, informes, tableros, proyección y sugerencias (`eam.py` sección llantas, `eam_neumaticos_*.py`, `core/neumaticos_flota.py`, `core/proyeccion_llantas.py`, `reencauche.py` lado CMMS). Verificar: prueba de que una llanta desechada de «A» sigue en la pila de «A», y las rutas sin fugas en 3.4.
- [ ] 4.3 TittanLite (`eam_lite.py`), incluidos sus Excel masivos y su tablero. Verificar: sin fugas en 3.4 y el Excel de inspecciones del usuario restringido sin placas de «B».
- [ ] 4.4 Combustible y checklists (`combustible.py`, `checklists.py`, `checklists_ejecucion.py`). Verificar: sin fugas en 3.4 y un tanqueo a un vehículo de «B» que responde 404.
- [ ] 4.5 Lubricación (`lubricacion_*.py`), incluidos los informes PDF y la importación de laboratorio, que rechaza filas de activos fuera de alcance. Verificar: sin fugas en 3.4 y prueba de importación con una placa ajena.
- [ ] 4.6 App móvil (`movil.py` y lo que consumen las apps) y vehículos y flota (`/flota`, `/vehiculos`). Verificar: la lista pendiente de 3.3 queda vacía y 3.4 pasa sin fugas.
- [ ] 4.7 TittanBot y Lubr-IA: `Contexto` con `Alcance` y el fragmento `sql_activos` en las ~50 herramientas de consulta (`core/tittanbot/*.py`, `lubria.py`). Verificar: extender 3.4 a las herramientas, de modo que ninguna devuelva datos de «B» con el usuario restringido.
- [ ] 4.8 Mensajería por rama: `nodo_id` en el destinatario, selector en su configuración e informes generados con un alcance sintético. Verificar: prueba de que el informe para un destinatario de «A» no contiene placas de «B».

## 5. Filtros en informes y apps

- [ ] 5.1 Parámetro `nodo_id` en los informes, tableros y exportes de llantas (informe de flota, pila de desecho, TittanLite), combustible y lubricación, con la ruta del nodo en el encabezado de los PDF y una columna de ruta en los Excel. Verificar: pruebas de API de que filtrar por «Transportes ABC» incluye sus subniveles, y un PDF renderizado con poppler que muestra la ruta.
- [ ] 5.2 `SelectorNodo` en los filtros de `EAMNeumaticos`, Informes de neumáticos y TittanLite, `EAMCombustible` y los reportes de `EAMLubricacion`, combinado con los filtros existentes (y sus opciones acotadas al nodo), con preselección si el usuario tiene una sola rama. Verificar: `tsc` con 0 errores y un recorrido con `ci-auditor` en cada pantalla con un usuario restringido.
- [ ] 5.3 Selector de nodo en la búsqueda de activos y las listas de trabajo de TittanWare y TittanLite (`movil/`), recordado por dispositivo y empresa. Verificar: pruebas Jest del selector y de la persistencia, y una compilación de ambas apps.

## 6. Integración y rendimiento

- [ ] 6.1 Asignar un árbol de prueba a `cli_carga` (3 clientes, 6 flotas) y medir las rutas pesadas de la nota `consultas-con-volumen` en alcance total y restringido, comparando contra los tiempos actuales. Verificar: tabla de tiempos en las notas del cambio; ninguna ruta más del 20 % más lenta en alcance total.
- [ ] 6.2 Recorrido completo con `ci-auditor` como administrador y como usuario de un cliente (web), más la prueba de fugas completa en verde. Verificar: 0 errores de página y 0 fugas.

## Workflow follow-up

- Desplegar el backend, configurar el árbol de Redllantas con ellos y publicar las apps TittanWare y TittanLite con el selector.
- Archivar el cambio después de la revisión del usuario.
