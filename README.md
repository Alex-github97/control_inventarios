# Plataforma Empresarial ICOLTRANS — Sistema ERP Modular

**Versión 2.3.0** | Industria Colombiana de Logística y Transporte (ICOLTRANS)

Plataforma empresarial unificada con 20 módulos de gestión operativa, diseñada para escala corporativa. Combina logística, transporte, mantenimiento, manufactura, calidad, talento humano, finanzas, GRC y administración en una sola aplicación React con backend FastAPI.

---

## Arquitectura

```
control-inventarios/
├── backend/
│   ├── app/
│   │   ├── core/               # Config, Database, Security, Dependencies
│   │   ├── domain/             # Entidades de dominio
│   │   ├── application/        # Servicios y Schemas (Pydantic v2)
│   │   ├── infrastructure/     # Modelos ORM, Repos, Integración SAP
│   │   └── api/v1/             # Endpoints REST
│   ├── data/                   # Archivos internos (TARIFARIO_SICETAC.xlsx, plantillas)
│   ├── alembic/                # Migraciones de base de datos
│   └── scripts/                # Seed y utilidades
└── frontend/
    └── src/
        ├── pages/              # 234+ páginas distribuidas en 20 módulos
        ├── components/
        │   └── layout/         # Layout.tsx, Sidebar, WorkspacePanel (tres paneles)
        ├── api/                # apiClient (axios)
        ├── store/              # Zustand (autenticación)
        └── theme/              # Identidad visual corporativa
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Pydantic v2 |
| Procesamiento de datos | pandas 2.2, openpyxl 3.1 |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React 18, TypeScript, Material UI v6 |
| Gráficas | Recharts |
| Animaciones | Framer Motion |
| Importación Excel | SheetJS (xlsx) |
| Estado | Zustand + TanStack React Query v5 |
| Contenedores | Docker + Docker Compose |

---

## Inicio Rápido

### 1. Prerrequisitos
- Docker Desktop instalado y corriendo
- Git

### 2. Configuración
```bash
git clone https://github.com/Alex-github97/control_inventarios.git
cd control-inventarios
cp .env.example .env
# Editar .env con las credenciales del entorno
```

### 3. Archivo base de TarifaX (no está en git por su tamaño)
```
Copiar TARIFARIO_SICETAC.xlsx en:  backend/data/TARIFARIO_SICETAC.xlsx
```

### 4. Levantar con Docker
```bash
docker compose up -d
```

### 5. Cargar datos iniciales
```bash
docker compose exec backend python -m scripts.seed
```

### 6. Acceder
| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API REST | http://localhost:8000 |
| Docs API (Swagger) | http://localhost:8000/api/docs |
| ReDoc | http://localhost:8000/api/redoc |
| pgAdmin | http://localhost:5050 |

---

## Usuarios por Defecto

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `Admin@2025` | Administrador |
| `supervisor` | `Super@2025` | Supervisor Logístico |
| `operador` | `Oper@2025` | Operador de Bodega |

> ⚠️ Cambiar contraseñas en producción.

---

## Módulos del Sistema (21)

La plataforma tiene 21 módulos con páginas y/o endpoints propios. **Existe una inconsistencia real en el código, no solo de esta documentación:** el color de navegación de cada módulo (`frontend/src/components/layout/Sidebar.tsx`) y el color usado en la matriz de permisos de roles (`frontend/src/pages/Roles.tsx`) divergieron con el tiempo — no siempre coinciden. La tabla siguiente muestra ambos.

| Clave | Módulo | Color (Sidebar) | Color (Roles/permisos) |
|-------|--------|------------------|-------------------------|
| `ci` | Control de Inventarios | `#32AC5C` | `#16A34A` |
| `tx` | TarifaX | `#369E4D` | `#D97706` |
| `ft` | Fletes | `#F59E0B` | `#2563EB` |
| `gf` | Gestión de Flotas | `#32AC5C` | `#7C3AED` |
| `ml` | Locativa (ex "Mantenimiento Locativo") | `#0D9488` | `#EA580C` |
| `wms` | Almacén WMS | `#1E40AF` | `#0891B2` |
| `gh` | Gestión Humana (HCM) | `#BE185D` | `#DB2777` |
| `tms` | Transporte TMS | `#0369A1` | `#0D9488` |
| `dms` | Documentos DMS | `#0E7490` | `#4F46E5` |
| `qms` | Calidad QMS | `#059669` | `#059669` |
| `grc` | Gobierno GRC | `#6D28D9` | `#6D28D9` |
| `lms` | Aprendizaje LMS | `#D97706` | `#B45309` |
| `crm` | CRM Clientes | `#DC2626` | `#DC2626` |
| `eam` | Activos EAM (incluye Neumáticos) | `#32AC5C` | `#475569` |
| `mes` | Manufactura MES | `#0891B2` | `#9333EA` |
| `aps` | Planeación APS | `#7C3AED` | `#0284C7` |
| `erp` | ERP Financiero/Contable | `#1A3A6B` | *(no existe en la matriz de permisos)* |
| `scm` | Cadena de Suministro SCM | `#0C4D8C` | *(no existe en la matriz de permisos)* |
| `sst` | Seguridad y Salud en el Trabajo | `#C53030` | *(no existe en la matriz de permisos)* |
| `ags` | Agenda de Servicios | `#A21CAF` | `#A21CAF` |
| `admin` | Administración | — | `#B91C1C` |

> **Brecha funcional real**: ERP, SCM y SST no están dados de alta en `Roles.tsx` — hoy no es posible restringir el acceso a esos 3 módulos desde la matriz de permisos de roles; cualquier rol con acceso general los ve. Pendiente de agregar como filas de la matriz si se requiere control de acceso granular sobre ellos. (AGS sí quedó registrado, tanto en `MODULOS_SISTEMA` como en la matriz.)

---

## CI — Control de Inventarios

Módulo central de gestión de estibas, movimientos y logística de bodega.

### Secciones

#### Dashboard (`/dashboard`)
- KPIs en tiempo real: estibas totales, disponibles, en tránsito, en cliente, dañadas, faltantes, pérdidas confirmadas, manifiestos, alertas
- **KPI Faltantes**: conteo de estibas en estado FALTANTE pendientes de resolución
- **KPI Pérdidas**: conteo de estibas en estado PERDIDA + valor total en COP (cuantificación monetaria de pérdidas)
- **KPI Tiempo Promedio de Retorno**: días promedio entre el movimiento CARGA y el siguiente RETORNO para la misma estiba (últimos 12 meses)
- Tiempo de uso por estiba: edad promedio en meses + histograma de distribución por antigüedad
- Costos acumulados de mantenimiento + gráfico mensual (últimos 12 meses)
- **Gráfico de retorno por mes**: LineChart con días promedio CARGA→RETORNO por mes, filtrable por bodega de cliente mediante selector desplegable
- Tendencia de movimientos (30 días), distribución de daños, ocupación de ubicaciones

#### Estibas (`/estibas`)
- Creación individual con generación automática de QR
- Cargue masivo desde Excel (plantilla descargable + validaciones + vista previa)
- Ciclo de vida completo: inventario → tránsito → cliente → retorno
- Búsqueda por código interno, QR o RFID
- KPIs en tiempo real por estado

**Detalle de estiba (`/estibas/{id}`):**
- Información general, código QR descargable e historial de trazabilidad en línea de tiempo
- Ubicación actual muestra **"Desconocida"** cuando el estado es FALTANTE y **"Pérdida confirmada"** cuando es PERDIDA
- **Panel de resolución FALTANTE** (visible solo cuando `estado = FALTANTE`):
  - Botón **"Recuperar faltante"** (solo SUPERVISOR / ADMIN): observación obligatoria + bodega destino opcional → mueve la estiba a EN_INVENTARIO y registra movimiento tipo RETORNO en la trazabilidad
  - Botón **"Confirmar pérdida"** (solo SUPERVISOR / ADMIN): observación obligatoria → mueve la estiba a PERDIDA (no BAJA) y registra movimiento tipo BAJA en la trazabilidad con el valor de la estiba en metadatos

**Estados del ciclo de vida:**

| Estado | Descripción |
|--------|-------------|
| DISPONIBLE | En bodega, lista para usar |
| EN_INVENTARIO | Recuperada o recibida, en bodega |
| EN_TRANSITO | En viaje activo |
| CARGADA | Cargada en vehículo |
| EN_CLIENTE | Entregada al cliente |
| PENDIENTE_RETORNO | Cliente debe devolverla |
| EN_REPARACION | En proceso de mantenimiento |
| DANADA | Registrada con daño |
| FALTANTE | No encontrada al cierre del manifiesto — genera alerta CRÍTICA automática |
| PERDIDA | Pérdida confirmada por supervisor (viene de FALTANTE) |
| BAJA | Dada de baja por otras causas |
| DISPOSICION_FINAL | Fin de vida útil |

#### Movimientos (`/movimientos`)
- Registro individual con diálogo guiado
- Cargue masivo desde Excel
- Carga/descarga masiva por manifiesto
- Tipos: CARGA, DESCARGA, TRANSFERENCIA, RETORNO, RECEPCION, REPARACION, BAJA, DISPOSICION_FINAL, INVENTARIO

#### Manifiestos (`/manifiestos`)
- Ciclo: Programado → En Cargue → En Tránsito → Entregado
- Asociación de estibas por manifiesto
- Vinculación con vehículo y conductor
- Al cerrar un manifiesto (ENTREGADO), las estibas no descargadas pasan automáticamente a FALTANTE con alerta CRÍTICA
- Estibas FALTANTE en el diálogo de detalle muestran chip naranja diferenciado
- **Descarga PDF del manifiesto**: botón "Descargar PDF" genera un informe titulado *"INFORME DE MOVIMIENTO DE ESTIBAS"* directamente en el navegador (sin diálogo de impresión) con nombre de archivo `{numero}_{YYYYMMDD_HHMM}.pdf`. Incluye encabezado con número y estado, datos del viaje, tabla de estibas y tabla de historial

#### Trazabilidad (`/trazabilidad`)
- Búsqueda por código interno de estiba
- Línea de tiempo completa con tipo de movimiento, estados antes/después, ubicación, vehículo, manifiesto, conductor y usuario
- Muestra **"Desconocida"** como ubicación cuando la estiba está FALTANTE o PERDIDA

#### Ubicaciones (`/ubicaciones`)
- CRUD completo con soft-delete
- Tipos: BODEGA, PLANTA, PATIO, CLIENTE, PROVEEDOR, VEHICULO, TRANSITO, DISPOSICION_FINAL
- **Stock mínimo por tipo de estiba** (solo para BODEGA): configuración integrada en el formulario de creación/edición — permite definir cantidades mínimas por tipo (MADERA, PLASTICO, METAL, CARTON, MIXTA); genera alerta ADVERTENCIA automática cuando el stock cae por debajo del umbral

#### Proveedores (`/proveedores`)
- Maestro de proveedores con integración SAP preparada

#### Alertas (`/alertas`)
- Motor automático de alertas: Info, Advertencia, Crítica
- Tipos activos: `ESTIBA_FALTANTE` (CRÍTICA) y `STOCK_BAJO` (ADVERTENCIA)
- **Campana de alertas en el header**: popover con conteo de no leídas (badge rojo) y vista previa de las 5 más recientes; se refresca cada 60 segundos
- **Dialog de detalle** al hacer clic en cualquier fila: muestra descripción completa de la novedad; para alertas `ESTIBA_FALTANTE` carga el detalle de la estiba involucrada (código, tipo, estado, valor, ubicación) y del manifiesto de origen (número, vehículo, conductor, ruta, fecha de salida), con botón directo al detalle de la estiba
- **Resolución con observación obligatoria**: al resolver cualquier alerta (desde la tabla o desde el dialog de detalle) se abre un dialog que exige describir la acción tomada. La observación, la fecha y el nombre del usuario quedan registrados y son visibles al consultar la alerta resuelta

#### Daños (`/danos`)
- Registro y seguimiento de estibas dañadas

#### Mantenimiento de Estibas (`/mantenimiento`)
- Registro de mantenimiento con costo, tipo, fecha, proveedor y descripción
- Tipos: PREVENTIVO, CORRECTIVO, REPARACIÓN, INSPECCIÓN, LIMPIEZA, PINTURA, REFUERZO
- Filtros por estiba, tipo y rango de fechas
- KPIs de costo total y conteo

#### Costos por Estiba (`/costos`)
- Reporte consolidado de costo total de mantenimiento por estiba
- Tabla ordenada por costo descendente con filtros y paginación (20 por página)

#### Consultas (`/consultas`)
- Consultas avanzadas y reportes del módulo CI

---

## TX — TarifaX

Motor de cruce de tarifas migrado desde Streamlit a React/FastAPI.

### Motor TarifaX (`/tarifax/motor`)
Cruza el archivo del usuario (DF2) contra la base interna SICETAC (DF1) y descarga el resultado en Excel.

| Parámetro | Valor |
|-----------|-------|
| Base interna (DF1) | `TARIFARIO_SICETAC.xlsx` |
| Columna clave | `ORIGEN` |
| Tipo de join | LEFT JOIN |
| Columna calculada | `variacion_precio = TARIFA_CLIENTE / COSTO_TOTAL_VIAJE` |

> `TARIFARIO_SICETAC.xlsx` **no está en git** (41 MB). Copiarlo manualmente a `backend/data/` en cada nuevo ambiente. Reiniciar el backend después de actualizarlo para refrescar el caché en memoria.

---

## GRC — Governance, Risk & Compliance

Módulo completo de gobierno corporativo, gestión de riesgos y cumplimiento normativo. Color: `#6D28D9` (púrpura).

### Secciones (10)

| Sección | Ruta | Descripción |
|---------|------|-------------|
| Obligaciones | `/grc/obligaciones` | Seguimiento de obligaciones regulatorias por país, área y responsable |
| Cumplimiento | `/grc/cumplimiento` | Cumplimiento de normas (ISO, BASC, SARLAFT, DIAN, RNDC, etc.) |
| Riesgos | `/grc/riesgos` | Registro y evaluación de riesgos por proceso, probabilidad e impacto |
| Políticas | `/grc/politicas` | Gestión del ciclo de vida de políticas corporativas |
| Controles | `/grc/controles` | Controles internos por categoría (ciberseguridad, operacional, SST, etc.) |
| Terceros | `/grc/terceros` | Due diligence y seguimiento de terceros (proveedores, clientes) |
| Auditorías | `/grc/auditorias` | Programación y seguimiento de auditorías internas y externas |
| Hallazgos | `/grc/hallazgos` | Registro de hallazgos, no conformidades y planes de acción |
| Continuidad | `/grc/continuidad` | Planes de continuidad del negocio (BCP) por área |
| Incidentes | `/grc/incidentes` | Registro y gestión de incidentes de seguridad y operacionales |

### Características transversales del módulo GRC
- Confirmación de eliminación con digitación obligatoria de la palabra **"ELIMINAR"**
- Todos los campos de selección estandarizados (país, área, responsable, categoría, norma, proceso) son `Select` con opciones controladas desde constantes — sin digitación libre para evitar inconsistencias de datos
- La única excepción son los campos de descripción libre (multiline textarea)

### Opciones estandarizadas

| Campo | Opciones ejemplo |
|-------|-----------------|
| País | Colombia, Ecuador, Perú, Panamá, México, España, EE.UU., Brasil, Internacional… |
| Área | Operaciones, TI / Tecnología, Compliance / Legal, Financiero, RRHH, GRC, Auditoría, Calidad, SST… |
| Responsable | CEO, CFO, COO, CTO, CISO, Dir. Operaciones, Dir. TI, Dir. GRC, Auditor Interno… |
| Norma | ISO 9001, ISO 27001, ISO 31000, BASC v5, Ley 1581, SARLAFT, SAGRILAFT, NIST CSF… |
| Proceso | Operaciones, Bodega, Transporte, Comercial, TI, Compliance, Financiero, RRHH… |

---

## WMS — Almacén (Warehouse Management System)

Módulo de gestión de almacenes con configuración por catálogos. Color: `#0891B2`.

### Catálogos configurables (`/wms/config`)

Todos los valores que alimentan los formularios del WMS se administran desde catálogos CRUD sin tocar código:

| Pestaña | Entidad | Campos principales |
|---------|---------|-------------------|
| Países | `WMSPais` | Nombre, código ISO |
| Ciudades | `WMSCiudad` | Nombre, País (cascada) |
| Tipos de Zona | `WMSTipoZona` | Nombre, descripción |
| Tipos de Ubicación | `WMSTipoUbicacion` | Nombre, descripción |
| Unidades de Medida | `WMSUnidadMedida` | Nombre, abreviatura |
| Categorías | `WMSCategoriaProducto` | Nombre |
| Familias | `WMSFamiliaProducto` | Nombre, Categoría (cascada) |

### Cómo impactan los catálogos en el resto del WMS

| Sección | Campo controlado por catálogo |
|---------|-------------------------------|
| Almacenes | País → Ciudad (selección en cascada, ambos obligatorios) |
| Zonas | Tipo de Zona (selección obligatoria) |
| Ubicaciones WMS | Tipo de Ubicación (reemplaza array estático) |
| Productos | Categoría → Familia (cascada) + Unidad de Medida |
| Proveedores | País → Ciudad (cascada) |
| Clientes | País → Ciudad (cascada) |

### Patrón de almacenamiento

Los campos de catálogo se guardan como **texto** en la entidad padre (ej: `almacen.ciudad = "Bogotá"`), no como FK numérico. Esto evita migraciones de esquema en tablas existentes y permite consultas simples sin joins. El catálogo es la fuente de verdad para los valores válidos.

### Migraciones

| Revisión | Contenido |
|----------|-----------|
| `007` | Tablas `wms_paises` y `wms_ciudades` |
| `008` | Tablas `wms_tipos_zona`, `wms_tipos_ubicacion`, `wms_unidades_medida`, `wms_categorias_producto`, `wms_familias_producto` |

---

## ML — Locativa (ex "Mantenimiento Locativo")

Gestión de infraestructura física y mantenimiento locativo. Color: `#0D9488`.

Sedes, espacios y categorías; activos locativos; medidores y lecturas de energía; catálogo de tareas de mantenimiento y modos de falla; fallas registradas; órdenes de mantenimiento; proveedores; riesgos asociados a espacios/activos; y un dashboard de KPIs. Páginas: `LocativaDashboard`, `LocativaActivos`, `LocativaConfig`, `LocativaEnergia`, `LocativaOrdenes`, `LocativaRiesgos`.

---

## EAM — Activos Empresariales (incluye Neumáticos)

Gestión de mantenimiento de activos (CMMS/EAM). Color: `#32AC5C`. 13 páginas.

Órdenes de trabajo, planes de mantenimiento preventivo, checklists, lubricación, combustible, inventario de repuestos, confiabilidad, garantías y un dashboard general — más un submódulo de **Neumáticos** (`EAMNeumaticos.tsx`) con alcance propio:

- **Ciclo de vida completo**: catálogo de llantas, zonas de vehículo, esquemas de vehículo (plantillas por número de ejes), bandas de reencauche, motivos de fin de vida, vidas del neumático (nueva → reencauchada → reencauchada N veces), ajustes de valor, reesculturado y recuperación de banda
- **Montaje / desmontaje / rotación**: diagrama interactivo del vehículo (arrastrar y soltar o por botón), rotación por intercambio entre posiciones, rotación en el rin (misma posición), volteo interno↔externo — con validaciones reales de negocio (no permite montar una llanta de baja, en reencauche, ya instalada en otro vehículo, o en una posición ya ocupada; valida consistencia cronológica contra inspecciones previas)
- **Inspecciones**: individual, por sesión (todas las llantas montadas de un vehículo a la vez) y **masiva por archivo Excel** (referencia la llanta por código)
- **Descarte**: individual y **masivo por archivo Excel**, con las mismas validaciones que el flujo individual
- **Bodega**: importación masiva de llantas nuevas por Excel (plantilla descargable), eliminación masiva con confirmación
- **Reportes**: informe consolidado y histórico por llanta, indicadores CPK, alertas automáticas (profundidad mínima, presión fuera de rango, desalineación), congelado de datos (snapshot histórico) y lotes de reencauche con proveedor externo

---

## MES — Manufactura

Ejecución de manufactura en planta (Manufacturing Execution System). Color: `#0891B2`. 13 páginas.

Plantas, líneas, turnos, equipos y operarios; productos y BOM (lista de materiales, con detalle); celdas de trabajo e inventario WIP (con saldos y consumos); recetas; órdenes de producción con máquina de estados; lotes con trazabilidad completa; ejecuciones de orden (con cierre) y registro de paradas; calidad, scrap y OEE; programación y reportes. Páginas: `MESDashboard`, `MESOrdenes`, `MESEjecucion`, `MESCalidad`, `MESScrap`, `MESTrazabilidad`, `MESOEE`, `MESConfig`, `MESPlanta`, `MESBOM`, `MESInventario`, `MESProgramacion`, `MESReportes`.

---

## TMS — Transporte

Torre de control de transporte. Color: `#0369A1`. 13 páginas, 53 rutas de API — el módulo con más endpoints del sistema.

Vehículos y conductores; viajes (con paradas, eventos y documentos/POD de entrega); rutas; despachos; liquidaciones (crear → aprobar → pagar); indicador OTIF (on-time-in-full) con resumen; costos; alertas; configuración de zonas y tipos de servicio; y un dashboard de KPIs. Páginas: `TMSDashboard`, `TMSVehiculos`, `TMSViajes`, `TMSRutas`, `TMSConductores`, `TMSDespachos`, `TMSDocumentos`, `TMSCostos`, `TMSLiquidaciones`, `TMSOTIF`, `TMSPlaneacion`, `TMSTorreControl`, `TMSTracking`.

---

## DMS — Gestión Documental

Gestión documental empresarial con firma electrónica y BPM real. Color: `#0E7490`. 13 páginas.

Repositorio de documentos con versiones, metadatos y campos configurables; carpetas y categorías; expedientes; búsqueda; portal externo e integraciones; retención (control de vencimientos); auditoría (registro y consulta de acciones). Dos capacidades destacadas:

- **Firma electrónica** (`DMSFirmas.tsx`): solicitar firma, firmar, rechazar — con firmante, orden de firma y estado (pendiente/firmado)
- **Motor de workflow BPM** (`DMSWorkflow.tsx`): plantillas de flujo con pasos, instancias por documento, avanzar paso e historial, cancelar instancia

---

## GH — Gestión Humana (HCM)

Human Capital Management. Color: `#BE185D`. 11 páginas.

Colaboradores y contratos; nómina (períodos, liquidaciones, novedades y detalle); capacitaciones (asignaciones y vencimientos); evaluaciones de desempeño; incapacidades; vacaciones; reclutamiento (vacantes, postulaciones, entrevistas); conductores (con accidentes, documentos y alertas de vencimiento de licencias/exámenes); configuración organizacional (áreas, cargos, sedes, centros de costo, empresas); dashboards de ausentismo y alertas. También embebe rutas de **SST** (incidentes, inspecciones, riesgos) en una pestaña propia (`GHSST.tsx`) — coexiste con el módulo SST independiente (ver abajo).

---

## APS — Planeación Avanzada

Advanced Planning & Scheduling. Color: `#7C3AED`. 13 páginas.

Pronósticos de demanda; planes de producción/distribución; capacidad y carga-capacidad; distribución e inventario óptimo; MRP con órdenes sugeridas; restricciones y parámetros; recursos, ubicaciones y productos de planeación; escenarios y simulaciones (`APSEscenarios.tsx`); colaboración/consenso y ciclos de revisión S&OP; KPIs diarios y dashboard. Incluye `APSAI.tsx` — ver la nota sobre páginas "IA" más abajo.

---

## ERP — Financiero / Contable

Módulo financiero y contable completo (no es un stub). Color: `#1A3A6B`. 11 páginas.

Contabilidad (cuentas y comprobantes, centros de costo); cuentas por cobrar y por pagar (con antigüedad de cartera); tesorería (bancos, cuentas, movimientos); presupuestos; proyectos y rentabilidad; activos fijos; compras (requisiciones y órdenes); consolidación multi-empresa; tributación; reportes financieros (balance general, estado de resultados, flujo de caja); configuración (numeraciones, tasas de cambio, integraciones).

---

## SCM — Cadena de Suministro

Supply Chain Management. Color: `#0C4D8C`. 11 páginas.

Proveedores (con evaluaciones), solicitudes y órdenes de compra tienen respaldo completo en el backend. Las secciones de inventario, logística, planificación, devoluciones y riesgos existen como pantallas en el frontend pero **aún no todas tienen endpoints dedicados** — es el módulo con mayor brecha entre interfaz y backend real.

---

## SST — Seguridad y Salud en el Trabajo

Color: `#C53030`. 10 páginas.

Incidentes, inspecciones, EPP (equipo de protección personal), capacitaciones, documentos, riesgos e indicadores, con dashboard propio. Nota: existe tanto como módulo independiente (`sst.py`) como embebido dentro de GH/HCM (rutas `/sst/incidentes`, `/sst/inspecciones`, `/sst/riesgos` en `hcm.py` + pestaña `GHSST.tsx`) — la fuente de verdad para cada caso de uso depende de si se accede desde el módulo SST o desde GH.

---

## QMS, LMS y CRM (resumen)

- **QMS — Calidad** (`#059669`, 13 páginas): procesos (con árbol jerárquico), procedimientos, auditorías, hallazgos, no conformidades, CAPAs, mejoras, riesgos, gestión de cambios, quejas, encuestas, indicadores (tablero, sincronizar, importar), evaluación de proveedores, matriz de calidad.
- **LMS — Aprendizaje corporativo** (`#D97706`, 14 páginas): cursos, programas, rutas de aprendizaje, inscripciones, evaluaciones y banco de preguntas, certificaciones, competencias, gamificación/ranking, foros, onboarding, escuelas/facultades, instructores, reportes.
- **CRM — Clientes** (`#DC2626`, 13 páginas): leads, oportunidades, clientes/contactos/cuentas clave, cotizaciones, contratos, tickets, interacciones, campañas, encuestas, rentabilidad por cliente, dashboards de KPIs.

---

## Funcionalidades Transversales

### Scanner móvil (real y funcional)
`ScannerMovil.tsx` + endpoint `scan_sessions.py`: convierte un celular en un lector remoto de QR/código de barras. El backend mantiene sesiones de escaneo en memoria (TTL de 1 hora); el celular se abre escaneando un QR que apunta a la IP LAN del equipo host, y cualquier pantalla del sistema que esté escuchando esa sesión recibe los códigos escaneados en tiempo real. No requiere autenticación en el celular.

### Páginas "IA" (`*IA.tsx`) — son maquetas, no IA real
Existen 7 páginas con sufijo IA: `CRMIA`, `DMSIA`, `EAMIA`, `GRCIA`, `LMSIA`, `MESIA`, `QMSIA` (más `APSAI.tsx`). **Ninguna llama a un modelo de lenguaje real** — son maquetas de interfaz: listas de alertas fijas en el código, estados de "clasificando/extrayendo" simulados con `setTimeout`, y paneles de chat cuyas respuestas se eligen al azar (`Math.random()`) de un arreglo de respuestas predefinidas. No hay integración con OpenAI/Anthropic/ningún LLM en `requirements.txt` ni en `package.json`. Documentado aquí explícitamente para que no se asuma una capacidad que no existe.

---

## AGS — Agenda de Servicios

Módulo para negocios de servicio con cita previa: salones de belleza, barberías, spa,
salones de uñas, plomeros, albañiles, electricistas y técnicos a domicilio. Resuelve las
tres cosas que este tipo de negocio necesita y normalmente lleva en un cuaderno: **la
agenda**, **el precio de cada servicio** y **cuánto ha dejado cada cliente**.

**Workspace**: `ags` · color `#A21CAF` · ruta base `/ags` · prefijo de API `/api/v1/ags`
· prefijo de tablas `ags_`

### Secciones (7 internas + 1 pública)

| Ruta | Qué hace |
|------|----------|
| `/ags` | Tablero: cómo va el día (citas, facturado, ocupación) y el mes (ingresos vs. mes anterior, ticket promedio, comisiones, inasistencias) |
| `/ags/agenda` | Vista de día con una columna por profesional. Clic en un espacio libre agenda; clic en una cita abre sus acciones |
| `/ags/clientes` | Directorio con métricas de valor: total gastado, ticket promedio, última visita, días sin venir y saldo pendiente |
| `/ags/ingresos` | Cinco vistas del periodo: evolución, producción del equipo, servicios, clientes y cierre de caja |
| `/ags/servicios` | Catálogo: categorías y servicios con precio, duración, costo de insumos y margen |
| `/ags/equipo` | Personas, jornada por día de la semana, comisión, servicios que presta y bloqueos de agenda |
| `/ags/config` | Datos del negocio, horario general, políticas de agenda, reserva online y plantilla del recordatorio |
| `/reservar/{slug}` | **Página pública sin login**: el cliente se agenda, consulta o cancela su cita |

### Reglas de negocio que aplica el backend

- **Sin doble reserva**: al agendar o reprogramar se valida que el profesional no tenga otra
  cita activa que se cruce, ni una ausencia registrada. Una cita cancelada o con inasistencia
  libera el horario y deja de bloquear. Se puede desactivar con `permite_sobrecupo`.
- **Disponibilidad calculada, no adivinada**: `GET /ags/agenda/disponibilidad` parte de la
  jornada de cada persona, le resta las citas tomadas y las ausencias, y devuelve solo los
  espacios donde cabe completo un servicio de la duración pedida. Respeta el día no laboral
  del negocio y la anticipación mínima.
- **Ciclo de vida con transiciones válidas**: `AGENDADA → CONFIRMADA → EN_CURSO → COMPLETADA`,
  con salida a `CANCELADA` / `NO_ASISTIO`. **Completar exige que la cita esté cobrada**: es el
  punto donde el trabajo se vuelve ingreso y dejarlo pasar sin pago descuadra la caja.
- **Precio histórico congelado**: cada línea de la cita guarda copia del nombre y del precio
  del momento. Si mañana sube la tarifa, los ingresos ya registrados no cambian.
- **Comisión solo sobre mano de obra**: se calcula sobre los servicios, nunca sobre materiales
  (los pone el negocio) ni sobre la propina (va completa al profesional).
- **Anticipos**: cada cita acepta abonos parciales con su propio medio de pago, para trabajos
  largos que se pagan por partes (una obra de albañilería).
- **Hora local del negocio**: el servidor corre en UTC, así que el módulo usa
  `America/Bogota` para la agenda del día, el cierre de caja y el "no agendar en el pasado".
  Sin esto un pago recibido a las 8pm caería en la caja del día siguiente.

### Servicios a domicilio

Los oficios que van donde el cliente (plomería, albañilería, electricidad) se modelan con dos
banderas por servicio: `permite_domicilio` (la cita pide dirección, y si se deja vacía toma la
del cliente) y `cobra_materiales` (al cobrar se capturan los insumos aparte de la mano de obra).

### Reserva online (página pública)

El cliente final se agenda solo, sin llamar y sin cuenta. La página vive en
**`/reservar/{slug}`**, fuera de `ProtectedRoute`, y se configura en `/ags/config`.

**Se entrega apagada** (`reserva_online_activa = false`): mientras lo esté, la página
responde que el negocio no está recibiendo reservas. Conviene activarla solo cuando ya haya
equipo con jornada y catálogo publicado.

Flujo de 4 pasos, pensado para el celular: servicio → quién atiende (o «cualquiera
disponible») → día y hora sobre los cupos reales → nombre y teléfono. Al final entrega un
código con el que el cliente puede **consultar o cancelar** su cita desde la misma página.

**Lo que expone y lo que no.** Los endpoints `/ags/publico/{slug}/*` devuelven a propósito el
mínimo: catálogo activo (sin `costo_insumos`, sin margen, sin comisión), nombres y colores del
equipo, y horas libres. Nunca ingresos, comisiones, listado de clientes ni datos de otras
citas. Usan un cliente HTTP aparte (`frontend/src/api/publico.ts`) porque `apiClient`
adjunta el token guardado y ante un 401 redirige a `/login` — un visitante sin sesión no debe
terminar en una pantalla de login.

**Frenos contra el abuso**, todos configurables:

| Regla | Para qué |
|-------|----------|
| `dias_max_anticipacion` (30) | Que nadie aparte una hora a un año |
| `max_citas_pendientes_cliente` (3) | Evita reservas en masa desde un mismo teléfono |
| `anticipacion_minima_min` | No ofrecer horas encima del momento actual |
| `horas_min_cancelacion` (4) | Plazo para cancelar por internet |
| `requiere_confirmacion_online` | La reserva entra `AGENDADA` y el negocio la confirma |
| `permite_cancelar_online` | Apagarlo obliga a llamar para cancelar |

**Identidad por teléfono**: si el número ya existe se reutiliza la ficha del cliente con todo
su historial, en lugar de crear un tercer registro de la misma persona. Consultar o cancelar
exige **código + teléfono**, para que adivinar un consecutivo no alcance para ver la cita de
otro.

Las citas que entran por internet quedan con `origen = ONLINE`, se marcan con un icono en la
agenda y el tablero avisa cuántas llegaron sin confirmar: el negocio no eligió esa hora, solo
la recibió.

### Recordatorios por WhatsApp

`POST /ags/citas/{id}/recordatorio` arma el mensaje desde la plantilla configurable y devuelve
un enlace `wa.me` listo para abrir, agregando el indicativo `57` cuando el número viene con 10
dígitos. **El sistema no envía nada por su cuenta**: entrega el texto para que el negocio lo
revise antes de mandarlo.

### Reportes

- `/reportes/ingresos` — serie por día, semana o mes con servicios, materiales, descuentos,
  propinas, comisiones y utilidad (descontando el costo de insumos del catálogo)
- `/reportes/por-profesional` — producción, comisión a pagar y **ocupación** (minutos vendidos
  sobre minutos de jornada configurada en el rango)
- `/reportes/por-servicio` — incluye **ingreso por hora**, que ordena mejor que el ingreso
  total: un servicio caro de tres horas puede rendir menos que uno barato de veinte minutos
- `/reportes/por-cliente` — ranking con saldo pendiente y días sin venir
- `/reportes/caja` — cuadre del día por medio de pago (Efectivo, Nequi, Daviplata, tarjeta,
  transferencia, QR), calculado sobre los pagos recibidos ese día

### Datos sembrados

`lifespan()` en `backend/app/main.py` crea la fila única de configuración, **9 categorías** y
**22 servicios de ejemplo** con precio y duración de referencia del mercado colombiano, para
que el módulo sea usable sin configurar nada primero. Equipo y clientes empiezan vacíos.

### Tablas (12)

`ags_config`, `ags_categoria_servicio`, `ags_servicio`, `ags_profesional`,
`ags_profesional_servicio`, `ags_horario_profesional`, `ags_ausencia`, `ags_cliente`,
`ags_cita`, `ags_cita_servicio`, `ags_cita_material`, `ags_pago_cita`

### Pendiente / no implementado

- **Paquetes o bonos prepagados** (ej. 10 cortes pagados por anticipado).
- **Envío automático** de recordatorios (hoy es un enlace que se abre manualmente).
- **Citas recurrentes** (el cliente que viene cada 15 días): el modelo ya reserva el origen
  `RECURRENTE`, pero no hay generación automática.
- **Sin límite por IP** en la reserva online: los frenos son por teléfono y por cantidad de
  citas pendientes, no hay rate limiting de infraestructura.

---

## Administración

### Usuarios (`/usuarios`)
- CRUD completo de usuarios del sistema
- Restablecimiento de contraseña sin conocer la contraseña actual
- Desactivación (soft-delete) — no aplica al propio usuario
- KPIs por rol en tiempo real
- Rol asignable: **cualquier rol creado dinámicamente en el sistema** (no limitado a valores fijos)

### Roles y Permisos (`/usuarios/roles`)

Sistema de roles completamente dinámico con dos vistas:

**Vista Roles (tarjetas):**
- Una tarjeta por rol con chips de módulos habilitados, color identificador y conteo de usuarios
- Botones de editar y eliminar (eliminar bloqueado si el rol tiene usuarios asignados)

**Vista Matriz de Permisos:**
- Filas = 17 módulos del sistema (con icono y color)
- Columnas = todos los roles activos
- Celda: ✓ (acceso total), `N/T` (acceso parcial — solo CI tiene sub-permisos), `—` (sin acceso)

**Dialog de creación/edición — pestaña Permisos:**
- CI muestra 13 checkboxes individuales (por sub-sección: dashboard, estibas, movimientos…)
- Los 16 módulos restantes tienen un toggle on/off
- Botones "Activar todos" / "Desactivar todos" + toggle de grupo para CI

**Roles del sistema (no eliminables):**

| Rol | Descripción |
|-----|-------------|
| ADMINISTRADOR | Acceso total |
| SUPERVISOR_LOGISTICO | Todo excepto administración de usuarios |
| OPERADOR_BODEGA | Operaciones de bodega |
| AUDITOR | Acceso de lectura ampliado |
| CONSULTA | Solo visualización |
| CONDUCTOR | Acceso a módulos de transporte |

Los roles adicionales se crean libremente desde la interfaz.

---

## pgAdmin — Gestor Visual de Base de Datos

**Acceso:** http://localhost:5050

| Campo | Valor por defecto |
|-------|------------------|
| Email | `admin@icoltrans.com.co` |
| Password | `admin123` |

### Primera conexión al servidor PostgreSQL
1. Clic en **Add New Server**
2. Pestaña **General** → Nombre: `ICOLTRANS`
3. Pestaña **Connection**:
   - Host: `postgres` (nombre del servicio Docker, no `localhost`)
   - Port: `5432`
   - Database: `control_inventarios`
   - Username: `ci_user`
   - Password: valor de `POSTGRES_PASSWORD` en `.env`
4. **Save**

---

## API REST — Endpoints Principales

```
# Autenticación
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/auth/change-password

# Control de Inventarios — Estibas
GET    /api/v1/estibas/kpis
GET    /api/v1/estibas?page=1&page_size=50&search=XXX
POST   /api/v1/estibas
POST   /api/v1/estibas/bulk
GET    /api/v1/estibas/{id}/trazabilidad

# Movimientos
POST   /api/v1/movimientos
POST   /api/v1/movimientos/bulk
POST   /api/v1/movimientos/carga-masiva
POST   /api/v1/movimientos/descarga-masiva
GET    /api/v1/movimientos/recientes

# Ubicaciones
GET    /api/v1/ubicaciones
POST   /api/v1/ubicaciones
PUT    /api/v1/ubicaciones/{id}
DELETE /api/v1/ubicaciones/{id}       # Soft-delete

# Dashboard y Alertas
GET    /api/v1/dashboard
GET    /api/v1/dashboard/retorno?bodega_id=   # Promedio retorno por mes, filtrable por bodega
GET    /api/v1/alertas?resuelta=false&nivel=CRITICA
GET    /api/v1/alertas/no-leidas/count
PATCH  /api/v1/alertas/{id}/resolver        # Body: { observacion: string }
PATCH  /api/v1/alertas/{id}/leer

# Estibas — resolución de faltantes
POST   /api/v1/estibas/{id}/recuperar-faltante   # Body: { observacion, ubicacion_id? }
POST   /api/v1/estibas/{id}/confirmar-perdida     # Body: { observacion }
GET    /api/v1/estibas/stock-minimo/resumen

# Ubicaciones — stock mínimo
GET    /api/v1/ubicaciones/{id}/stock-minimo
POST   /api/v1/ubicaciones/{id}/stock-minimo
PUT    /api/v1/ubicaciones/{id}/stock-minimo/{sm_id}
DELETE /api/v1/ubicaciones/{id}/stock-minimo/{sm_id}

# Mantenimiento
GET    /api/v1/mantenimientos/
POST   /api/v1/mantenimientos/
DELETE /api/v1/mantenimientos/{id}
GET    /api/v1/mantenimientos/reporte-costos

# Usuarios
GET    /api/v1/usuarios/
POST   /api/v1/usuarios/
PUT    /api/v1/usuarios/{id}
DELETE /api/v1/usuarios/{id}          # Soft-delete (desactivar)
PUT    /api/v1/usuarios/{id}/reset-password
GET    /api/v1/usuarios/roles-info

# Roles
GET    /api/v1/roles/
POST   /api/v1/roles/
PUT    /api/v1/roles/{id}
DELETE /api/v1/roles/{id}

# TarifaX
GET    /api/v1/tarifax/template
POST   /api/v1/tarifax/merge

# WMS — Catálogos configurables
GET/POST/PUT/DELETE  /api/v1/wms/paises/
GET/POST/PUT/DELETE  /api/v1/wms/ciudades/?pais_id=
GET/POST/PUT/DELETE  /api/v1/wms/tipos-zona/
GET/POST/PUT/DELETE  /api/v1/wms/tipos-ubicacion/
GET/POST/PUT/DELETE  /api/v1/wms/unidades-medida/
GET/POST/PUT/DELETE  /api/v1/wms/categorias-producto/
GET/POST/PUT/DELETE  /api/v1/wms/familias-producto/?categoria_id=

# EAM — Neumáticos (operaciones masivas)
POST   /api/v1/eam/neumaticos/bulk                 # Creación masiva (Excel), llantas nuevas
POST   /api/v1/eam/neumaticos/bulk-delete           # Eliminación masiva (requiere confirmación="ELIMINAR")
POST   /api/v1/eam/neumaticos/inspecciones/bulk     # Inspecciones masivas (Excel), resuelve por código
POST   /api/v1/eam/neumaticos/baja/bulk             # Descartes masivos (Excel), resuelve por código
POST   /api/v1/eam/neumaticos/movimiento            # Instalación/rotación/desmontaje/reencauche/baja
POST   /api/v1/eam/neumaticos/rotacion-intercambio  # Intercambio de posición entre dos llantas
GET    /api/v1/eam/neumaticos/layout/{activo_id}    # Diagrama de posiciones del vehículo
```

Documentación interactiva completa en `/api/docs`.

---

## Cargue Masivo desde Excel

Disponible en **Estibas** y **Movimientos**.

### Flujo
1. Botón desplegable → **Cargue Masivo**
2. Descargar plantilla Excel oficial (incluye hoja de Instrucciones)
3. Completar datos desde la fila 2
4. Subir el archivo → revisar vista previa → confirmar
5. El sistema procesa cada fila de forma independiente y reporta éxitos y errores por fila

### Campos requeridos — Estibas
| Campo | Valores aceptados |
|-------|------------------|
| `codigo_interno` | Código único (ej: EST-001) |
| `tipo` | MADERA · PLASTICO · METALICA · CARTON |
| `tipo_propietario` | PROPIA · CLIENTE · PROVEEDOR · ALQUILADA |
| `fecha_ingreso` | Formato YYYY-MM-DD |

### Campos requeridos — Movimientos
| Campo | Valores aceptados |
|-------|------------------|
| `estiba_id` | ID numérico de la estiba |
| `tipo` | CARGA · DESCARGA · TRANSFERENCIA · RETORNO · RECEPCION · REPARACION · BAJA · DISPOSICION_FINAL · INVENTARIO |

---

## Base de Datos — Notas de Migración

### Columna `usuarios.rol` — VARCHAR (desde v2.0.0)
La columna `rol` de la tabla `usuarios` fue cambiada de tipo `ENUM (rolusuario)` a `VARCHAR(100)`. Esto permite asignar cualquier rol dinámico creado en la tabla `roles`.

- En ambientes nuevos: la columna se crea como VARCHAR automáticamente vía `create_all()`.
- En ambientes existentes (instalados antes de v2.0.0): ejecutar la migración SQL incluida en `alembic/versions/002_rol_varchar.py`, o manualmente:
```sql
ALTER TABLE usuarios ALTER COLUMN rol TYPE VARCHAR(100) USING rol::text;
DROP TYPE IF EXISTS rolusuario;
```

---

## Identidad Visual

| Token | Valor |
|-------|-------|
| Primary (CI) | `#32AC5C` |
| Primary dark (CI) | `#27884A` |
| GRC | `#6D28D9` |
| Background (page) | `#060C1A` |
| Card background | `#0F1E35` |
| Sidebar | `#111827` |
| WorkspacePanel | `#060C1A` (52px) |

---

## Escalabilidad

- Pool de conexiones PostgreSQL (20 + 40 overflow)
- Índices optimizados en todos los campos de búsqueda y filtros
- Paginación en todos los listados
- Lazy loading de relaciones SQLAlchemy
- GZIP en respuestas
- Redis para caché (preparado)
- Soft-delete en ubicaciones y usuarios para preservar integridad referencial
- TARIFARIO_SICETAC.xlsx en caché en memoria (evita releer 41 MB por cruce)

---

## Historial de Versiones

### v2.7.0 (2026-08-21)

**Catálogo maestro de la plataforma** — la metodología de jerarquías, para todos los módulos

El CMMS resolvió la estandarización con tablas dedicadas por catálogo. Eso funciona cuando el
catálogo lleva atributos propios (la referencia de una llanta guarda su profundidad inicial,
el modelo de un vehículo su motor y sus ejes), pero replicarlo para los ~190 campos de texto
libre de los otros 15 módulos serían decenas de tablas casi idénticas, cada una con su CRUD y
su pantalla.

De ahí un modelo único, `catalogo_maestro`, con dos discriminadores (`modulo` + `tipo`) y
jerarquía por auto-referencia (`padre_id`), que cubre listas planas y cadenas de varios
niveles con un solo CRUD y un solo componente de interfaz.

- **Registro declarativo** (`CATALOGOS_REGISTRO`): 60 catálogos declarados con su etiqueta,
  descripción y de quién dependen. Agregar uno a un módulo es una línea, no una tabla ni una
  pantalla. La interfaz se arma sola desde el registro
- **Jerarquías reales validadas en el backend**: país → departamento → ciudad, sede → área,
  categoría → subcategoría, serie → subserie documental, tipo de peligro → peligro. Se
  rechaza colgar un valor de un padre del tipo equivocado, dejar sin padre un catálogo que lo
  exige, ponerle padre a uno plano, o formar un ciclo
- **`GLOBAL` para lo compartido**: geografía, sedes, áreas, centros de costo, cuentas del PUC,
  unidades de medida y monedas. Que cada módulo tuviera su propia lista de ciudades sería el
  mismo problema de duplicación un nivel más arriba
- **Validación reutilizable**: `resolver_valor_catalogo()` la puede llamar cualquier endpoint
  de cualquier módulo antes de guardar. Que la pantalla muestre una lista no impide que por
  API llegue texto libre
- **Componentes**: `SelectorCatalogo` (un nivel), `SelectorCatalogoJerarquico` (cascada),
  `SelectorUbicacionGeografica` (atajo país/departamento/ciudad) y `AdminCatalogos` (la
  administración de un módulo completo, que se arma desde el registro)
- **Página `/catalogos`** con selector de módulo y navegación por niveles con rastro de migas
- 271 valores sembrados en 14 módulos, con los 33 departamentos y 55 ciudades de Colombia
  con su código DANE
- **Adoptado en Gestión Humana** como primera prueba real: el tipo de documento salió de una
  constante del código (`['CC','CE','PA','NIT','TI']`) al catálogo, las ciudades pasaron de
  texto libre a la lista compartida, y `/gh/config` tiene su pestaña de catálogos

Un detalle de PostgreSQL que costó encontrar: una restricción `UNIQUE` trata los `NULL` como
distintos, así que `uq(modulo, tipo, nombre, padre_id)` **no protegía los catálogos planos** —
cada reinicio del backend volvía a insertar todos sus valores. Se resolvió con un índice único
parcial para el caso `padre_id IS NULL`, más una deduplicación en el arranque.

**Pendiente**: adoptar los selectores en los formularios del resto de módulos. La base y los
valores ya están; falta reemplazar cada campo de texto libre por su selector, módulo por
módulo.

### v2.6.0 (2026-08-21)

**CMMS · Catálogo jerárquico de vehículos y equipos**

La ficha técnica del activo se llenaba a mano y terminaba con "Kenworth", "KENWORTH" y
"Ken worth" como tres marcas distintas, lo que arruina cualquier reporte por marca o línea.
Ahora se preconfigura, con el mismo criterio del catálogo de llantas.

- Jerarquía **tipo de activo → marca → línea → modelo**, más catálogos de motores y
  combustibles. 5 tablas nuevas (`eam_marca_activo`, `eam_linea_activo`,
  `eam_modelo_activo`, `eam_motor_activo`, `eam_tipo_combustible`) y columna
  `eam_activo.linea`
- Las marcas se acotan por tipo: al crear un montacargas no aparecen marcas de
  tractocamión. Una marca sin tipo queda como general y sirve para cualquiera; el mismo
  nombre puede existir en tipos distintos (Toyota hace carros y montacargas)
- El **modelo es la hoja y lleva la ficha técnica** (motor, combustible, ejes, capacidad,
  tanque, vida útil), que el activo hereda al crearse — igual que referencia+dimensión
  aporta la profundidad inicial de una llanta. Solo se hereda lo que el activo no traiga
- Cascada de listas desplegables en el alta del activo; cambiar un nivel invalida los de
  abajo
- **El backend valida contra el catálogo** en crear y editar, y normaliza el nombre a la
  grafía del catálogo: no basta con que la interfaz muestre listas, porque por API se podía
  seguir mandando texto libre
- El tipo de combustible pasó de texto libre a catálogo
- Administración por columnas en `/eam/config` → Catálogos. Borrar algo en uso lo desactiva
  en lugar de eliminarlo, para no romper el histórico
- Semilla de 20 marcas, 38 líneas, 7 motores y 6 combustibles del mercado colombiano, más
  rescate de las marcas y modelos ya escritos a mano en los activos existentes

**CMMS · Llantas por Vehículo y lotes de reencauche**

- El selector de vehículo pasó de desplegable plano a búsqueda por texto (placa, código,
  nombre, marca, modelo, tipo, propietario). Cada opción muestra ruedas montadas sobre las
  esperadas, aviso de esquema sin configurar, origen y alerta de llantas
- Filtros por tipología, marca y línea del vehículo. El estado de las llantas (esquema de
  ejes, montaje) quedó como información de cada opción y no como filtro: es el estado de
  las llantas, no una categoría del vehículo
- Filtros del panel de almacén (código, marca, referencia, DOT, medida, vida, bodega) con
  atajo a la medida ya montada en el vehículo elegido
- El lote de reencauche se identifica por su **número de remisión** y no por un código
  aparte: la remisión es el documento real con el que las llantas salen y se cruza contra la
  factura. Repetirla avisa qué lote ya la usa y en qué fecha
- El alta de un activo ya no pregunta estado ni criticidad: entra operativo. Ambos siguen
  editables desde la ficha

### v2.5.0 (2026-08-20)

**AGS · Reserva online** — la agenda se abre al público

- Página pública `/reservar/{slug}`, sin login, en 4 pasos y pensada para celular
- Endpoints `/ags/publico/{slug}/*` que exponen solo el mínimo: catálogo activo sin costos
  ni márgenes, nombres del equipo y horas libres
- Cliente HTTP aparte (`api/publico.ts`) para que un visitante sin sesión no sea redirigido
  a `/login` por el interceptor de 401
- Identidad del cliente por teléfono: reutiliza su ficha e historial en vez de duplicarlo
- Consulta y cancelación con código + teléfono, con plazo mínimo configurable
- Frenos contra abuso: tope de citas pendientes por cliente, ventana máxima de
  anticipación y anticipación mínima
- 8 columnas nuevas en `ags_config` y panel de control en `/ags/config` con el enlace listo
  para copiar
- Las citas `ONLINE` se marcan en la agenda y el tablero avisa las que llegan sin confirmar
- Fila de `ags` agregada a la matriz de permisos de `Roles.tsx`

### v2.4.0 (2026-08-20)

**Nuevo módulo AGS — Agenda de Servicios** (21.º módulo)

Módulo completo para negocios de servicio con cita previa (salones, barberías, plomeros,
albañiles, técnicos a domicilio): agenda con una columna por profesional, catálogo de
servicios con precio y duración preconfigurados, e ingresos trazables por cliente,
profesional y servicio.

- 12 tablas nuevas (`ags_*`), 40+ endpoints bajo `/api/v1/ags`
- 7 páginas de frontend + 2 diálogos (agendar y cobrar)
- Validación de doble reserva y cálculo real de disponibilidad a partir de la jornada
- Ciclo de vida de la cita con transiciones válidas; completar exige cobro
- Comisiones, propinas, materiales, anticipos y cierre de caja por medio de pago
- Recordatorios por WhatsApp mediante enlace `wa.me` (no envía por su cuenta)
- Hora local `America/Bogota` para agenda y caja, en lugar del UTC del servidor
- Semilla de 9 categorías y 22 servicios con precios de referencia del mercado colombiano
- i18n en los 10 idiomas del proyecto

### v2.3.0 (2026-08-18)

#### EAM — Neumáticos: ciclo de vida completo y operaciones masivas
- Catálogos y ciclo de vida: zonas, bandas de reencauche, motivos de fin de vida, ajustes de valor, esquemas de vehículo, trabajos/periodicidad, reesculturado, vidas del neumático, congelado de datos e informe consolidado/histórico
- Validaciones reales de negocio en movimientos: consistencia cronológica contra inspecciones previas, bloqueo de montaje si la llanta está de baja/en reencauche/ya instalada en otro vehículo, bloqueo de posición ya ocupada (instalación y rotación)
- Unifica las pestañas "Vehículo/Diagrama" e "Inspecciones" en una sola pestaña "Llantas por Vehículo"; nueva opción "Agregar llanta desde bodega" con las mismas validaciones de negocio que el resto de movimientos
- Corrige drag & drop (faltaba `dataTransfer.setData`) y agrega alternativas por botón para montar, rotar (incluida rotación en el rin) e inspeccionar por sesión
- Numeración secuencial de posiciones en el diagrama (Pos. 1, 2, 3…)
- **Inspecciones y descartes masivos por archivo Excel**, reutilizando las validaciones del movimiento individual (`POST /eam/neumaticos/inspecciones/bulk`, `POST /eam/neumaticos/baja/bulk`); reubica "Importar Excel" de llantas nuevas de la pestaña Consultas a Bodega
- Optimización de rendimiento: aísla diálogos pesados en componentes con estado propio y desmonta el diagrama/tabla de detalle mientras hay cualquier diálogo abierto en esa pestaña (queda tapado por el backdrop de todas formas, evita recalcular layout/estilos de un árbol con decenas de `Tooltip`)

#### EAM — Jerarquía de activos y unificación de vehículos (TMS/Flota → CMMS)
- **Catálogo `EAMTipoActivo`** con bandera `usa_llantas`: determina qué tipos de activo aparecen como vehículo seleccionable en Neumáticos — antes era implícito, ahora es explícito y editable (`GET/POST/PUT/DELETE /eam/tipos-activo`)
- **`/eam/vehiculos-combinados` ahora también incluye vehículos de Gestión de Flotas** (antes solo EAM + TMS), y soporta `?usa_llantas=true` para filtrar solo los que aplican a neumáticos
- **`POST /eam/activos/vincular-externo`**: crea (idempotente) el activo "espejo" en el CMMS la primera vez que se usa un vehículo de TMS/Flota en algo que requiera historial de mantenimiento — evita duplicar el registro maestro del vehículo entre módulos
- **Esquemas de vehículo como categorías reutilizables, no campos por vehículo**: la cantidad de ejes/repuesto/llantas se pre-configura una sola vez como "esquema" (`Activos → Esquemas de vehículo`) y luego cada vehículo solo se le **asigna** una categoría ya creada — no se digitan números eje por eje en cada alta. El antiguo botón "Configurar ejes" en Neumáticos ahora asigna un esquema en vez de pedir números sueltos
- El selector de "Vehículo" en Neumáticos lista EAM + TMS + Flota (filtrados por `usa_llantas`) y vincula automáticamente al CMMS la primera vez que se elige uno externo

#### Documentación
- El README pasa de documentar 5 de 20 módulos en profundidad a documentar los 20 (ERP, SCM, SST, TMS, DMS, MES, GH/HCM, APS, QMS, LMS, CRM y EAM/Neumáticos no tenían sección propia)
- Nueva sección "Funcionalidades Transversales": documenta el Scanner móvil (real) y aclara que las páginas `*IA.tsx` son maquetas de interfaz sin integración real con un LLM
- **Hallazgo real, no solo documental**: los colores de módulo en `Sidebar.tsx` (navegación) y `Roles.tsx` (matriz de permisos) divergieron y ya no coinciden; y **ERP, SCM y SST no están dados de alta en la matriz de permisos de roles** — hoy no se puede restringir el acceso a esos 3 módulos por rol. Documentado en la tabla de módulos; pendiente de decidir si se corrige

### v2.2.0 (2026-06-26)

#### WMS — Catálogos configurables
- **7 catálogos CRUD desde la interfaz**: Países, Ciudades, Tipos de Zona, Tipos de Ubicación, Unidades de Medida, Categorías de Producto y Familias de Producto — administrados desde `/wms/config` sin tocar código
- **Cascada País → Ciudad**: los formularios de Almacenes, Proveedores y Clientes usan selects en cascada; al seleccionar el país se filtran solo las ciudades correspondientes
- **Cascada Categoría → Familia**: en Productos, seleccionar la categoría filtra las familias disponibles; ambos campos son obligatorios
- **Tipo de Zona y Tipo de Ubicación controlados**: eliminado el array estático `TIPOS_UBIC`; ahora los valores provienen del catálogo configurable
- **Patrón sin FK de catálogo**: los valores se almacenan como texto en la entidad padre — no requiere migración de FK en tablas existentes
- **Migraciones Alembic 007 y 008**: crean las 7 tablas de catálogo con índices

#### CI — Dashboard: tiempo promedio de retorno
- **KPI "Tiempo Prom. Retorno"**: días promedio entre el movimiento CARGA y el siguiente RETORNO de la misma estiba (LATERAL JOIN en PostgreSQL, últimos 12 meses). Se muestra en la tercera fila de KPIs junto a Edad Promedio y Costos Acumulados
- **Gráfico de líneas por mes**: LineChart con el promedio de días CARGA→RETORNO agrupado por mes, últimos 12 meses
- **Filtro por bodega de cliente**: selector desplegable sobre el gráfico carga las ubicaciones tipo CLIENTE; al seleccionar una, el gráfico se actualiza mostrando solo los retornos cuya CARGA tenía como destino esa bodega
- **Nuevo endpoint `GET /dashboard/retorno?bodega_id=`**: devuelve `RetornoData` (`tiempo_promedio_dias` + array `retorno_por_mes`) filtrable por ID de ubicación

### v2.1.0 (2026-06-24)

#### CI — Gestión de faltantes y pérdidas
- **Estado PERDIDA**: nuevo estado diferenciado de BAJA para estibas cuya pérdida es confirmada por un supervisor desde el estado FALTANTE. Permite cuantificar pérdidas monetarias por separado de bajas operativas
- **Panel de resolución en detalle de estiba**: cuando una estiba está FALTANTE, aparece un panel naranja con dos acciones supervisadas — "Recuperar faltante" (→ EN_INVENTARIO) y "Confirmar pérdida" (→ PERDIDA). Ambas generan un registro de movimiento en la trazabilidad con la observación del supervisor
- **Trazabilidad completa de resoluciones**: al recuperar o confirmar pérdida se crea un `Movimiento` (tipo RETORNO o BAJA) con `estado_estiba_antes`, `estado_estiba_despues` y observación — la resolución queda visible en la línea de tiempo de la estiba
- **KPI Faltantes en dashboard**: tarjeta con conteo de estibas en estado FALTANTE pendientes de resolución
- **KPI Pérdidas en dashboard**: tarjeta con conteo de estibas PERDIDA y valor total acumulado en COP, para cuantificar el impacto económico de las pérdidas por faltantes confirmados
- **Ubicación coherente con estado**: en el detalle de estiba y en Trazabilidad, la ubicación actual muestra "Desconocida" para FALTANTE y "Pérdida confirmada" para PERDIDA en lugar de la última bodega registrada

#### CI — Manifiestos
- **Descarga PDF sin diálogo del sistema**: botón "Descargar PDF" en el diálogo de detalle del manifiesto genera el archivo directamente con jsPDF. El informe se titula *"INFORME DE MOVIMIENTO DE ESTIBAS"* y el nombre del archivo incluye el número del manifiesto y la marca de tiempo de descarga (`{numero}_{YYYYMMDD_HHMM}.pdf`)
- **Visualización correcta de FALTANTE en manifiesto**: las estibas en estado FALTANTE dentro del diálogo de detalle muestran chip naranja en lugar del checkmark verde de "descargada"

#### CI — Ubicaciones
- **Stock mínimo por tipo de estiba en bodegas**: la configuración de stock mínimo se integra directamente en el formulario de creación/edición de ubicaciones tipo BODEGA. Se puede definir un umbral por tipo de estiba (MADERA, PLASTICO, METAL, CARTON, MIXTA); cuando el stock cae por debajo se genera automáticamente una alerta tipo ADVERTENCIA

#### CI — Alertas
- **Campana con popover en el header**: muestra badge con conteo de alertas no leídas y vista previa de las 5 más recientes; se refresca cada 60 segundos sin recargar la página
- **Dialog de detalle por alerta**: al hacer clic en una fila del módulo de alertas se abre un dialog con la descripción completa de la novedad. Para alertas ESTIBA_FALTANTE carga el detalle de la estiba y del manifiesto involucrado, con acceso directo al detalle de la estiba donde el supervisor puede resolver
- **Observación obligatoria al resolver alertas**: cualquier resolución (desde la tabla o desde el dialog) requiere describir la acción tomada. La observación, la fecha exacta y el nombre del usuario quedan registrados en la base de datos y son visibles al consultar la alerta resuelta

### v2.0.0 (2026-06-22)
- **Expansión a 17 módulos**: la plataforma pasa de 2 apps (CI + TarifaX) a 17 módulos de gestión empresarial (CI, TX, FT, GF, ML, WMS, GH, TMS, DMS, QMS, GRC, LMS, CRM, EAM, MES, APS, Admin)
- **Módulo GRC completo** (10 secciones): Obligaciones, Cumplimiento, Riesgos, Políticas, Controles, Terceros, Auditorías, Hallazgos, Continuidad, Incidentes — con eliminación confirmada (digitación de "ELIMINAR") y campos de selección estandarizados en todas las secciones
- **Módulo Mantenimiento Locativo (ML)**: gestión de mantenimiento de infraestructura física
- **Roles y Permisos rediseñados**: ahora cubre los 17 módulos con vista de tarjetas + matriz de permisos; dialog con permisos agrupados por módulo; toggle por grupo y por sub-sección (CI)
- **Sistema de roles dinámico**: la columna `rol` de usuarios cambia de Enum PostgreSQL a VARCHAR — permite crear y asignar cualquier rol sin restricciones de enum fijo
- **Corrección pantalla en blanco**: los errores de validación Pydantic (array JSON) ahora se formatean correctamente antes de mostrarse en toast, evitando el crash de React
- **Schema de permisos expandido**: `RolPermisos` pasa de 14 a 29 campos, cubriendo todos los módulos del sistema

### v1.4.0
- Login con carrusel animado (Framer Motion)
- pgAdmin integrado en Docker Compose
- Corrección de bug de autenticación (loop 403/401)
- Renombramiento visual del módulo principal

### v1.3.0
- Módulo Mantenimiento de Estibas con costos y filtros
- Reporte Costos por Estiba
- Dashboard con indicadores de edad y costos
- Módulo Usuarios (CRUD completo + restablecer contraseña)
- Módulo Roles y Permisos inicial

### v1.2.0
- Migración TarifaX de Streamlit a React/FastAPI
- Motor de cruce de tarifas con descarga Excel
- Tablero Power BI embebido
- Sidebar con switcher de apps

### v1.0.0
- Control de Inventarios inicial: estibas, movimientos, manifiestos, vehículos, ubicaciones, proveedores, daños, alertas, trazabilidad
- Cargue masivo desde Excel
- Autenticación JWT con roles

---

## Licencia

Propiedad de ICOLTRANS — Industria Colombiana de Logística y Transporte.  
Uso interno exclusivo.
