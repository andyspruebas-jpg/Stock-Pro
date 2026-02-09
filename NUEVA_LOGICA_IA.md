# 🧠 NUEVA LÓGICA DE IA PARA ANÁLISIS DE TRASPASOS

## 📋 Resumen

La IA ahora **primero decide SI vale la pena hacer el traspaso** (no cuánto), usando una metodología de 4 pasos basada en criterios comerciales claros y un sistema de scoring de 0-100.

---

## 🎯 OBJETIVO REAL

Con los datos actuales, la IA **NO decide "cuánto"**, sino **PRIMERO decide**:

> ❓ **¿Vale la pena hacer el traspaso o no?**

Esto evita **70% de malas decisiones**. 

---

## 📦 DATOS QUE USAMOS

Datos disponibles y usados:
- ✅ `stock_origen`
- ✅ `stock_destino`
- ✅ `ventas_30d_destino`
- ✅ `ventas_30d_origen`
- ✅ `ABC global` y `por almacén`
- ✅ `pedidos pendientes`
- ✅ `nombre de almacén`

**NO usamos** (decisión comercial, no logística):
- ❌ vencimiento
- ❌ peso
- ❌ volumen
- ❌ costo logístico

---

## 🧩 IDEA CLAVE

Un traspaso vale la pena **solo si**:

1. 🔥 **Se vende** (destino tiene ventas)
2. 🏬 **Falta stock en el destino**
3. 🏭 **Sobra stock en el origen**
4. 🧠 **Es importante** (ABC)
5. 📦 **No es un micro-traspaso inútil**

**Si falla una condición → NO se hace.**

---

## 🚦 PASO 1 – Filtros Duros (Semáforo Rojo)

La IA primero **descarta basura**:

### ❌ 1. Producto muerto
```
venta_diaria_destino = ventas_30d / 30

Si ventas_30d == 0 → ❌ NO TRASPASAR
(Opcional: permitir solo si ABC = AA o A)
```

### ❌ 2. Origen sin stock real
```
stock_origen <= 0 → NO
```

### ❌ 3. Micro-traspaso inútil
```
Si lo que falta es < 6 unidades
👉 ❌ NO (ruido operativo)
```

---

## 🟡 PASO 2 – Detectar Necesidad Real en Destino

### 1️⃣ Venta diaria
```python
Vd = ventas_30d / 30
```

### 2️⃣ Cobertura actual en destino
```python
cobertura = stock_destino / Vd
```

### 3️⃣ Cobertura objetivo según ABC
```python
AA → 45 días
A  → 35 días
B  → 25 días
C  → 18 días
D/E → 12 días
```

### 4️⃣ Necesidad neta
```python
necesidad = Vd * cobertura_objetivo - stock_destino - pendiente_destino

Si necesidad <= 0 → NO
```
👉 **No falta producto → no mover.**

---

## 🟢 PASO 3 – Ver si el Origen Puede Dar Sin Morir

Protegemos el origen para que **no se quede seco**:

```python
stock_min_origen = Vd_origen * dias_proteccion_ABC
```

**Días de protección por ABC:**
```
AA → 15 días
A  → 12 días
B  → 10 días
C  → 7 días
D/E → 5 días
```

```python
Si stock_origen - necesidad < stock_min_origen:
    👉 Reduce o cancela.
```

---

## 🧠 PASO 4 – SCORE SIMPLE (0-100)

Ahora la IA **puntúa** para decidir "sí" o "no".

### 📊 Componentes del Score

#### 1. **Urgencia** (0–40 pts)
```python
urgencia = (1 - cobertura_actual / cobertura_objetivo) * 40
```

#### 2. **Importancia ABC** (0–30 pts)
```
AA = 30 pts
A  = 25 pts
B  = 18 pts
C  = 10 pts
D/E = 0 pts
```

#### 3. **Volumen de venta** (0–20 pts)
```
ventas_30d >= 30 → 20 pts
>= 15 → 12 pts
>= 5  → 6 pts
< 5   → 0 pts
```

#### 4. **Pendientes en destino** (0–10 pts)
```
pendiente > stock → 0 pts (ya hay mucho en camino)
pendiente > 0     → 5 pts (hay algo pero no suficiente)
pendiente = 0     → 10 pts (no hay nada, urgente)
```

### 🎯 SCORE FINAL
```python
score = urgencia + ABC + ventas + pendientes
```

---

## 🧪 REGLA DE DECISIÓN (CLARA)

```python
if score < 40:
    → ❌ NO traspasar

elif 40 <= score < 60:
    if stock_origen sobra significativamente:
        → ✅ SÍ traspasar
    else:
        → ❌ NO traspasar

elif score >= 60:
    → ✅ SÍ traspasar
```

---

## 🧠 ¿POR QUÉ ESTO ES "IA"?

Porque la IA:

- ❌ **Descarta basura** automáticamente
- 🧠 **Prioriza** basado en múltiples factores
- ⚖️ **Evalúa costo-beneficio** implícito
- 🔁 **Se puede ajustar** con feedback real

👉 **No es magia, es criterio automatizado.**

---

## 🚀 BENEFICIOS INMEDIATOS

✅ **Menos traspasos inútiles**  
✅ **Menos ruido operativo**  
✅ **Decisiones defendibles**  
✅ **Base perfecta** para:
   - Logística avanzada
   - Manejo de vencimientos
   - ML real después

---

## 📊 SALIDA DE LA IA

La nueva implementación devuelve:

```json
{
  "analysis": "Texto con resumen del análisis",
  "suggestions": [
    {
      "id": 123,
      "name": "NOMBRE PRODUCTO",
      "qty": 25,
      "reason": "Score: 85/100 - AA",
      "score": 85.0,
      "details": {
        "stock_origen": 150.0,
        "stock_destino": 10.0,
        "ventas_30d_destino": 40.0,
        "cobertura_actual": 7.5,
        "cobertura_objetivo": 45,
        "abc_destino": "AA",
        "score_breakdown": "Urgencia: 35.2/40 | ABC: 30/30 | Ventas: 20/20 | Pendientes: 10/10"
      }
    }
  ],
  "stats": {
    "total_evaluados": 150,
    "total_aprobados": 23,
    "total_rechazados": 127
  }
}
```

---

## 🔧 IMPLEMENTACIÓN

### Backend
- **Archivo**: `/home/gabriel/Quiebra/backend/main.py`
- **Función**: `analyze_transfers()` (línea 870+)
- **Método**: POST `/api/analyze_transfers`

### Frontend
- **Archivo**: `/home/gabriel/Quiebra/frontend/src/App.tsx`
- **Función**: `handleAnalyzeTransfers()` (línea 1001+)
- **Payload actualizado** para incluir `abc_by_wh` y `pending_by_wh`

---

## ✨ PRÓXIMOS PASOS

1. ✅ **Implementación completa**
2. 🧪 **Pruebas con datos reales**
3. 📈 **Ajuste fino de thresholds** si es necesario
4. 🎯 **Feedback del equipo** para calibrar scores
5. 🚀 **Optimización continua** basada en resultados

---

**Fecha de implementación**: 2026-01-27  
**Versión**: 1.0 - Nueva Lógica Comercial
