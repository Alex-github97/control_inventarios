# Design

## Context

- Cada empresa vive en su propio esquema de Postgres (`cli_<código>`), elegido por petición en el evento `after_begin` de `core/database.py`. Esa es la frontera entre empresas. Dentro de una empresa no hay ninguna frontera hoy.
- El permiso por perfil (`core/permisos_ruta.py`) decide **qué módulos** abre un usuario, por prefijo de ruta. No decide **qué filas** ve.
- La «jerarquía» actual de `EAMActivos.tsx` es un árbol armado en el navegador con los textos `sede` → `ubicacion`/`area` → `parent_id`. No existe en la base y ningún informe la usa.
- Unas 30 rutas del CMMS leen activos o tablas que cuelgan de ellos. Unas llegan al activo de forma directa (`activo_id` en OT, tanqueos, checklists, compartimentos, documentos, TittanLite) y otras indirecta: inspección → llanta → activo, resultado → muestra → compartimento → activo, `ot_material` → OT → activo.
- Las acciones de TittanBot y Lubr-IA llaman a la API con el token del usuario (`tittanbot/ejecutor.py`), pero sus herramientas de consulta (~50) leen la base con SQL propio (`_filas`).
- La aplicación se conecta a Postgres como superusuario (`tw_user`, `rolsuper = t`).
- Volumen de referencia: 3.000 activos = 7,1 M filas. Con 3.000 activos ya hubo consultas que rompían el límite de 32.767 parámetros de un `IN` (ver la nota `cmms_carga`).

## Goals / Non-Goals

**Goals:**
- Un único punto que resuelva el alcance del usuario, y que sea difícil olvidarlo en una ruta nueva.
- Que filtrar por nodo con descendientes cueste lo mismo con 3 niveles que con 8, y no dependa de cuántos activos haya.
- Que la omisión de una ruta la detecte una prueba, no un cliente.

**Non-Goals:**
- No se restringen otros módulos (TMS, WMS, ERP…), solo el CMMS y sus apps.
- No hay permisos distintos por nodo (p. ej. «lee Flota A, escribe Flota B»): el perfil decide qué puede hacer y el nodo decide sobre qué.
- No se reemplaza el árbol técnico (tipo → marca → línea → modelo) ni el `parent_id` de componentes. Conviven.

## Decisions

### 1. Árbol con ruta materializada
`eam_jerarquia_nodo(id, parent_id, nombre, codigo UNIQUE, ruta, nivel, activo, orden)`, donde `ruta` es la cadena de ids (`/1/4/9/`) con índice `text_pattern_ops`. «Nodo con descendientes» es `ruta LIKE '/1/4/%'`: un solo índice, sin recursión.
- Mover un nodo reescribe la `ruta` de su rama en un `UPDATE` con `replace()`, dentro de una transacción con bloqueo del nodo. El ciclo se detecta porque la ruta del nuevo padre empezaría por la ruta del nodo.
- Alternativas: un CTE recursivo en cada consulta (se paga en cada informe, y los informes ya pesan) o una tabla de cierre (escrituras más complejas para árboles de decenas de nodos). La ruta materializada es lo más simple con lo que se lee mucho y se escribe poco.

### 2. El activo apunta al nodo; la llanta guarda el suyo
- `eam_activo.nodo_id` (FK, índice, nulo = «Sin asignar»).
- `eam_neumatico.nodo_id` se fija al montar la llanta (el nodo del vehículo) y no se borra al desmontarla. Así la pila de desecho y el reencauche siguen siendo del cliente. Si a un vehículo se le cambia el nodo, sus llantas montadas cambian con él.
- Alternativa descartada: deducir el nodo de la llanta desmontada desde su último movimiento en cada consulta (una subconsulta sobre `eam_movimiento_neumatico`, cientos de miles de filas, en cada informe).

### 3. Alcance en la aplicación, no con seguridad por filas de Postgres
`core/alcance_activos.py` expone una dependencia `alcance(usuario, db) -> Alcance`:
- `Alcance.total`: ADMINISTRADOR o usuario sin nodos.
- Si no, guarda los prefijos de ruta de sus nodos. `Alcance.activos()` devuelve una **subconsulta** (`SELECT a.id FROM eam_activo a JOIN eam_jerarquia_nodo n … WHERE n.ruta LIKE ANY(:prefijos)`), nunca una lista de ids. Eso evita el límite de parámetros y que la lista caduque a mitad de la petición.
- Ayudas: `filtrar(stmt, columna_activo)` para lo directo, `filtrar_neumatico(stmt, columna_neumatico)` (nodo propio de la llanta, o nulo), y `exigir(db, modelo, id)`, que responde 404 si el registro existe pero está fuera de alcance. Para las escrituras, `exigir_activo(activo_id)`.
- La misma dependencia acepta el filtro opcional `nodo_id` de los informes: se intersecta con el alcance (un nodo fuera de alcance da 404) y el resultado es una sola subconsulta.
- **Por qué no RLS de Postgres:** la app se conecta como superusuario y el superusuario se salta las políticas. Habría que crear otro rol, quitarle la propiedad de las tablas en todos los esquemas y escribir políticas con joins para las tablas indirectas (inspecciones, resultados, respuestas de checklist), que son las de millones de filas. Queda anotado como endurecimiento posterior. Este diseño no lo impide: la subconsulta de alcance es la misma que usaría la política.

### 4. Una prueba de barrido detecta las rutas olvidadas
- `ALCANCE_RUTAS`: igual que `permisos_ruta.py`, cada ruta bajo `/eam`, `/lubricacion`, `/movil`, `/flota`, `/vehiculos` y `/tittanbot` debe declarar la dependencia `alcance` o estar en una lista explícita de exentas (catálogos, configuración). Una prueba unitaria recorre `app.routes` y falla si una ruta del CMMS no hace ninguna de las dos cosas.
- **Prueba de fugas** (integración, contra la base de desarrollo): un esquema de prueba con dos ramas («A» y «B»), datos en ambas y un usuario restringido a «A». La prueba llama **todas** las rutas GET del CMMS, rellena los parámetros de ruta con ids de «B» y busca en cada respuesta, incluidos los exportes Excel y PDF convertidos a texto, las placas y códigos de «B», que llevan un marcador único. Cualquier aparición falla la prueba con la ruta culpable.

### 5. TittanBot y Lubr-IA
- `Contexto` lleva el `Alcance`. Cada herramienta de consulta compone su SQL con un fragmento de `alcance.sql_activos("a.id")`, parametrizado y siempre presente: si el alcance es total, el fragmento es `TRUE`. La prueba del punto 4 se extiende a las herramientas: con el usuario restringido, ninguna devuelve datos de «B».
- Las acciones ya pasan por la API con el token del usuario, así que heredan el alcance sin cambios.

### 6. Mensajería por rama
`eam_mensajeria_destinatario.nodo_id`. Al generar un informe para un destinatario con nodo, se construye un `Alcance` sintético con ese nodo en vez del de un usuario, y el mismo generador del informe filtra con él.

### 7. Selector de nodo único en web y móvil
Un componente `SelectorNodo` en `frontend/compartido/` (árbol con buscador, conteos y la opción «Sin asignar» para alcance total), usado por la web y por las dos apps. El árbol lo entrega `GET /eam/jerarquia/arbol`, que ya viene recortado al alcance del usuario. Las apps recuerdan el nodo elegido en el almacenamiento local, por dispositivo y empresa.

### 8. Asistente desde sede y ubicación
`POST /eam/jerarquia/propuesta` agrupa `sede` → `ubicacion`/`area` y devuelve la propuesta con conteos, sin escribir nada. `POST /eam/jerarquia/aplicar-propuesta` la crea en una transacción. Los textos se normalizan (espacios, mayúsculas, tildes) para no partir «Bogota» y «Bogotá» en dos nodos.

## Risks / Trade-offs

- [Una ruta nueva sin alcance filtra datos de otro cliente] → la prueba de declaración falla en CI, y la prueba de fugas la cubre si es GET.
- [Las consultas pesadas se vuelven más lentas al sumar la subconsulta] → índices en `eam_activo(nodo_id)`, `eam_neumatico(nodo_id)` y `eam_jerarquia_nodo(ruta text_pattern_ops)`; con alcance total no se agrega nada al SQL. Antes de subir se miden las rutas pesadas de la nota `consultas-con-volumen` con el set de `carga`, en sus dos modos (total y restringido a la mitad de la flota).
- [El nodo cambia a mitad de una petición] → el alcance es una subconsulta que se evalúa en el momento, así que una petición nunca ve una mezcla incoherente.
- [Usuario restringido sin ningún activo en sus ramas] → ve listas vacías, no errores. El selector lo explica («Su rama no tiene activos asignados»).
- [Llantas sin nodo visibles para todos] → es lo que pide el negocio para el stock nuevo. El administrador puede asignarles rama al crearlas o en bloque.
- [Totales de inventario de repuestos que incluyen salidas de otros clientes] → aceptado: el inventario de repuestos es del proveedor (ver spec, recursos de la empresa). Si un cliente lo necesita separado, se resuelve con bodegas por nodo en un cambio aparte.

## Migration Plan

1. Migración aditiva en el `lifespan`, dentro del advisory lock: crear las tablas, las columnas `nodo_id` (nulas) y los índices en todos los esquemas. Sin nodos asignados nadie queda restringido, así que el despliegue no cambia nada visible.
2. Rellenar `eam_neumatico.nodo_id` cuando se asigne el primer nodo a un vehículo (el servicio lo hace al guardar), no en la migración.
3. Desplegar el backend antes que las apps: las apps viejas siguen funcionando porque `nodo_id` es opcional, y la restricción se aplica en el servidor.
4. Publicar TittanWare y TittanLite con el selector.
5. **Vuelta atrás:** quitar los nodos de los usuarios devuelve el comportamiento actual sin tocar el esquema. Las columnas y tablas nuevas pueden quedarse.

## Open Questions

- Si un cliente final debe poder crear subniveles dentro de su propia rama (hoy solo lo hace el administrador). No cambia el modelo: sería un permiso de perfil más.
