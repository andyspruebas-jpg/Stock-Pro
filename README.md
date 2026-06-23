# Stock-Pro (Quiebra)

Sistema de gestión de inventario y análisis inteligente de traspasos para optimizar el stock entre sucursales.

## Características

- **Análisis de Inventario**: Visualización y gestión de productos en tiempo real desde Odoo
- **Traspasos Inteligentes**: Sistema de IA que sugiere traspasos óptimos entre sucursales
- **Clasificación ABC**: Segmentación automática de productos por rotación
- **Sincronización Automática**: Datos siempre actualizados (cada 30 min)
- **Filtros Avanzados**: Búsqueda por cobertura, categoría, sucursal, segmento
- **Exportación a Excel**: Reportes con formato profesional
- **Multi-almacén**: Acceso controlado por usuario (solo Andy's, todas las tiendas, etc.)

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | FastAPI (Python) |
| Frontend | React + TypeScript + Vite |
| Base de datos | Odoo ERP (JSON-RPC) |
| AI | OpenAI API |
| Proxy | Nginx |
| Despliegue | systemd |

## Inicio Rápido

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
# Editar .env con credenciales reales
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuración

### Variables de Entorno (`.env`)

```env
# Odoo
ODOO_URL=https://tu-odoo.com
ODOO_DB=base_de_datos
ODOO_USER=usuario@empresa.com
ODOO_PASS=contraseña

# OpenAI (para análisis de traspasos)
OPENAI_API_KEY=sk-...

# Seguridad
SECRET_TOKEN=change_this_to_a_secure_random_token
VALID_USERS=admin:change_me_1,user2:change_me_2
```

### Archivos de Datos

| Archivo | Descripción |
|---------|-------------|
| `nombresjiji.csv` | Nombres de productos para leadtimes |
| `clasificacion proveedores.csv` | Clasificación de proveedores |

## Arquitectura

```
Odoo (JSON-RPC)
      │
      ▼  (Sincronización cada 30 min)
┌─────────────────────────────┐
│   OptimizedOdooSync        │
│   (backend/optimized_sync) │
└─────────────────────────────┘
      │
      ▼
last_sync_cache.json (18-20MB)
      │
      ▼
┌─────────────────────────────┐
│   FastAPI (backend/main)    │
│   Puerto 5176               │
└─────────────────────────────┘
      │  /api/products
      ▼
┌─────────────────────────────┐
│   React + Vite (frontend)   │
│   Puerto 5173               │
└─────────────────────────────┘
```

**Importante**: El frontend nunca consulta Odoo directamente. Todos los datos vienen del endpoint `/api/products`.

## API Endpoints

### Autenticación
| Endpoint | Descripción |
|----------|-------------|
| `POST /api/login` | Login de usuario |
| `GET /api/verify_token` | Verificar token |

### Productos
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/products` | Lista de productos (desde cache) |
| `GET /api/products?sync=true` | Forzar sincronización |
| `GET /api/movements/{product_id}` | Movimientos de stock |

### Sincronización
| Endpoint | Descripción |
|----------|-------------|
| `POST /api/sync/trigger` | Forzar sync manual |
| `GET /api/sync/status` | Estado del sync |
| `POST /api/sync/reset` | Resetear sync bloqueado |

### Análisis (AI)
| Endpoint | Descripción |
|----------|-------------|
| `POST /api/analyze_product` | Análisis de producto individual |
| `POST /api/analyze_transfers` | Sugerencias de traspasos |
| `POST /api/analyze_all_transfers` | Análisis masivo |

### Compras
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/purchase-orders` | Órdenes de compra |
| `GET /api/purchase-suggestion` | Sugerencia de compra |

## Despliegue en Producción

```bash
# Reiniciar backend
cd backend
./restart_backend.sh

# O con systemd
sudo systemctl restart stock-backend
sudo journalctl -u stock-backend -f
```

### Nginx

```nginx
location /api {
    proxy_pass http://localhost:5176;
}

location /stock {
    alias /ruta/al/frontend/dist;
    try_files $uri $uri/ /stock/index.html;
}
```

## Seguridad

**NO subas a GitHub:**
- `.env` y variantes
- `backend/users_data.json`
- `backend/last_sync_cache.json*`
- `*.csv` (datos de empresa)
- Logs y archivos temporales

## Documentación

Ver [DOCUMENTACION.md](./DOCUMENTACION.md) para información detallada:
- Arquitectura completa
- Flujo de datos
- Integración con Odoo
- Módulos principales
- Troubleshooting

## Estructura del Proyecto

```
Quiebra/
├── backend/
│   ├── main.py              # API FastAPI
│   ├── optimized_sync.py    # Sistema de sync
│   ├── sync_optimizer.py    # Infraestructura de sync
│   ├── leadtimes.json       # Tiempos de entrega
│   ├── requirements.txt
│   └── venv/                # Entorno virtual
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Componente principal
│   │   ├── Login.tsx        # Login
│   │   └── main.tsx         # Entry point
│   ├── vite.config.ts
│   └── package.json
├── nginx-stock.conf         # Configuración nginx
├── DOCUMENTACION.md         # Documentación completa
├── CLAUDE.md                # Guía para Claude Code
└── .env.example             # Plantilla variables
```

---

*Última actualización: Mayo 2026*
