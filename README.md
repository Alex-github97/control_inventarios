# Control de Inventarios — Plataforma de Trazabilidad de Estibas

**Versión 1.1.0** | Industria Colombiana de Logística y Transporte (ICOLTRANS)

Plataforma empresarial para la gestión, control y trazabilidad completa del ciclo de vida de estibas (pallets). Diseñada para operar a escala corporativa con soporte para millones de estibas y cientos de millones de movimientos.

---

## Arquitectura

```
control-inventarios/
├── backend/          # FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── core/               # Config, Database, Security, Dependencies
│   │   ├── domain/             # Entidades de dominio
│   │   ├── application/        # Servicios y Schemas (incluye bulk)
│   │   ├── infrastructure/     # Modelos ORM, Repos, Integración SAP
│   │   └── api/v1/             # Endpoints REST
│   ├── alembic/                # Migraciones de base de datos
│   └── scripts/                # Seed y utilidades
└── frontend/         # React + TypeScript + Material UI (diseño modern SaaS)
    └── src/
        ├── pages/              # Todas las páginas (incluyendo cargue masivo)
        ├── components/         # Layout, KPICard, StatusChip, etc.
        ├── api/                # Clientes HTTP (axios)
        ├── store/              # Zustand (autenticación)
        └── theme/              # Identidad visual corporativa #32AC5C
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Pydantic 2 |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React 18, TypeScript, Material UI 6 |
| Gráficas | Recharts |
| Animaciones | Framer Motion |
| Importación Excel | SheetJS (xlsx) |
| Estado | Zustand + TanStack React Query |
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

### 3. Levantar con Docker
```bash
docker-compose up -d
```

### 4. Cargar datos iniciales
```bash
docker-compose exec backend python -m scripts.seed
```

### 5. Instalar dependencia de Excel (solo la primera vez)
```bash
docker-compose exec ci_frontend npm install xlsx
```

### 6. Acceder
| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API REST | http://localhost:8000 |
| Docs API (Swagger) | http://localhost:8000/api/docs |
| ReDoc | http://localhost:8000/api/redoc |

---

## Usuarios por Defecto

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `Admin@2025` | Administrador |
| `supervisor` | `Super@2025` | Supervisor Logístico |
| `operador` | `Oper@2025` | Operador de Bodega |

> ⚠️ Cambiar contraseñas en producción.

---

## Módulos del Sistema

### Estibas
- Creación individual con generación automática de QR
- **Cargue masivo desde Excel** (plantilla descargable + validaciones + vista previa)
- Ciclo de vida completo: inventario → tránsito → cliente → retorno
- Búsqueda por código interno, QR o RFID
- KPIs en tiempo real por estado
- Detalle individual con historial completo

### Movimientos
- Registro individual con diálogo guiado
- **Cargue masivo desde Excel** (plantilla descargable + validaciones + vista previa)
- Carga/descarga masiva por manifiesto (endpoints dedicados)
- Tipos: CARGA, DESCARGA, TRANSFERENCIA, RETORNO, RECEPCION, REPARACION, BAJA, DISPOSICION_FINAL, INVENTARIO
- Listado con paginación

### Ubicaciones
- Creación, edición y eliminación (soft-delete) de ubicaciones
- Tipos: BODEGA, PLANTA, PATIO, CLIENTE, PROVEEDOR, VEHICULO, TRANSITO, DISPOSICION_FINAL
- Búsqueda y filtrado
- Vista en tarjetas con capacidad y ciudad

### Trazabilidad
- Línea de tiempo completa de cada estiba
- Registro de: ubicación, vehículo, manifiesto, usuario, GPS, fecha

### Dashboard
- KPIs en tiempo real
- Gráfico de tendencia de movimientos (30 días)
- Distribución de daños por causa
- Ocupación de ubicaciones
- Alertas activas

### Manifiestos
- Ciclo: Programado → En Cargue → En Tránsito → Entregado
- Asociación de estibas por manifiesto
- Vinculación con vehículo y conductor

### Alertas
- Motor automático de alertas
- Niveles: Info, Advertencia, Crítica

### Integración SAP (preparado)
- Capa `SAPProveedorService`: sincroniza maestro de proveedores
- Capa `SAPMovimientoService`: publica movimientos de material
- Configurable vía variables de entorno

---

## API REST — Endpoints Principales

```
POST   /api/v1/auth/login

GET    /api/v1/estibas/kpis
GET    /api/v1/estibas?page=1&page_size=50&search=XXX
POST   /api/v1/estibas                      # Crear individual
POST   /api/v1/estibas/bulk                 # Cargue masivo (JSON array)
GET    /api/v1/estibas/{id}/trazabilidad

POST   /api/v1/movimientos                  # Registrar individual
POST   /api/v1/movimientos/bulk             # Cargue masivo (JSON array)
POST   /api/v1/movimientos/carga-masiva     # Carga masiva por manifiesto
POST   /api/v1/movimientos/descarga-masiva  # Descarga masiva por manifiesto
GET    /api/v1/movimientos/recientes

GET    /api/v1/ubicaciones
POST   /api/v1/ubicaciones
PUT    /api/v1/ubicaciones/{id}
DELETE /api/v1/ubicaciones/{id}             # Soft-delete (activo = false)

GET    /api/v1/dashboard
GET    /api/v1/alertas?resuelta=false
```

Documentación interactiva completa en `/api/docs`.

---

## Cargue Masivo desde Excel

Disponible en **Estibas** y **Movimientos** mediante el botón desplegable junto a "Nueva Estiba" / "Registrar Movimiento".

### Flujo de uso
1. Haz clic en la flecha del botón → **Cargue Masivo**
2. **Paso 1:** Descarga la plantilla Excel oficial (incluye hoja de Instrucciones)
3. Completa los datos desde la fila 2 (la fila 1 son los encabezados)
4. **Paso 2:** Sube el archivo completado
5. Revisa la vista previa y confirma el cargue
6. El sistema procesa cada fila de forma independiente y reporta éxitos y errores

### Campos requeridos — Estibas
| Campo | Descripción |
|-------|-------------|
| `codigo_interno` | Código único (ej: EST-001) |
| `tipo` | MADERA · PLASTICO · METALICA · CARTON |
| `tipo_propietario` | PROPIA · CLIENTE · PROVEEDOR · ALQUILADA |
| `fecha_ingreso` | Formato YYYY-MM-DD |

### Campos requeridos — Movimientos
| Campo | Descripción |
|-------|-------------|
| `estiba_id` | ID numérico de la estiba |
| `tipo` | CARGA · DESCARGA · TRANSFERENCIA · RETORNO · RECEPCION · REPARACION · BAJA · DISPOSICION_FINAL · INVENTARIO |

---

## Identidad Visual

| Token | Valor |
|-------|-------|
| Primary | `#32AC5C` |
| Primary Dark | `#27884A` |
| Background | `#F0F2F5` |
| Sidebar | `#111827` |
| Dark | `#0D1117` |
| Text primary | `#1E293B` |

---

## Escalabilidad

- Pool de conexiones PostgreSQL (20 + 40 overflow)
- Índices optimizados en todos los campos de búsqueda
- Paginación en todos los listados
- Lazy loading de relaciones
- GZIP en respuestas
- Redis para caché (preparado)
- Soft-delete en ubicaciones para preservar integridad referencial

---

## Licencia

Propiedad de ICOLTRANS — Industria Colombiana de Logística y Transporte.  
Uso interno exclusivo.
