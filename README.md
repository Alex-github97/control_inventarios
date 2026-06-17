# Control de Inventarios — Plataforma de Trazabilidad de Estibas

**Versión 1.0.0** | Industria Colombiana de Logística y Transporte (ICOLTRANS)

Plataforma empresarial avanzada para la gestión, control y trazabilidad completa del ciclo de vida de estibas (pallets). Diseñada para operar a escala corporativa global con más de **40 millones de estibas** y cientos de millones de movimientos.

---

## Arquitectura

```
control-inventarios/
├── backend/          # FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── core/               # Config, Database, Security
│   │   ├── domain/             # Entidades de dominio
│   │   ├── application/        # Servicios y Schemas
│   │   ├── infrastructure/     # Modelos, Repos, SAP
│   │   └── api/v1/             # Endpoints REST
│   ├── alembic/                # Migraciones
│   └── scripts/                # Seed y utilidades
└── frontend/         # React + TypeScript + Material UI
    └── src/
        ├── pages/              # Todas las páginas
        ├── components/         # Layout, KPICard, etc.
        ├── api/                # Clientes HTTP
        ├── store/              # Zustand (auth)
        └── theme/              # Identidad visual #32AC5C
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic 2 |
| Base de datos | PostgreSQL 16 (particionable, indexado) |
| Cache | Redis 7 |
| Frontend | React 18, TypeScript, Material UI 6 |
| Gráficas | Recharts |
| Animaciones | Framer Motion |
| Estado | Zustand + React Query |
| Contenedores | Docker + Docker Compose |

---

## Inicio Rápido

### 1. Prerrequisitos
- Docker Desktop instalado y corriendo
- Git

### 2. Configuración
```bash
git clone <repositorio>
cd control-inventarios
cp .env.example .env
# Editar .env con tus valores
```

### 3. Levantar con Docker
```bash
docker-compose up -d
```

### 4. Cargar datos iniciales
```bash
docker-compose exec backend python -m scripts.seed
```

### 5. Acceder
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
- Creación con generación automática de QR
- Ciclo de vida completo (inventario → tránsito → cliente → retorno)
- Búsqueda por código interno, QR o RFID
- KPIs en tiempo real por estado

### Trazabilidad
- Línea de tiempo completa de cada estiba
- Registro de: ubicación, vehículo, manifiesto, usuario, GPS, fecha
- Historial exportable

### Movimientos
- Carga individual y masiva (batch)
- Descarga individual y masiva
- Transferencia, retorno, baja, disposición final
- Registro de evidencias fotográficas

### Manifiestos
- Gestión del ciclo: Programado → En Cargue → En Tránsito → Entregado
- Asociación de estibas por manifiesto
- Vinculación con vehículo y conductor

### Dashboard
- KPIs en tiempo real
- Gráfico de tendencia de movimientos (30 días)
- Distribución de daños por causa
- Ocupación de ubicaciones
- Alertas activas

### Alertas
- Motor automático de alertas
- Niveles: Info, Advertencia, Crítica
- Tipos: Estiba fuera tiempo, contrato por vencer, daño recurrente, etc.

### Integración SAP
- Capa preparada para integración vía OData/REST
- `SAPProveedorService`: sincroniza maestro de proveedores
- `SAPMovimientoService`: publica movimientos de material
- Configurable vía variables de entorno

---

## API REST — Endpoints Principales

```
POST   /api/v1/auth/login
GET    /api/v1/estibas/kpis
GET    /api/v1/estibas?page=1&page_size=50&search=XXX
POST   /api/v1/estibas
GET    /api/v1/estibas/{id}/trazabilidad
POST   /api/v1/movimientos/carga-masiva
POST   /api/v1/movimientos/descarga-masiva
GET    /api/v1/dashboard
GET    /api/v1/alertas?resuelta=false
```

Documentación interactiva completa en `/api/docs`.

---

## Identidad Visual

| Token | Valor |
|-------|-------|
| Primary | `#32AC5C` |
| Primary Dark | `#27884A` |
| Background | `#F5F7F8` |
| Surface | `#FFFFFF` |
| Dark | `#0F172A` |
| Text | `#1E293B` |

---

## Escalabilidad

Diseñado para:
- **+40 millones** de estibas individuales
- **Cientos de millones** de movimientos históricos
- **Múltiples países** y compañías
- **Múltiples centros** logísticos
- **Miles de usuarios** concurrentes

Estrategias implementadas:
- Pool de conexiones PostgreSQL (20 + 40 overflow)
- Índices optimizados en todos los campos de búsqueda
- Paginación en todos los listados
- Lazy loading de relaciones
- GZIP en respuestas
- Redis para caché (preparado)

---

## Licencia

Propiedad de ICOLTRANS — Industria Colombiana de Logística y Transporte.  
Uso interno exclusivo.
