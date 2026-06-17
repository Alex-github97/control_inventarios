# Control de Inventarios + TarifaX — Plataforma Empresarial ICOLTRANS

**Versión 1.3.0** | Industria Colombiana de Logística y Transporte (ICOLTRANS)

Plataforma unificada que integra la gestión de estibas (Control de Inventarios) y el motor de cruce de tarifas (TarifaX) en una sola aplicación React. Diseñada para operar a escala corporativa con soporte para millones de registros.

---

## Arquitectura

```
control-inventarios/
├── backend/          # FastAPI + SQLAlchemy + PostgreSQL + pandas
│   ├── app/
│   │   ├── core/               # Config, Database, Security, Dependencies
│   │   ├── domain/             # Entidades de dominio
│   │   ├── application/        # Servicios y Schemas (incluye bulk)
│   │   ├── infrastructure/     # Modelos ORM, Repos, Integración SAP
│   │   └── api/v1/             # Endpoints REST (incluyendo /tarifax)
│   ├── data/                   # Archivos de datos internos
│   │   ├── TARIFARIO_SICETAC.xlsx      # Base interna TarifaX (no en git)
│   │   └── plantilla_cotizacion_tarifax.xlsx
│   ├── alembic/                # Migraciones de base de datos
│   └── scripts/                # Seed y utilidades
└── frontend/         # React + TypeScript + Material UI (diseño modern SaaS)
    └── src/
        ├── pages/              # Todas las páginas (Control de Inventarios + TarifaX)
        ├── components/         # Layout, Sidebar con switcher de apps, KPICard, etc.
        ├── api/                # Clientes HTTP (axios)
        ├── store/              # Zustand (autenticación)
        └── theme/              # Identidad visual corporativa
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Pydantic 2 |
| Procesamiento de datos | pandas 2.2, openpyxl 3.1 |
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

### 3. Agregar el archivo base de TarifaX (no está en git por su tamaño)
```
Copiar TARIFARIO_SICETAC.xlsx en:  backend/data/TARIFARIO_SICETAC.xlsx
```

### 4. Levantar con Docker
```bash
docker-compose up -d
```

### 5. Cargar datos iniciales
```bash
docker-compose exec backend python -m scripts.seed
```

### 6. Instalar dependencia de Excel del frontend (solo la primera vez)
```bash
docker-compose exec frontend npm install xlsx
```

### 7. Acceder
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

### Control de Inventarios

#### Estibas
- Creación individual con generación automática de QR
- **Cargue masivo desde Excel** (plantilla descargable + validaciones + vista previa)
- Ciclo de vida completo: inventario → tránsito → cliente → retorno
- Búsqueda por código interno, QR o RFID
- KPIs en tiempo real por estado
- Detalle individual con historial completo

#### Movimientos
- Registro individual con diálogo guiado
- **Cargue masivo desde Excel** (plantilla descargable + validaciones + vista previa)
- Carga/descarga masiva por manifiesto (endpoints dedicados)
- Tipos: CARGA, DESCARGA, TRANSFERENCIA, RETORNO, RECEPCION, REPARACION, BAJA, DISPOSICION_FINAL, INVENTARIO
- Listado con paginación

#### Ubicaciones
- Creación, edición y eliminación (soft-delete) de ubicaciones
- Tipos: BODEGA, PLANTA, PATIO, CLIENTE, PROVEEDOR, VEHICULO, TRANSITO, DISPOSICION_FINAL
- Búsqueda y filtrado
- Vista en tarjetas con capacidad y ciudad

#### Trazabilidad
- Línea de tiempo completa de cada estiba
- Registro de: ubicación, vehículo, manifiesto, usuario, GPS, fecha

#### Dashboard
- KPIs en tiempo real: total de estibas, disponibles, en tránsito, en cliente, pendiente retorno, dañadas, manifiestos, alertas, movimientos del día, propias/alquiladas
- **Tiempo de uso por estiba:** edad promedio en meses + histograma de distribución por antigüedad (0–6m, 6–12m, 12–24m, 24–36m, 36m+)
- **Costos acumulados:** total de costos de mantenimiento registrados + gráfico de línea de costos por mes (últimos 12 meses)
- Gráfico de tendencia de movimientos (30 días)
- Distribución de daños por causa
- Ocupación de ubicaciones
- Alertas activas

#### Mantenimiento de Estibas (`/mantenimiento`)
Módulo dedicado para registrar y gestionar el historial de mantenimiento de cada estiba.

- **Registro de mantenimiento:** asociar un costo a una estiba buscándola por ID, con tipo, fecha, proveedor y descripción
- **Tipos soportados:** PREVENTIVO, CORRECTIVO, REPARACIÓN, INSPECCIÓN, LIMPIEZA, PINTURA, REFUERZO
- **Filtros:** por ID de estiba, tipo de mantenimiento, rango de fechas
- **KPIs en página:** total de registros encontrados + suma de costos del filtro activo
- Los costos se acumulan automáticamente al perfil de cada estiba y al dashboard global
- Eliminar registros individuales (acceso operador o superior)

#### Costos por Estiba (`/costos`)
Reporte consolidado del costo total de mantenimiento acumulado por cada estiba.

- Tabla con todas las estibas ordenadas por costo descendente
- Columnas: código interno, estado, propietario, tipo, número de mantenimientos, costo total acumulado (COP)
- **Filtros:** tipo de mantenimiento, estado de la estiba, tipo de propietario
- KPIs en página: total de estibas y suma global de costos acumulados
- Paginación de 20 registros por página

#### Manifiestos
- Ciclo: Programado → En Cargue → En Tránsito → Entregado
- Asociación de estibas por manifiesto
- Vinculación con vehículo y conductor

#### Alertas
- Motor automático de alertas
- Niveles: Info, Advertencia, Crítica

#### Usuarios (`/usuarios`)
Módulo completo de gestión de acceso al sistema. Solo visible y operable por administradores.

- **CRUD completo:** crear, editar, desactivar (soft-delete) usuarios
- **Restablecer contraseña:** sin necesidad de conocer la contraseña actual
- **Roles disponibles:** Administrador, Supervisor Logístico, Operador de Bodega, Auditor, Consulta
- Protección: no es posible desactivar el propio usuario
- KPIs en página: conteo de usuarios activos por rol
- Botón **"Roles"** que lleva a la matriz de permisos

#### Roles y Permisos (`/usuarios/roles`)
Matriz de acceso por módulo para cada rol del sistema.

- Tarjetas resumen por rol con módulos permitidos
- Tabla completa de permisos: cada módulo × cada rol (check / X)
- **Módulos controlados:** Dashboard, Estibas, Movimientos, Trazabilidad, Manifiestos, Vehículos, Ubicaciones, Proveedores, Daños, Alertas, Usuarios, Mantenimiento, Costos

| Rol | Acceso |
|-----|--------|
| Administrador | Todos los módulos |
| Supervisor Logístico | Todo excepto Usuarios |
| Operador de Bodega | Dashboard, Estibas, Movimientos, Trazabilidad, Ubicaciones, Alertas, Mantenimiento |
| Auditor | Todo excepto Usuarios |
| Consulta | Solo Dashboard, Estibas y Trazabilidad |

#### Integración SAP (preparado)
- Capa `SAPProveedorService`: sincroniza maestro de proveedores
- Capa `SAPMovimientoService`: publica movimientos de material
- Configurable vía variables de entorno

---

## TarifaX

Motor de cruce de tarifas migrado desde Streamlit a React/FastAPI. Accesible desde el sidebar de la aplicación usando el switcher **"TarifaX"** en la parte superior izquierda.

### Secciones

#### Tablero (`/tarifax/tablero`)
Dashboard con el reporte de Power BI embebido (métricas de fletes SICETAC). El reporte se carga automáticamente desde Power BI Service.

#### Motor TarifaX (`/tarifax/motor`)
Motor de cruce de tarifas. Permite cruzar el archivo del usuario (DF2) contra la base interna SICETAC (DF1) y descargar el resultado en Excel.

**Flujo de uso:**
1. (Opcional) Descargar la plantilla de cotización
2. Subir el archivo Excel de cotizaciones (DF2) — debe incluir la columna `ORIGEN`
3. Hacer clic en **"Procesar Cruce de Tarifas"**
4. Revisar las métricas del cruce (registros, tasa de coincidencia, etc.)
5. Descargar el archivo resultado (`TarifaX_resultado_YYYYMMDD_HHMMSS.xlsx`)

**Lógica del cruce:**

| Parámetro | Valor |
|-----------|-------|
| Base interna (DF1) | `TARIFARIO_SICETAC.xlsx` |
| Columna clave | `ORIGEN` |
| Tipo de join | LEFT JOIN (DF2 es la tabla principal) |
| Columna precio cliente | `TARIFA_CLIENTE` (de DF2) |
| Columna precio SICETAC | `COSTO_TOTAL_VIAJE` (de DF1) |
| Columna calculada | `variacion_precio = TARIFA_CLIENTE / COSTO_TOTAL_VIAJE` |
| Columna de auditoría | `procesado_en` (timestamp del cruce) |

### Archivo Base Interno (DF1) — TARIFARIO_SICETAC.xlsx

**Ubicación en el proyecto:**
```
control-inventarios/
└── backend/
    └── data/
        └── TARIFARIO_SICETAC.xlsx   ← aquí
```

**Ruta completa en Windows:**
```
C:\Users\yamarchan\OneDrive - ...\control-inventarios\backend\data\TARIFARIO_SICETAC.xlsx
```

**Para actualizar el archivo:**
1. Reemplaza el archivo en esa carpeta con la nueva versión
2. Reinicia el backend para que cargue la versión actualizada:
```bash
docker-compose restart backend
```

> El backend carga DF1 en memoria la primera vez que se ejecuta un cruce y lo mantiene en caché para no releer 41 MB en cada operación. Por eso es necesario reiniciar el contenedor cuando se reemplaza el archivo.

> `TARIFARIO_SICETAC.xlsx` **no está en el repositorio de Git** por su tamaño (41 MB). Debe copiarse manualmente al directorio `backend/data/` en cada nuevo ambiente.

### Plantilla de Cotización

El archivo `plantilla_cotizacion_tarifax.xlsx` sí está en Git y se sirve desde el botón "Descargar plantilla" en el Motor TarifaX. Si necesitas actualizarla:

1. Reemplaza el archivo en `backend/data/plantilla_cotizacion_tarifax.xlsx`
2. No es necesario reiniciar el backend — se sirve directamente desde disco en cada descarga
3. Haz commit del nuevo archivo al repositorio

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

# Mantenimiento de Estibas
GET    /api/v1/mantenimientos/                          # Listar con filtros (estiba_id, tipo, desde, hasta)
POST   /api/v1/mantenimientos/                          # Registrar mantenimiento
DELETE /api/v1/mantenimientos/{id}                      # Eliminar registro
GET    /api/v1/mantenimientos/reporte-costos            # Costos acumulados por estiba (filtrable, paginado)

# Usuarios
GET    /api/v1/usuarios/                                # Listar usuarios activos (admin)
POST   /api/v1/usuarios/                                # Crear usuario (admin)
PUT    /api/v1/usuarios/{id}                            # Editar usuario (admin)
DELETE /api/v1/usuarios/{id}                            # Desactivar usuario — soft-delete (admin)
PUT    /api/v1/usuarios/{id}/reset-password             # Restablecer contraseña (admin)
GET    /api/v1/usuarios/roles-info                      # Matriz de permisos por rol (admin)

GET    /api/v1/tarifax/template             # Descarga plantilla_cotizacion_tarifax.xlsx
POST   /api/v1/tarifax/merge               # Cruce DF2 × TARIFARIO_SICETAC (multipart/form-data)
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

| App | Token | Valor |
|-----|-------|-------|
| Control de Inventarios | Primary | `#32AC5C` |
| Control de Inventarios | Primary Dark | `#27884A` |
| TarifaX | Primary | `#369E4D` |
| TarifaX | Primary Dark | `#1f6130` |
| Ambas | Background | `#F0F2F5` |
| Ambas | Sidebar | `#111827` |
| Ambas | Text primary | `#1E293B` |

---

## Escalabilidad

- Pool de conexiones PostgreSQL (20 + 40 overflow)
- Índices optimizados en todos los campos de búsqueda
- Paginación en todos los listados
- Lazy loading de relaciones
- GZIP en respuestas
- Redis para caché (preparado)
- Soft-delete en ubicaciones para preservar integridad referencial
- DF1 de TarifaX en memoria caché (evita releer 41 MB por cada cruce)

---

## Historial de Versiones

### v1.3.0
- Nuevo módulo **Mantenimiento de Estibas**: registro de costos por estiba con tipos, filtros y KPIs
- Nuevo reporte **Costos por Estiba**: tabla consolidada con costo total acumulado, filtrable
- **Dashboard actualizado**: indicadores de edad promedio de estibas (meses), costos acumulados, histograma de distribución por antigüedad y gráfico de costos por mes
- Módulo **Usuarios** completo: CRUD, restablecer contraseña, desactivar, sin auto-desactivación
- Módulo **Roles y Permisos**: matriz visual de acceso por módulo para cada rol
- Nuevos endpoints REST: `/mantenimientos/`, `/mantenimientos/reporte-costos`, `/usuarios/roles-info`, `/usuarios/{id}/reset-password`

### v1.2.0
- Migración TarifaX de Streamlit a React/FastAPI
- Sidebar con switcher CI / TarifaX
- Motor de cruce de tarifas (DF2 × TARIFARIO_SICETAC) con descarga de resultado en Excel
- Tablero Power BI embebido
- Documentación del archivo DF1 y proceso de actualización

### v1.0.0
- Control de Inventarios inicial: estibas, movimientos, manifiestos, vehículos, ubicaciones, proveedores, daños, alertas, trazabilidad
- Cargue masivo desde Excel para estibas y movimientos
- Autenticación JWT con roles

---

## Licencia

Propiedad de ICOLTRANS — Industria Colombiana de Logística y Transporte.  
Uso interno exclusivo.
