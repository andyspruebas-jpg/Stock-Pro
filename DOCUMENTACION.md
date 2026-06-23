# Documentación del Proyecto - Sistema Quiebra

Sistema de gestión de inventario y análisis inteligente de traspasos para optimizar el stock entre sucursales de la empresa.

## Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Flujo de Datos](#2-flujo-de-datos)
3. [Backend (FastAPI)](#3-backend-fastapi)
4. [Frontend (React)](#4-frontend-react)
5. [Integración con Odoo](#5-integración-con-odoo)
6. [Módulos Principales](#6-módulos-principales)
7. [Autenticación y Seguridad](#7-autenticación-y-seguridad)
8. [Configuración](#8-configuración)
9. [Despliegue](#9-despliegue)

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USUARIO                                   │
│                    (Frontend React)                                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTP Requests
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NGINX                                       │
│                   (Proxy Reverso)                                   │
│                                                                     │
│   /api/*    →  localhost:5176  (Backend FastAPI)                   │
│   /stock/*  →  localhost:5173  (Frontend Vite)                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   BACKEND           │         │   FRONTEND          │
│   FastAPI :5176    │         │   Vite    :5173     │
│                     │         │                     │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │ In-Memory     │  │         │  │ React App     │  │
│  │ Cache         │  │◄────────│  │ (App.tsx)     │  │
│  │               │  │ read   │  └───────────────┘  │
│  └───────────────┘  │        │                     │
│         │          │        │                     │
│         ▼          │        │                     │
│  ┌───────────────┐  │        │                     │
│  │ last_sync_   │  │        │                     │
│  │ cache.json   │  │        │                     │
│  └───────────────┘  │        │                     │
└─────────┬───────────┘        └─────────────────────┘
          │
          │ JSON-RPC (calls Odoo API)
          ▼
┌─────────────────────┐
│      ODOO           │
│   ERP Instance      │
│                     │
│  - Products         │
│  - Stock moves      │
│  - Warehouses       │
│  - POS sales        │
│  - Purchase orders  │
└─────────────────────┘
```

**Regla Fundamental**: El frontend **NUNCA** consulta Odoo directamente. Todos los datos provienen del endpoint `/api/products` del backend.

---

## 2. Flujo de Datos

### 2.1 Sincronización (Odoo → Cache → Frontend)

```
Odoo (JSON-RPC)
       │
       ▼  (Cada 30 minutos o manual)
┌─────────────────────────────────────────┐
│        OptimizedOdooSync.fetch_optimized │
│                                         │
│  Phase 1: Discovery                      │
│    → Fetch warehouses, locations       │
│    → Get all product IDs                │
│                                         │
│  Phase 2: Extraction                    │
│    → Parallel read_group calls         │
│    → Rotation, stock, revenue, PO data │
│                                         │
│  Phase 3: Processing                    │
│    → Build maps (rotation, stock...)    │
│    → Calculate ABC segments            │
│                                         │
│  Phase 4: Cache Write                   │
│    → last_sync_cache.json (18-20MB)   │
│    → last_sync_cache.json.gz           │
└─────────────────────────────────────────┘
       │
       ▼
last_sync_cache.json
       │
       ▼
┌─────────────────────────────────────────┐
│         /api/products                    │
│         (Backend FastAPI)               │
│                                         │
│  1. Load cache from JSON file          │
│  2. Filter by warehouse_access         │
│  3. Serve to frontend                  │
└─────────────────────────────────────────┘
```

### 2.2 Auto-Sync

- Se ejecuta **30 minutos después** de que termina la sincronización anterior
- `_is_syncing` global flag previene sincronizaciones solapadas
- `sync_watchdog_task()` resetea si se queda pegado >300 segundos
- Próximo sync disponible via header `X-Next-Sync` y archivo `next_sync.json`

### 2.3 Análisis de Traspasos (con IA)

```
Frontend ──→ /api/analyze_transfers ──→ OpenAI API ──→ Sugerencias
        │
        └── /api/analyze_all_transfers ──→ Análisis masivo
```

---

## 3. Backend (FastAPI)

**Puerto**: 5176  
**Archivo principal**: `backend/main.py`

### 3.1 Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/login` | POST | Autenticación de usuarios |
| `/api/verify_token` | GET | Verificar token de sesión |
| `/api/products` | GET | Obtener productos (desde cache) |
| `/api/sync/trigger` | POST | Forzar sincronización manual |
| `/api/sync/status` | GET | Estado del sync |
| `/api/sync/reset` | POST | Resetear estado de sync |
| `/api/analyze_product` | POST | Análisis de producto individual |
| `/api/analyze_transfers` | POST | Análisis de traspasos (por producto) |
| `/api/analyze_all_transfers` | POST | Análisis masivo de traspasos |
| `/api/purchase-orders` | GET | Órdenes de compra |
| `/api/purchase-suggestion` | GET | Sugerencia de compra |
| `/api/movements/{product_id}` | GET | Movimientos de stock |

### 3.2 Variables Globales

```python
_data_cache          # Caché en memoria (dict)
_cache_last_modified # Timestamp última modificación
_is_syncing          # Flag de sincronización en curso
_sync_start_time     # Timestamp inicio sync
_next_sync_time      # Próximo sync (ISO format)
```

### 3.3 OdooClient

Clase located at `main.py:385` que maneja la conexión JSON-RPC con Odoo:

```python
class OdooClient:
    def authenticate()  # Auth via /web/session/authenticate
    def call_kw()       # Llamadas a métodos Odoo via /web/dataset/call_kw
```

---

## 4. Frontend (React)

**Puerto desarrollo**: 5173  
**Puerto producción**: Servido por nginx  
**Archivo principal**: `frontend/src/App.tsx`

### 4.1 Stack Tecnológico

- **Framework**: React 18 con TypeScript
- **Build**: Vite
- **Estilos**: Tailwind CSS v4
- **Animaciones**: Framer Motion
- **Iconos**: Lucide React
- **HTTP Client**: Axios (con proxy Vite en dev)
- **Excel**: xlsx-js-style
- **Análisis IA**: Renderizado inline de respuestas OpenAI

### 4.2 Estructura

```
frontend/
├── src/
│   ├── App.tsx        # Componente principal (638KB)
│   ├── Login.tsx      # Página de login
│   ├── main.tsx       # Entry point
│   └── index.css      # Estilos globales
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.ts
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

### 4.3 API Calls

Todas las llamadas al API usan rutas relativas (`/api/...`):
- **Desarrollo**: Proxy Vite → `localhost:5176`
- **Producción**: Nginx → `/api` → `localhost:5176`

---

## 5. Integración con Odoo

### 5.1 Modelos Consultados

| Modelo Odoo | Uso |
|-------------|-----|
| `stock.warehouse` | Lista de almacenes/sucursales |
| `stock.location` | Estructura de ubicaciones |
| `product.product` | Información de productos |
| `product.template` | Templates de productos |
| `stock.quant` | Inventario actual (quantities) |
| `stock.move` | Movimientos de stock |
| `pos.order` | Ventas de punto de venta |
| `purchase.order` | Órdenes de compra |
| `stock.orderpoint` | Puntos de pedido (reorder rules) |
| `product.supplierinfo` | Información de proveedores |
| `res.company` | Compañías (para costos) |

### 5.2 Métodos de Extracción

> **Importante**: Usar `read_group` para agregaciones (rotación, stock, ventas POS, POs). Evitar obtener registros individuales.

> **Nota**: Las rutas con punto (`order_id.picking_type_id.warehouse_id`) funcionan en **dominios** pero NO son confiables en `read_group` groupby.

### 5.3 Estructura de Datos en Cache

```json
{
  "warehouses": [...],
  "products": [
    {
      "id": 123,
      "name": "Producto X",
      "stock_by_wh": {"1": 100, "2": 50},
      "sales_by_wh": {"1": 30, "2": 15},
      "sales_by_wh_90d": {...},
      "sales_by_wh_180d": {...},
      "pending_by_wh": {...},
      "orderpoints_by_wh": {...},
      "abc_by_wh": {"1": "A", "2": "B"},
      "sale_price_by_wh": {"1": 10.5, "2": 10.5},
      "pending_orders": [...],
      "seller_ids": [1, 2],
      "categ_id": [1, "Category"]
    }
  ],
  "global_stats": {
    "pending": 50,
    "out_of_stock": 10
  },
  "next_sync": "2026-05-14T12:00:00"
}
```

---

## 6. Módulos Principales

### 6.1 `backend/main.py` (2622 líneas)

| Sección | Líneas | Descripción |
|---------|--------|-------------|
| Configuración | 1-136 | Imports, logging, variables de entorno |
| Autenticación | 143-273 | Token-based auth, perfiles de usuario |
| Utilidades Odoo | 288-498 | Carga proveedores, clasificación ABC |
| OdooClient | 385-427 | Cliente JSON-RPC para Odoo |
| Endpoints API | 500+ | Todos los endpoints FastAPI |
| Tareas Background | ~1284+ | auto_sync_task, sync_watchdog_task |

### 6.2 `backend/optimized_sync.py` (59KB)

Sistema de sincronización optimizado (4 fases):
1. **Discovery** - Obtener warehouses, locations, product IDs
2. **Extraction** - Llamadas paralelas via ThreadPoolExecutor
3. **Processing** - Construir mapas de rotación, stock, revenue
4. **Cache Write** - Escribir last_sync_cache.json + .gz

### 6.3 `backend/sync_optimizer.py`

Infraestructura de soporte:
- `DeltaSyncManager` - Gestión de sync incremental
- `DynamicWorkerPool` - Pool de threads dinámicos
- `CircuitBreaker` - Protección contra fallos
- `MetricsCollector` - Métricas de rendimiento

### 6.4 `backend/global_analysis_v2.py`

Análisis de traspasos con IA:
- `analyze_global_to_my_warehouse()` - Análisis específico por almacén
- Utiliza OpenAI para generar sugerencias inteligentes

### 6.5 `backend/update_leadtimes.py`

Script para actualizar tiempos de entrega de proveedores:
```
Input: ../nombresjiji.csv + ../clasificacion proveedores.csv
Output: backend/leadtimes.json
```

### 6.6 `backend/find_shared_products.py`

Utilidad para encontrar productos compartidos entre tiendas.

---

## 7. Autenticación y Seguridad

### 7.1 Sistema de Tokens

```
Usuario + Password → /api/login → Token
Token = "{username}_{SECRET_TOKEN}"
```

### 7.2 Acceso por Warehouse

| Usuario | Acceso |
|---------|--------|
| `Dayana`, `DiegoH`, `DiegoU`, `Pablo`, `Edwin` | `ANDYS_ONLY` (solo tiendas Andy's) |
| Otros usuarios | `ALL` (todas las tiendas) |

### 7.3 Filtrado de Datos

El backend filtra productos y estadísticas basado en `warehouse_access` del usuario antes de enviar al frontend.

### 7.4 Variables de Entorno de Seguridad

```bash
SECRET_TOKEN=      # Token secreto para auth
VALID_USERS=       # usuarios:passwords
OPENAI_API_KEY=    # API key de OpenAI
```

---

## 8. Configuración

### 8.1 Archivo `.env`

Ubicado en la raíz del proyecto. Variables requeridas:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ODOO_URL` | URL de instancia Odoo | `https://odoo.company.com` |
| `ODOO_DB` | Nombre de base de datos | `produccion` |
| `ODOO_USER` | Usuario API Odoo | `api@company.com` |
| `ODOO_PASS` | Contraseña Odoo | `password` |
| `OPENAI_API_KEY` | API key OpenAI | `sk-...` |
| `SECRET_TOKEN` | Token para auth | `secure_random_token` |
| `VALID_USERS` | Usuarios del sistema | `admin:pass,user2:pass2` |

### 8.2 Archivos de Datos Estáticos

| Archivo | Descripción |
|---------|-------------|
| `backend/leadtimes.json` | Tiempos de entrega por proveedor |
| `backend/last_sync_cache.json` | Caché de sincronización (NO commitear) |
| `backend/last_sync_cache.json.gz` | Caché comprimido |
| `backend/purchase_orders_cache.json` | Caché de órdenes de compra |
| `backend/users_data.json` | Datos de usuarios (NO commitear) |
| `nombresjiji.csv` | Nombres de productos/jiji |
| `clasificacion proveedores.csv` | Clasificación de proveedores |

### 8.3 Archivos de Configuración

| Archivo | Descripción |
|---------|-------------|
| `nginx-stock.conf` | Configuración nginx para producción |
| `backend/stock-backend.service` | Servicio systemd |
| `backend/restart_backend.sh` | Script para reiniciar backend |

---

## 9. Despliegue

### 9.1 Desarrollo

**Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 9.2 Producción

```bash
# Backend via systemd
sudo systemctl start|stop|restart stock-backend
sudo journalctl -u stock-backend -f

# Logs
tail -f backend/backend.log
```

### 9.3 Nginx Proxy

```nginx
location /api {
    proxy_pass http://localhost:5176;
}

location /stock {
    alias /path/to/frontend/dist;
}
```

---

## 10. Troubleshooting

### Sync bloqueado
- Verificar `_is_syncing` flag
- Revisar `sync_watchdog_task()` logs
- Posible solución: `POST /api/sync/reset`

### Datos desactualizados
- Forzar sync manual: `GET /api/products?sync=true`
- Verificar última sync en `X-Next-Sync` header

### Error de autenticación Odoo
- Verificar credenciales en `.env`
- Probar conexión: `curl -X POST {ODOO_URL}/web/session/authenticate`

### Memoria llena
- El cache puede pesar 18-20MB
- Considerar limpiar `last_sync_cache.json.gz` antiguo

---

## Glosario

| Término | Significado |
|---------|-------------|
| **Quiebra** | Producto sin stock en una tienda |
| **Traspaso** | Movimiento de producto entre almacenes |
| **Orderpoint** | Regla de reorden automático |
| **ABC** | Clasificación de productos (AA, A, B, C, D, E) |
| **POS** | Point of Sale - Punto de venta |
| **Warehouse** | Almacén/Sucursal |

---

*Última actualización: Mayo 2026*