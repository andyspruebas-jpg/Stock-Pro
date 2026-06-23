#!/bin/bash
# Script para reiniciar el backend con sistema optimizado

echo "🔄 Reiniciando backend..."

# 1. Matar procesos existentes
echo "🔴 Deteniendo procesos existentes..."
pkill -f "python.*main.py" || echo "No hay procesos para detener"
sleep 2

# 2. Verificar que USE_OPTIMIZED_SYNC está configurado
if [ -z "$USE_OPTIMIZED_SYNC" ]; then
    echo "⚠️  USE_OPTIMIZED_SYNC no está configurado, usando default (true)"
    export USE_OPTIMIZED_SYNC=true
fi

echo "✓ Configuración: USE_OPTIMIZED_SYNC=$USE_OPTIMIZED_SYNC"

# 3. Cambiar al directorio del backend
cd "$(dirname "$0")"

# 4. Iniciar el backend
echo "🚀 Iniciando backend..."
nohup ./venv/bin/python main.py > backend.log 2>&1 &
PID=$!

echo "✅ Backend iniciado con PID: $PID"
echo "📝 Logs: tail -f backend.log"

# 5. Esperar a que el servidor esté listo
echo "⏳ Esperando a que el servidor esté listo..."
for i in {1..10}; do
    if curl -s http://localhost:5176/api/sync/status > /dev/null 2>&1; then
        echo "✅ Servidor listo!"

        # Mostrar estado
        echo ""
        echo "📊 Estado del sistema:"
        curl -s http://localhost:5176/api/sync/status | python -m json.tool
        exit 0
    fi
    sleep 1
done

echo "⚠️  Servidor tardó en arrancar. Verifica los logs:"
echo "   tail -f backend.log"
