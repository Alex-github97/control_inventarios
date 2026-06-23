# Plataforma Empresarial ICOLTRANS — Sistema ERP Modular

**Versión 2.0.0** | Industria Colombiana de Logística y Transporte (ICOLTRANS)

Plataforma empresarial unificada con 17 módulos de gestión operativa, diseñada para escala corporativa. Combina logística, transporte, mantenimiento, calidad, GRC y administración en una sola aplicación React con backend FastAPI.

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
        ├── pages/              # 124+ páginas distribuidas en 17 módulos
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

## Módulos del Sistema (17)

La plataforma está organizada en 17 módulos independientes. Cada módulo tiene su propio color identificador y aparece en la matriz de permisos de roles.

| Clave | Módulo | Color |
|-------|--------|-------|
| `ci` | Control de Inventarios | `#16A34A` |
| `tx` | TarifaX | `#D97706` |
| `ft` | Fletes | `#2563EB` |
| `gf` | Gestión de Flotas | `#7C3AED` |
| `ml` | Mantenimiento Locativo | `#EA580C` |
| `wms` | Almacén WMS | `#0891B2` |
| `gh` | Gestión Humana | `#DB2777` |
| `tms` | Transporte TMS | `#0D9488` |
| `dms` | Documentos DMS | `#4F46E5` |
| `qms` | Calidad QMS | `#059669` |
| `grc` | Gobierno GRC | `#6D28D9` |
| `lms` | Aprendizaje LMS | `#B45309` |
| `crm` | CRM Clientes | `#DC2626` |
| `eam` | Activos EAM | `#475569` |
| `mes` | Manufactura MES | `#9333EA` |
| `aps` | Planeación APS | `#0284C7` |
| `admin` | Administración | `#B91C1C` |

---

## CI — Control de Inventarios

Módulo central de gestión de estibas, movimientos y logística de bodega.

### Secciones

#### Dashboard (`/dashboard`)
- KPIs en tiempo real: estibas totales, disponibles, en tránsito, en cliente, dañadas, manifiestos, alertas
- Tiempo de uso por estiba: edad promedio en meses + histograma de distribución por antigüedad
- Costos acumulados de mantenimiento + gráfico mensual (últimos 12 meses)
- Tendencia de movimientos (30 días), distribución de daños, ocupación de ubicaciones

#### Estibas (`/estibas`)
- Creación individual con generación automática de QR
- Cargue masivo desde Excel (plantilla descargable + validaciones + vista previa)
- Ciclo de vida completo: inventario → tránsito → cliente → retorno
- Búsqueda por código interno, QR o RFID
- KPIs en tiempo real por estado

#### Movimientos (`/movimientos`)
- Registro individual con diálogo guiado
- Cargue masivo desde Excel
- Carga/descarga masiva por manifiesto
- Tipos: CARGA, DESCARGA, TRANSFERENCIA, RETORNO, RECEPCION, REPARACION, BAJA, DISPOSICION_FINAL, INVENTARIO

#### Manifiestos (`/manifiestos`)
- Ciclo: Programado → En Cargue → En Tránsito → Entregado
- Asociación de estibas por manifiesto
- Vinculación con vehículo y conductor

#### Trazabilidad (`/trazabilidad`)
- Línea de tiempo completa de cada estiba
- Registro de ubicación, vehículo, manifiesto, usuario, GPS, fecha

#### Ubicaciones (`/ubicaciones`)
- CRUD completo con soft-delete
- Tipos: BODEGA, PLANTA, PATIO, CLIENTE, PROVEEDOR, VEHICULO, TRANSITO, DISPOSICION_FINAL

#### Proveedores (`/proveedores`)
- Maestro de proveedores con integración SAP preparada

#### Alertas (`/alertas`)
- Motor automático de alertas: Info, Advertencia, Crítica

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

## ML — Mantenimiento Locativo

Gestión de mantenimiento de infraestructura física (instalaciones, equipos fijos, vehículos).

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
GET    /api/v1/alertas?resuelta=false

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
