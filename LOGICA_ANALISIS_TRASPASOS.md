# Documentación: Lógica del Análisis de Traspasos con IA v2.0 🧠🚀

Este documento detalla el funcionamiento interno de la función `analyze_transfers` (v2.0). El sistema ha evolucionado de un modelo binario (sí/no) a un **modelo de clasificación inteligente** que diferencia entre productos críticos y oportunidades logísticas.

---

## 1. Configuración de Parámetros Bases

Los cálculos se basan en el **ABC efectivo del destino** (si el almacén tiene un ABC específico se usa ese, si no, el global).

### A. Cobertura Objetivo (Días)
Días de venta que se busca garantizar en la sucursal de destino.
- **AA**: 45 días | **A**: 35 días | **B**: 25 días | **C**: 18 días | **D/E**: 12 días

### B. Protección de Origen (Días)
Días que el emisor debe reservar para su propia demanda.
- **AA**: 15 días | **A**: 12 días | **B**: 10 días | **C**: 7 días | **D/E**: 5 días

---

## 2. Filtros Duros (Rechazo Absoluto)

Si un producto no pasa estas 3 reglas, es descartado inmediatamente:
1.  **Producto Muerto**: Ventas en los últimos 30 días en destino = 0.
2.  **Cobertura Suficiente (Condición exacta)**: 
    - `NecesidadU = ceil(max(0, (Venta_Diaria * Cobertura) - Stock - Pendientes))`.
    - Si `NecesidadU <= 0` → Rechazar por "Vistas cubiertas".
3.  **Protección de Stock**: Si el origen no tiene excedentes tras reservar su reserva de seguridad (incluye demanda de toda la red si el origen es un Centro de Distribución).

---

## 3. Lógica de Necesidad con Redondeo (Novedad v2.0)

Para evitar rechazos técnicos por decimales (ej. faltan 2.8 unidades y el mínimo es 3):
- **Cálculo Seguro**: Primero se limita a no-negativos con `max(0, ...)` y luego se aplica el redondeo: `NecesidadU = ceil(Necesidad)`.
- Esto garantiza que si la necesidad es por ejemplo 2.1, el sistema la "empuje" a **3** para evitar el rechazo por micro-traspaso, sin inventar demanda cuando el stock es suficiente.

---

## 4. Clasificación: Sugerencias vs. Oportunidades

Ya no se rechazan productos por "Micro-traspaso". Ahora se clasifican:

### 🎯 Sugerencias Principales (Prioritarios)
- Productos cuya necesidad es **igual o mayor** al umbral mínimo:
    - **ABC AA/A**: ≥ 3 unidades.
    - **ABC B/C/D/E**: ≥ 6 unidades.
- Pasan al sistema de **Scoring** para determinar su nivel de urgencia.

### 🟡 Oportunidades (Llenar Camión)
- Productos necesarios pero cuya cantidad es **inferior** al umbral de micro-traspaso.
- **No se descartan**: Se muestran en una sección separada en la UI.
- Permiten al usuario decidir si incluirlos para optimizar el flete (logística eficiente).

---

## 5. Sistema de Scoring Actualizado (0-105 puntos)

| Criterio | Puntos Máx. | Detalle |
| :--- | :--- | :--- |
| **Urgencia** | 40 pts | % de falta de stock vs cobertura objetivo. |
| **Importancia ABC** | 30 pts | Prioridad por rotación (AA=30, A=25, etc.). |
| **Volumen de Venta** | 20 pts | Recompensa productos de alta rotación mensual. |
| **Estado de Pedidos** | 10 pts | Penaliza si ya hay mucho producto en camino. |
| **Bonus Multi-venta** | **+5 pts** | **(Nuevo)** Bonus basado en la cantidad de sucursales con ventas reales (max 5 pts). |

---

## 6. Refinamientos Operativos v2.0

Para garantizar una operación fluida y consistente, el sistema aplica estas reglas adicionales:

1.  **Redondeo seguro (ceil)**: 
    - `Necesidad = max(0, Necesidad_raw)` y luego `NecesidadU = ceil(Necesidad)`.
    - Evita rechazos por decimales (2.1 → 3) sin "inventar" necesidad cuando el stock es suficiente.
2.  **Urgencia clampeada**:
    - `ratioC = clamp(CobAct / CobObj, 0, 1)` y `Urgencia = (1 - ratioC) * 40`.
    - Evita puntuaciones negativas o inconsistencias ante sobrestocks.
3.  **Prioridad de origen universal**:
    - Tanto Sugerencias como Oportunidades se bloquean si `Disponible_origen <= 0`. Nunca se desprotege al emisor.
4.  **Validación de pendientes vs necesidad**:
    - `PendientesPts` = 0 si `pendiente_destino >= NecesidadU`; 5 pts si `> 0`; 10 pts si `== 0`.
5.  **Bonus Multi-venta capado**:
    - `Bonus = min(5, 0.5 * max(0, SucursalesConVenta - 1))` usando ventas reales por sucursal.
6.  **Cantidad propuesta (Cálculo Final)**:
    - `Qty = min(NecesidadU, floor(Disponible_origen))`.
    - Si `Qty <= 0` → Rechazar.

---

## 7. Salida y UI

El sistema presenta los resultados de forma diferenciada:
1.  **Tablas Separadas**: Los prioritarios y las oportunidades aparecen en listas distintas.
2.  **Acciones Rápidas**:
    - `Solo Prioritarios`: Aplica solo lo urgente.
    - `Preparar Todo`: Incluye las oportunidades para aprovechar el transporte al máximo.
3.  **Transparencia**: El motivo del micro-traspaso se muestra explícitamente (ej: "3 < 6 unidades").
