# Proposal

## Why

Varios clientes de Tittan no son flotas sino **proveedores de flotas**: Redllantas, por ejemplo, atiende las llantas de las flotas de sus propios clientes. Hoy el CMMS no tiene cómo separar esas flotas. La «jerarquía» de activos que existe es texto libre (sede → ubicación o área), se arma solo para dibujar el árbol en la pantalla de activos y ningún informe filtra por ella. Además, cualquier usuario de la empresa ve todos los activos, así que el proveedor no puede darle entrada a su cliente para que vea solo su flota. El demo con Redllantas lo vuelve urgente: es la primera cuenta con este perfil.

## What Changes

- **Árbol organizativo por empresa.** Nodos con un padre, nombre y código, con tantos niveles como haga falta (Proveedor → Cliente → Flota → Operación…). Se administra desde el CMMS: crear, renombrar, mover, desactivar y ver cuántos activos tiene cada rama.
- **Cada activo cuelga de un nodo** (opcional). Se elige en el formulario del activo, se asigna en bloque desde la lista y se carga por Excel en el importador de activos. Un asistente propone el árbol inicial a partir de los campos sede y ubicación que ya existen.
- **Filtro por jerarquía** en los informes y tableros de llantas (incluido TittanLite y la pila de desecho), combustible y lubricación, con sus exportes a Excel y PDF. Filtrar por un nodo incluye todo lo que está debajo.
- **Filtro por jerarquía en las apps móviles** TittanWare y TittanLite: al buscar un activo o una placa y en las listas de trabajo.
- **Restricción de acceso por usuario.** A un usuario se le asignan uno o varios nodos y desde entonces solo ve los activos de esas ramas, y lo que cuelga de ellos (llantas, OT, tanqueos, muestras, checklists…). Vale en todas las pantallas y rutas de la API del CMMS, en informes, exportes, apps, Lubr-IA y TittanBot. Tampoco puede crear ni modificar registros sobre activos fuera de su alcance.
- **Mensajería por rama.** Un destinatario de Telegram o WhatsApp puede limitarse a un nodo, de modo que el grupo de un cliente reciba solo los informes de su flota.
- Sin cambios para quien no use la jerarquía: sin nodos asignados todo se ve igual que hoy, y el rol ADMINISTRADOR siempre ve toda la empresa.

## Capabilities

### New Capabilities
- `jerarquia-activos`: el árbol organizativo de la empresa, sus reglas (ciclos, desactivación, código único) y la asignación de activos a nodos (formulario, en bloque, importación, asistente desde sede y ubicación).
- `alcance-por-jerarquia`: la restricción de lo que ve y modifica cada usuario según los nodos asignados, aplicada en la API del CMMS, los exportes, las apps móviles, Lubr-IA, TittanBot y la mensajería.
- `filtro-jerarquia-informes`: el filtro por nodo (con descendientes) en los informes, tableros y exportes de llantas, TittanLite, combustible y lubricación, y en las búsquedas de las apps móviles.

### Modified Capabilities
<!-- No hay specs principales todavía en openspec/specs/. -->

## Impact

- **Base de datos** (por esquema de cliente, migración en el `lifespan` dentro del advisory lock): tablas nuevas `eam_jerarquia_nodo` y `usuario_jerarquia_nodo`, columna `eam_activo.nodo_id` con índice, columna `nodo_id` opcional en `eam_mensajeria_destinatario`.
- **Backend:** un módulo central de alcance (`core/alcance_activos.py`) que resuelve los activos visibles del usuario por petición. Lo usan las ~30 rutas del CMMS que leen activos: `eam.py`, `combustible.py`, `checklists*.py`, `eam_neumaticos_*.py`, `eam_lite.py`, `eam_reportes.py`, `eam_dashboard.py`, `eam_analitica.py`, `eam_confiabilidad.py`, `eam_causa_raiz*.py`, `eam_garantias_apoyo.py`, `lubricacion_*.py`, `reencauche.py` (lado CMMS), además de `core/neumaticos_flota.py`, `core/proyeccion_llantas.py`, `core/confiabilidad.py` y las herramientas SQL de `core/tittanbot/*` y `lubria.py`.
- **Frontend:** administrador del árbol y selector de nodo reutilizable en `components/`; selector en el formulario de activos, la gestión de usuarios y los filtros de `EAMNeumaticos`, informes de llantas y TittanLite, `EAMCombustible` y los reportes de `EAMLubricacion`.
- **Móvil** (`movil/`, `frontend/compartido/`): selector de nodo en la búsqueda de activos de TittanWare y TittanLite. Requiere publicar una versión nueva de ambas apps.
- **Contrato OpenAPI** regenerado (`frontend/compartido/api/.openapi.json` y tipos).
- **Rendimiento:** el filtro se suma a consultas sobre tablas de millones de filas; se mide con el set de `carga` antes de subir (ver diseño).
