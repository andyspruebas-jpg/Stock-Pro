# Stock-Pro

Sistema de gestión de inventario y análisis de traspasos inteligente para optimizar el stock entre sucursales.

## 🚀 Características

- **Análisis de Inventario**: Visualización y gestión de productos en tiempo real
- **Traspasos Inteligentes**: Sistema de IA que sugiere traspasos óptimos entre sucursales
- **Análisis Global**: Análisis masivo de productos para optimizar distribución
- **Filtros Avanzados**: Búsqueda y filtrado por cobertura, categoría, sucursal, etc.
- **Exportación a Excel**: Exporta reportes con formato profesional
- **Integración con Odoo**: Sincronización directa con sistema ERP

## 📋 Requisitos Previos

- Python 3.10+
- Node.js 16+
- Acceso a instancia de Odoo
- OpenAI API Key (para funciones de IA)

## 🔧 Instalación

### Backend

1. Crea un entorno virtual:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Linux/Mac
# o
venv\Scripts\activate  # En Windows
```

2. Instala las dependencias:
```bash
pip install -r requirements.txt
```

3. Configura las variables de entorno:
```bash
cp ../.env.example .env
# Edita .env con tus credenciales reales
```

4. Ejecuta el servidor:
```bash
python main.py
```

### Frontend

1. Instala las dependencias:
```bash
cd frontend
npm install
```

2. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

## 🔐 Configuración de Seguridad

**IMPORTANTE**: Este repositorio NO incluye información sensible. Debes configurar:

1. **Variables de entorno**: Copia `.env.example` a `.env` y completa con tus credenciales
2. **Credenciales de Odoo**: Configura en tu archivo `.env` local
3. **OpenAI API Key**: Agrega tu clave en el archivo `.env` local

### Archivos que NO se suben a GitHub (ya configurados en .gitignore):

- `.env` y variantes
- `backend/users_data.json` (usuarios del sistema)
- `backend/last_sync_cache.json*` (caché de sincronización)
- Archivos CSV con datos de la empresa
- Archivos de debug con credenciales
- Logs y archivos temporales

## 🏗️ Estructura del Proyecto

```
Quiebra/
├── backend/           # API FastAPI y lógica de negocio
│   ├── main.py       # Servidor principal
│   ├── global_analysis_v2.py  # Análisis de traspasos con IA
│   └── ...
├── frontend/         # Interfaz React + TypeScript
│   ├── src/
│   │   ├── App.tsx  # Componente principal
│   │   └── ...
│   └── ...
├── .env.example     # Plantilla de variables de entorno
└── .gitignore       # Archivos excluidos del repositorio
```

## 📊 Funcionalidades Principales

### Análisis de Traspasos
El sistema utiliza IA para analizar patrones de ventas y stock, sugiriendo traspasos óptimos entre sucursales considerando:
- Cobertura actual de productos
- Ventas históricas (30 días)
- Stock disponible en cada sucursal
- Pedidos pendientes
- Segmentación ABC de productos

### Visualización de Datos
- Vista de productos con filtros avanzados
- Tarjetas de productos con información detallada
- Gráficos de cobertura y stock
- Exportación a Excel con formato

## 🤝 Contribución

Este es un proyecto privado de empresa. No se aceptan contribuciones externas.

## 📝 Licencia

Propietario - Todos los derechos reservados

## ⚠️ Notas Importantes

- **NO** compartas tu archivo `.env` con nadie
- **NO** subas credenciales al repositorio
- **NO** compartas datos de ventas o inventario de la empresa
- Asegúrate de que `.gitignore` esté siempre actualizado

## 🆘 Soporte

Para soporte interno, contacta al equipo de desarrollo de la empresa.
