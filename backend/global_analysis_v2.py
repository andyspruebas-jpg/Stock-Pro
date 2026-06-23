"""
🧠 ANÁLISIS GLOBAL IA V2.2 (ROBUSTO)
Lógica de Dos Fases: Rescate (Urgente) vs Normalization (Salud).
"""

import math

def analyze_global_to_my_warehouse(products_list, warehouses, dest_warehouse_id, ml_predictions=None):
    """
    Analiza la red para abastecer una sucursal destino fija con lógica de dos fases.
    Soporta opcionalmente ml_predictions para lógica híbrida.
    """
    
    # 0. CONFIGURACIÓN y CONSTANTES
    TARGET_DAYS_RESCUE = 7
    TARGET_DAYS_NORM = 15
    
    # Ventanas base
    WINDOW_PENDING_RESCUE_BASE = 7
    WINDOW_PENDING_NORM_BASE = 21

    FLOOR_DAYS_SRC_RESCUE = 15
    FLOOR_DAYS_SRC_NORM = 45

    dest_id = str(dest_warehouse_id)
    warehouse_ids = [str(w['id']) for w in warehouses if w.get('id') is not None]
    warehouse_names = {str(w['id']): w['name'] for w in warehouses}
    num_wh = max(1, len(warehouse_ids))
    
    products_analysis = []

    for product in products_list:
        pid = str(product.get('id'))
        p_name = product.get('name', 'N/A')
        
        stock_by_wh = product.get('stock_by_wh', {})
        sales_by_wh = product.get('sales_by_wh', {})
        pending_by_wh = product.get('pending_by_wh', {})
        abc_dest = product.get('abc_by_wh', {}).get(dest_id, {}).get('category', 'E')
        
        # 1. ANÁLISIS DE DEMANDA DESTINO (HÍBRIDO SI HAY ML)
        sales_30d_dest = float(sales_by_wh.get(dest_id, 0))
        v_hist = sales_30d_dest / 30.0
        
        v_dest = v_hist
        ml_info = ml_predictions.get(pid) if ml_predictions else None
        
        if ml_info:
            # Lógica Híbrida: v_dest = (1-w)*v_hist + w*v_ml
            # Usamos confianza w=0.7 por defecto si hay ML
            w_conf = 0.7
            v_ml = ml_info.get('v_ml', v_hist)
            v_dest = (1 - w_conf) * v_hist + w_conf * v_ml
        
        if v_dest <= 0:
            sales_30d_global = sum(float(v or 0) for v in sales_by_wh.values())
            v_dest = max(0.01, (sales_30d_global / num_wh) / 30.0)

        stock_dest = float(stock_by_wh.get(dest_id, 0))
        if v_dest <= 0.01 and stock_dest <= 0:
            continue

        # 2. DEFINICIÓN DE FASE Y VENTANAS DINÁMICAS
        window_rescue = WINDOW_PENDING_RESCUE_BASE
        window_norm = WINDOW_PENDING_NORM_BASE
        
        if ml_info and ml_info.get('lead_time'):
            lt = ml_info['lead_time']
            window_rescue = min(7, max(1, int(lt)))
            window_norm = min(21, max(7, int(lt * 1.2)))

        pending_dest_rescue = min(float(pending_by_wh.get(dest_id, 0)), v_dest * window_rescue)
        stock_eff_rescue = stock_dest + pending_dest_rescue
        cov_days_rescue = stock_eff_rescue / v_dest if v_dest > 0 else 999

        phase = 'NORMALIZACIÓN'
        target_days = TARGET_DAYS_NORM
        floor_src = FLOOR_DAYS_SRC_NORM
        
        if cov_days_rescue < TARGET_DAYS_RESCUE:
            phase = 'RESCATE'
            target_days = 3 if abc_dest == 'AA' else TARGET_DAYS_RESCUE
            floor_src = FLOOR_DAYS_SRC_RESCUE
        
        # 3. CÁLCULO DE NECESIDAD
        current_window = window_rescue if phase == 'RESCATE' else window_norm
        pending_dest_final = min(float(pending_by_wh.get(dest_id, 0)), v_dest * current_window)
        stock_eff_dest = stock_dest + pending_dest_final
        
        target_stock = v_dest * target_days
        need_units = max(0, target_stock - stock_eff_dest)
        
        if need_units < 1: 
            continue

        # 4. BÚSQUEDA DE DONANTES
        candidates = []
        for src_id in warehouse_ids:
            if src_id == dest_id: continue
            src_stock = float(stock_by_wh.get(src_id, 0))
            if src_stock <= 0: continue
            
            src_sales_30d = float(sales_by_wh.get(src_id, 0))
            v_src = max(0.01, src_sales_30d / 30.0)
            
            src_floor_stock = floor_src * v_src
            safety_floor = min(5, src_stock * 0.5) 
            final_reserved = max(src_floor_stock, safety_floor, src_stock * 0.1)
            
            src_surplus = max(0, src_stock - final_reserved)
            if src_surplus < 1: continue
            
            qty_transfer = math.floor(min(need_units, src_surplus))
            if qty_transfer < 1: continue
            
            src_post_stock = src_stock - qty_transfer
            src_post_cov = src_post_stock / v_src
            
            dest_post_stock = stock_dest + qty_transfer
            dest_post_cov = dest_post_stock / v_dest if v_dest > 0 else 999
            
            # 6. SCORING INTELIGENTE
            benefit_score = 0
            if phase == 'RESCATE':
                debt = max(0, (v_dest * TARGET_DAYS_RESCUE) - stock_eff_rescue)
                benefit_score = 50 + (min(debt, qty_transfer) / max(debt, 1) * 50)
            else:
                benefit_score = (qty_transfer / need_units) * 60
                
            risk_penalty = max(0, (5 - (src_post_cov - floor_src)) * 5) if (src_post_cov - floor_src) < 5 else 0
            
            final_score = benefit_score - risk_penalty
            
            # 7. AJUSTE ML RISK
            if ml_info and ml_info.get('risk'):
                risk_val = ml_info['risk'] # 0..1
                # Aumenta el score si hay alto riesgo de quiebre
                risk_multiplier = 0.6 + (0.4 * risk_val)
                final_score *= risk_multiplier

            # 8. CÁLCULO DE CANTIDAD BASE (Sin ML) para comparación
            v_hist_calc = max(0.01, (sales_30d_dest / 30.0))
            if v_hist_calc <= 0.01:
                sales_30d_global_all = sum(float(v or 0) for v in sales_by_wh.values())
                v_hist_calc = max(0.01, (sales_30d_global_all / num_wh) / 30.0)
            
            # Simple need calculation (Formula)
            pending_hist = min(float(pending_by_wh.get(dest_id, 0)), v_hist_calc * (7 if phase == 'RESCATE' else 21))
            need_hist = max(0, v_hist_calc * target_days - (stock_dest + pending_hist))
            qty_formula = math.floor(min(need_hist, src_surplus))

            # 8. GENERAR EXPLICACIÓN
            reason = f"Fase {phase}"
            if ml_info:
                if phase == 'RESCATE':
                    reason = "Rescate Urgente: Riesgo de quiebre inminente según predicción ML."
                else:
                    reason = "Normalización: Stock optimizado para cubrir demanda proyectada."
            elif phase == 'RESCATE':
                reason = "Rescate Crítico: Cobertura inferior a 7 días (basado en historial)."

            candidates.append({
                "source_id": src_id,
                "source_name": warehouse_names.get(src_id, "N/A"),
                "qty": qty_transfer,
                "qty_formula": qty_formula, # Para el UI comparison
                "score": round(final_score, 1),
                "phase": phase,
                "reason": reason,
                "dest_post_coverage": dest_post_cov,
                "source_initial_coverage": src_stock / v_src,
                "source_post_coverage": src_post_cov,
                "dest_initial_coverage": stock_dest / v_dest,
                "ml_applied": True if ml_info else False
            })
            
        candidates.sort(key=lambda x: x['score'], reverse=True)
        if candidates:
            best_match = candidates[0]
            products_analysis.append({
                "product_id": pid,
                "product_name": p_name,
                "product_barcode": product.get('barcode', ''),
                "dest_stock": round(stock_dest),
                "dest_coverage_days": stock_dest / v_dest if v_dest > 0 else 999,
                "phase": phase,
                "stock_by_wh": stock_by_wh,
                "proposed_plan": candidates[:2],
                "top_sources": candidates[2:6],
                "best_source_name": best_match['source_name'],
                "best_qty": best_match['qty'],
                "best_qty_formula": best_match['qty_formula'],
                "score": best_match['score'],
                "ml_data": ml_info # Pasar info de ML al frontend
            })

    products_analysis.sort(key=lambda x: (0 if x['phase'] == 'RESCATE' else 1, -x['score']))
    
    return {
        "analysis_result": f"Análisis ML completado. {len(products_analysis)} sugerencias.",
        "products": products_analysis,
        "global_stats": {
            "total": len(products_list),
            "withSuggestions": len(products_analysis),
            "ml_active": True if ml_predictions else False
        }
    }
