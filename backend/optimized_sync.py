"""
🚀 SINCRONIZACIÓN OPTIMIZADA ODOO <-> DASHBOARD
Sistema mejorado con todas las optimizaciones implementadas
"""

import logging
import os
import time
import math
import re
import concurrent.futures
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

from sync_optimizer import (
    DeltaSyncManager,
    DynamicWorkerPool,
    MetricsCollector,
    write_compressed_cache,
    calculate_hash
)

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(BASE_DIR, "last_sync_cache.json")
METADATA_FILE = os.path.join(BASE_DIR, "sync_metadata.json")
LEADTIMES_FILE = os.path.join(BASE_DIR, "leadtimes.json")


# ============================================================================
# FUNCIONES AUXILIARES (reutilizadas del sistema original)
# ============================================================================

def load_provider_origins():
    """Carga orígenes de proveedores desde CSV"""
    origins = {}
    root_dir = os.path.dirname(BASE_DIR)
    preferred_csv = os.path.join(root_dir, "nombresjiji.csv")
    fallback_csv = os.path.join(root_dir, "clasificacion proveedores.csv")
    csv_path = preferred_csv if os.path.exists(preferred_csv) else fallback_csv
    if os.path.exists(csv_path):
        try:
            import csv
            with open(csv_path, mode='r', encoding='utf-8-sig', newline='') as f:
                reader = csv.reader(f, delimiter=';')
                for row in reader:
                    if len(row) >= 2:
                        provider = row[0].strip()
                        origin = row[1].strip()
                        if not provider or provider.upper() == "PROVEEDOR":
                            continue
                        origins[provider.upper()] = origin
        except Exception as e:
            logger.error(f"Error loading provider origins from {csv_path}: {e}")
    return origins


def load_leadtimes():
    """Carga leadtimes desde JSON"""
    leadtimes = {}
    if os.path.exists(LEADTIMES_FILE):
        try:
            import json
            with open(LEADTIMES_FILE, "r") as f:
                leadtimes = json.load(f)
                logger.info(f"Loaded {len(leadtimes)} leadtimes from JSON")
        except Exception as e:
            logger.error(f"Error loading leadtimes: {e}")
    return leadtimes


def is_internal_supplier_name(name: str) -> bool:
    upper = (name or "").strip().upper()
    if not upper:
        return False
    normalized = upper.replace("'", "").replace("’", "").replace("`", "")
    internal_tokens = (
        "NUBA",
        "ANDYS",
        "YAM YAM",
        "ALMACEN",
        "INVENTARIO",
        "PISO",
        "BODEGA",
        "DEPOSITO",
        "ADAPTIA",
        "EXPANDIA",
        "TIENDA",
        "SUCURSAL",
    )
    return any(token in normalized for token in internal_tokens)


def is_store_fallback_supplier(name: str) -> bool:
    upper = (name or "").strip().upper()
    return "ANDY" in upper and ("STORE" in upper or "TIENDA" in upper or "SRL" in upper)


def resolve_company_context(client, company_keyword="ADAPTIA"):
    try:
        companies = client.call_kw(
            "res.company",
            "search_read",
            [[("name", "ilike", company_keyword)]],
            {"fields": ["id", "name"], "limit": 5},
        ) or []
    except Exception as e:
        logger.warning(f"No se pudo resolver compañía {company_keyword}: {e}")
        return None

    if not companies:
        logger.warning(f"No se encontró compañía para keyword={company_keyword}")
        return None

    company = companies[0]
    logger.info(f"Usando contexto de compañía para costos: {company['name']} (ID {company['id']})")
    return {
        "allowed_company_ids": [company["id"]],
        "company_id": company["id"],
        "force_company": company["id"],
    }


def pick_best_supplier(product: dict, supplier_map: dict):
    seller_ids = product.get("seller_ids") or []
    if not seller_ids:
        return None

    product_id = product.get("id")
    tmpl_value = product.get("product_tmpl_id")
    product_tmpl_id = tmpl_value[0] if isinstance(tmpl_value, list) else tmpl_value
    ranked = []

    for sid in seller_ids:
        supplier = supplier_map.get(sid)
        if not supplier:
            continue

        supplier_product_id = supplier.get("product_id")
        supplier_tmpl_id = supplier.get("product_tmpl_id")

        if supplier_tmpl_id and product_tmpl_id and supplier_tmpl_id != product_tmpl_id:
            continue

        # Odoo can surface supplierinfo lines from sibling variants of the same template
        # in the Purchase tab. Keep those as candidates, but rank them below exact matches.
        if supplier_product_id == product_id:
            specificity_rank = 0
        elif supplier_tmpl_id and product_tmpl_id and supplier_tmpl_id == product_tmpl_id:
            specificity_rank = 1 if not supplier_product_id else 2
        elif supplier_product_id:
            continue
        else:
            specificity_rank = 3

        name = supplier.get("name", "")
        penalty_rank = 0
        if is_internal_supplier_name(name):
            penalty_rank += 2000
        if is_store_fallback_supplier(name):
            penalty_rank += 1000

        ranked.append((penalty_rank + specificity_rank, sid, supplier))

    if not ranked:
        return None

    ranked.sort(key=lambda item: (item[0], item[1]))
    return ranked[0][2]


def calculate_abc_segments(data_dict):
    """
    Clasifica productos en categorías ABC usando porcentaje acumulado (Pareto).
    - Ordena de MAYOR a MENOR ventas.
    - Calcula % individual y % acumulado SOLO sobre productos con ventas > 0.
    - Productos sin ventas reciben cat='' (sin categoría), igual que la fórmula Excel.
    - Thresholds: <=20% AA | <=40% A | <=60% B | <=80% C | <=90% D | >90% E
    """
    if not data_dict:
        return {}

    all_items = [(pid, float(v or 0)) for pid, v in data_dict.items()]

    # Separar activos e inactivos
    active_items = sorted(
        [(pid, val) for pid, val in all_items if val > 0.000001],
        key=lambda x: x[1],
        reverse=True  # Mayor a menor
    )
    inactive_pids = [pid for pid, val in all_items if val <= 0.000001]

    # Productos sin ventas -> sin categoría ABC
    results = {pid: {'cat': '', 'part': 0, 'cum': 0} for pid in inactive_pids}

    if not active_items:
        return results

    total_val = sum(val for _, val in active_items)
    if total_val <= 0:
        for pid, _ in active_items:
            results[pid] = {'cat': '', 'part': 0, 'cum': 0}
        return results

    cum_sum = 0
    for pid, val in active_items:
        cum_sum += val
        part = (val / total_val) * 100
        cum_perc = (cum_sum / total_val) * 100

        if cum_perc <= 20:   cat = 'AA'
        elif cum_perc <= 40: cat = 'A'
        elif cum_perc <= 60: cat = 'B'
        elif cum_perc <= 80: cat = 'C'
        elif cum_perc <= 90: cat = 'D'
        else:                cat = 'E'

        results[pid] = {'cat': cat, 'part': round(part, 4), 'cum': round(cum_perc, 4)}

    return results


# ============================================================================
# SISTEMA DE SINCRONIZACIÓN OPTIMIZADO
# ============================================================================

class OptimizedOdooSync:
    """Sistema de sincronización optimizado con todas las mejoras"""

    def __init__(self, client):
        self.client = client
        self.delta_manager = DeltaSyncManager(METADATA_FILE)
        # I/O-bound API calls benefit from high concurrency (like the legacy 25-thread approach)
        self.worker_pool = DynamicWorkerPool(min_workers=8, max_workers=20, initial_workers=15)
        self.metrics = MetricsCollector()
        self.provider_origins = load_provider_origins()
        self.leadtimes = load_leadtimes()
        self.adaptia_company_context = resolve_company_context(client)

    def fetch_optimized(self) -> Optional[dict]:
        """
        Función principal de sincronización optimizada
        Returns: dict con datos sincronizados o None si falla
        """
        try:
            logger.info("=" * 80)
            logger.info("🚀 INICIANDO SINCRONIZACIÓN OPTIMIZADA")
            logger.info("=" * 80)

            # PASO 1: DISCOVERY (más eficiente con batch paralelo)
            self.metrics.start_step("discovery")
            discovery_data = self._optimized_discovery()
            self.metrics.end_step("discovery")

            if not discovery_data:
                logger.error("Discovery falló")
                return None

            # PASO 2: EXTRACCIÓN DE DATOS (con worker pool dinámico)
            self.metrics.start_step("extraction")
            extracted_data = self._optimized_extraction(discovery_data)
            self.metrics.end_step("extraction")

            if not extracted_data:
                logger.error("Extracción falló")
                return None

            # PASO 3: PROCESAMIENTO PARALELO (streaming mientras se extrae)
            self.metrics.start_step("processing")
            processed_data = self._parallel_processing(extracted_data, discovery_data)
            self.metrics.end_step("processing")

            # PASO 4: ESCRITURA DE CACHE COMPRIMIDO
            self.metrics.start_step("cache")
            cache_data = self._build_cache_data(processed_data, discovery_data)
            raw_size, compressed_size = write_compressed_cache(CACHE_FILE, cache_data)

            # Escribir sidecar de purchase_orders (evita parsear 20MB para el panel de compras)
            po_sidecar = os.path.join(BASE_DIR, "purchase_orders_cache.json")
            try:
                import json as _json
                po_payload = {"lines": cache_data.get("purchase_orders", []), "last_update": cache_data.get("last_update", "")}
                with open(po_sidecar, "w") as _f:
                    _f.write(_json.dumps(po_payload, separators=(',', ':'), default=str))
            except Exception as _e:
                logger.error(f"Error escribiendo purchase_orders_cache.json: {_e}")

            self.metrics.end_step("cache")

            # Actualizar métricas finales
            self.metrics.metrics.raw_data_size = raw_size
            self.metrics.metrics.compressed_size = compressed_size
            self.metrics.metrics.products_processed = len(processed_data.get('final_products', []))
            self.metrics.metrics.avg_workers_used = self.worker_pool.current_workers
            self.metrics.metrics.max_latency = self.worker_pool.circuit_breaker.get_avg_latency()

            # Guardar metadata para próximo sync
            from sync_optimizer import SyncMetadata
            new_metadata = SyncMetadata(
                last_sync_timestamp=datetime.now().isoformat(),
                last_rotation_hash=extracted_data.get('rotation_hash', ''),
                last_stock_hash=extracted_data.get('stock_hash', ''),
                last_po_hash=extracted_data.get('po_hash', ''),
                last_orderpoints_hash=extracted_data.get('orderpoints_hash', ''),
                products_count=len(processed_data.get('final_products', [])),
                total_size_bytes=compressed_size,
                sync_duration_seconds=self.metrics.metrics.total_time
            )
            self.delta_manager.save_metadata(new_metadata)

            # Finalizar métricas
            final_metrics = self.metrics.finalize()

            return cache_data

        except Exception as e:
            logger.error(f"Error en sincronización optimizada: {e}", exc_info=True)
            return None

    def _optimized_discovery(self) -> Optional[dict]:
        """Discovery optimizado con batch paralelo eficiente"""
        logger.info("🔍 Discovery: Obteniendo metadatos de Odoo...")

        try:
            # Usar worker pool dinámico (inicialmente 8 workers)
            with self.worker_pool.get_executor() as executor:
                # Batch de queries en paralelo
                futures = {
                    'warehouses': executor.submit(self.client.call_kw, "stock.warehouse", "search_read", [], {"fields": ["id", "name", "code", "lot_stock_id"]}),
                    'locations_int': executor.submit(self.client.call_kw, "stock.location", "search_read", [[('usage', '=', 'internal')]], {"fields": ["id", "warehouse_id", "complete_name"]}),
                    'locations_cust': executor.submit(self.client.call_kw, "stock.location", "search", [[('usage', '=', 'customer')]]),
                    'picking_types': executor.submit(self.client.call_kw, "stock.picking.type", "search_read", [], {"fields": ["id", "warehouse_id"]}),
                    'tags': executor.submit(self.client.call_kw, "product.tag", "search_read", [], {"fields": ["id", "name"]})
                }

                # Recolectar resultados
                results = {}
                for key, future in futures.items():
                    try:
                        results[key] = future.result() or []
                    except Exception as e:
                        logger.error(f"Error en {key}: {e}")
                        results[key] = []

                # Ajustar workers según latencia inicial
                self.worker_pool.adjust_workers()

            # Procesar mappings (igual que original)
            warehouses = results['warehouses']
            locations_int = results['locations_int']
            customer_loc_ids = results['locations_cust']
            pts = results['picking_types']
            tags_res = results['tags']

            logger.info(f"Discovery: WH={len(warehouses)}, Loc={len(locations_int)}, Tags={len(tags_res)}")

            # Build mappings
            wh_map = {wh['id']: wh for wh in warehouses}
            tag_map = {t['id']: t['name'] for t in tags_res}

            # Warehouse keywords
            wh_keywords = {}
            for wh_id, wh in wh_map.items():
                name = wh['name'].upper()
                clean = name.replace("ANDYS", "").strip()
                if clean:
                    wh_keywords[clean.split()[0]] = wh_id
                wh_keywords[wh['code'].upper()] = wh_id

            # Picking type to warehouse mapping
            pt_to_wh = {}
            for pt in pts:
                if pt.get('warehouse_id'):
                    pt_to_wh[pt['id']] = pt['warehouse_id'][0]
                else:
                    pt_name = pt.get('name', '').upper()
                    for kw, wh_id in wh_keywords.items():
                        if kw in pt_name:
                            pt_to_wh[pt['id']] = wh_id
                            break

            # Location to warehouse mapping
            internal_loc_ids = [l['id'] for l in locations_int]
            loc_to_wh = {}
            for l in locations_int:
                if l.get('warehouse_id'):
                    loc_to_wh[l['id']] = l['warehouse_id'][0]
                else:
                    l_name = l['complete_name'].upper()
                    for kw, wh_id in wh_keywords.items():
                        if kw in l_name:
                            loc_to_wh[l['id']] = wh_id
                            break

            return {
                'warehouses': warehouses,
                'wh_map': wh_map,
                'tag_map': tag_map,
                'internal_loc_ids': internal_loc_ids,
                'customer_loc_ids': customer_loc_ids,
                'loc_to_wh': loc_to_wh,
                'pt_to_wh': pt_to_wh,
                'loc_names': {l['id']: l.get('complete_name', '') for l in locations_int}
            }

        except Exception as e:
            logger.error(f"Error en discovery: {e}", exc_info=True)
            return None

    def _optimized_extraction(self, discovery: dict) -> Optional[dict]:
        """
        Extracción optimizada con:
        - Worker pool dinámico
        - Delta sync (solo lo que cambió)
        - Circuit breaker
        """
        logger.info("📦 Extracción: Obteniendo datos de Odoo...")

        try:
            internal_loc_ids = discovery['internal_loc_ids']
            customer_loc_ids = discovery['customer_loc_ids']
            wh_map = discovery['wh_map']

            # Fechas para queries
            date_180_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d %H:%M:%S')
            date_120_ago = (datetime.now() - timedelta(days=120)).strftime('%Y-%m-%d %H:%M:%S')
            date_90_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')
            date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

            # Obtener fecha del último sync para delta
            last_sync_date = self.delta_manager.get_last_sync_date().strftime('%Y-%m-%d %H:%M:%S')
            logger.info(f"📅 Último sync: {last_sync_date}")

            # FASE 1: Obtener datos principales con worker pool dinámico
            extracted = {}

            with self.worker_pool.get_executor() as executor:
                logger.info(f"👥 Usando {self.worker_pool.current_workers} workers")

                # Rotation (ventas físicas) - 3 períodos
                futures = {}

                # Rotation 30d
                futures['rot_30'] = executor.submit(
                    self.client.call_kw,
                    "stock.move.line", "read_group",
                    [[('date', '>=', date_30_ago), ('state', '=', 'done'),
                      ('location_dest_id', 'in', customer_loc_ids),
                      ('location_id', 'in', internal_loc_ids)]],
                    {"fields": ['product_id', 'location_id', 'quantity:sum'],
                     "groupby": ['product_id', 'location_id'],
                     "lazy": False}
                )

                # Rotation 90d
                futures['rot_90'] = executor.submit(
                    self.client.call_kw,
                    "stock.move.line", "read_group",
                    [[('date', '>=', date_90_ago), ('state', '=', 'done'),
                      ('location_dest_id', 'in', customer_loc_ids),
                      ('location_id', 'in', internal_loc_ids)]],
                    {"fields": ['product_id', 'location_id', 'quantity:sum'],
                     "groupby": ['product_id', 'location_id'],
                     "lazy": False}
                )

                # Rotation 120d
                futures['rot_120'] = executor.submit(
                    self.client.call_kw,
                    "stock.move.line", "read_group",
                    [[('date', '>=', date_120_ago), ('state', '=', 'done'),
                      ('location_dest_id', 'in', customer_loc_ids),
                      ('location_id', 'in', internal_loc_ids)]],
                    {"fields": ['product_id', 'location_id', 'quantity:sum'],
                     "groupby": ['product_id', 'location_id'],
                     "lazy": False}
                )

                # Rotation 180d
                futures['rot_180'] = executor.submit(
                    self.client.call_kw,
                    "stock.move.line", "read_group",
                    [[('date', '>=', date_180_ago), ('state', '=', 'done'),
                      ('location_dest_id', 'in', customer_loc_ids),
                      ('location_id', 'in', internal_loc_ids)]],
                    {"fields": ['product_id', 'location_id', 'quantity:sum'],
                     "groupby": ['product_id', 'location_id'],
                     "lazy": False}
                )

                # Stock actual
                futures['stock'] = executor.submit(
                    self.client.call_kw,
                    "stock.quant", "read_group",
                    [[('location_id', 'in', internal_loc_ids), ('quantity', '!=', 0)]],
                    {"fields": ['product_id', 'location_id', 'quantity:sum'],
                     "groupby": ['product_id', 'location_id'],
                     "lazy": False}
                )

                # POS Revenue global
                futures['pos_global'] = executor.submit(
                    self.client.call_kw,
                    "pos.order.line", "read_group",
                    [[('order_id.date_order', '>=', date_30_ago)]],
                    {"fields": ['product_id', 'price_subtotal_incl:sum'],
                     "groupby": ['product_id'],
                     "lazy": False}
                )

                # POS Revenue por warehouse
                for wh_id in wh_map:
                    futures[f'pos_wh_{wh_id}'] = executor.submit(
                        self.client.call_kw,
                        "pos.order.line", "read_group",
                        [[('order_id.date_order', '>=', date_30_ago),
                          ('order_id.picking_type_id.warehouse_id', '=', wh_id)]],
                        {"fields": ['product_id', 'price_subtotal_incl:sum'],
                         "groupby": ['product_id'],
                         "lazy": False}
                    )

                # Purchase Orders
                po_line_domain = [
                    ('state', 'in', ['draft', 'sent', 'to approve', 'purchase']),
                    ('order_id.create_date', '>=', date_30_ago)
                ]

                futures['po_global'] = executor.submit(
                    self.client.call_kw,
                    "purchase.order.line", "read_group",
                    [po_line_domain],
                    {"fields": ['product_id', 'product_qty:sum', 'qty_received:sum'],
                     "groupby": ['product_id'],
                     "lazy": False}
                )

                # PO por warehouse
                for wh_id in wh_map:
                    d = po_line_domain + [('order_id.picking_type_id.warehouse_id', '=', wh_id)]
                    futures[f'po_wh_{wh_id}'] = executor.submit(
                        self.client.call_kw,
                        "purchase.order.line", "read_group",
                        [d],
                        {"fields": ['product_id', 'product_qty:sum', 'qty_received:sum'],
                         "groupby": ['product_id'],
                         "lazy": False}
                    )

                # PO Lines detalladas
                futures['po_lines'] = executor.submit(
                    self.client.call_kw,
                    "purchase.order.line", "search_read",
                    [po_line_domain],
                    {"fields": ["product_id", "product_qty", "qty_received", "order_id", "date_planned"],
                     "limit": 15000}
                )

                # PO Orders (todos los estados, últimos 30 días)
                futures['po_orders'] = executor.submit(
                    self.client.call_kw,
                    "purchase.order", "search_read",
                    [[('create_date', '>=', date_30_ago)]],
                    {"fields": ["id", "picking_type_id", "name", "partner_id", "state",
                               "date_order", "date_approve", "create_date", "company_id",
                               "user_id", "invoice_status", "receipt_status"]}
                )

                # PO Lines detalle para panel (todos los estados, últimos 30 días)
                futures['po_lines_detail'] = executor.submit(
                    self.client.call_kw,
                    "purchase.order.line", "search_read",
                    [[('order_id.create_date', '>=', date_30_ago)]],
                    {"fields": ["id", "order_id", "product_id", "product_qty", "qty_received",
                                "price_unit", "price_subtotal", "price_total",
                                "date_planned", "name", "state"],
                     "order": "id desc",
                     "limit": 50000}
                )

                # Orderpoints (reglas de stock) - solo campos esenciales
                futures['orderpoints'] = executor.submit(
                    self.client.call_kw,
                    "stock.warehouse.orderpoint", "search_read",
                    [[]],
                    {"fields": ["product_id", "warehouse_id", "location_id",
                               "product_min_qty", "product_max_qty", "qty_multiple",
                               "group_id", "route_id"],
                     "limit": 100000}
                )

                # Recolectar resultados (con logging de progreso)
                total_futures = len(futures)
                completed = 0

                for key, future in futures.items():
                    try:
                        result = future.result()
                        extracted[key] = result or []
                        completed += 1

                        if completed % 5 == 0 or completed == total_futures:
                            logger.info(f"📊 Progreso: {completed}/{total_futures} queries completadas")

                        # Ajustar workers dinámicamente cada 5 queries
                        if completed % 5 == 0:
                            self.worker_pool.adjust_workers()

                    except Exception as e:
                        logger.error(f"Error en {key}: {e}")
                        extracted[key] = []

            logger.info(f"✅ Extracción completada: {len(extracted)} datasets obtenidos")

            # Calcular hashes para delta detection
            extracted['rotation_hash'] = calculate_hash([extracted.get('rot_30', []), extracted.get('rot_90', []), extracted.get('rot_120', []), extracted.get('rot_180', [])])
            extracted['stock_hash'] = calculate_hash(extracted.get('stock', []))
            extracted['po_hash'] = calculate_hash([extracted.get('po_global', []), extracted.get('po_lines', [])])
            extracted['orderpoints_hash'] = calculate_hash(extracted.get('orderpoints', []))

            # Log cambios detectados
            changes = 0
            if self.delta_manager.should_fetch_section('rotation', extracted['rotation_hash']):
                changes += 1
            if self.delta_manager.should_fetch_section('stock', extracted['stock_hash']):
                changes += 1
            if self.delta_manager.should_fetch_section('po', extracted['po_hash']):
                changes += 1
            if self.delta_manager.should_fetch_section('orderpoints', extracted['orderpoints_hash']):
                changes += 1

            self.metrics.metrics.delta_changes_detected = changes
            logger.info(f"🔄 Secciones con cambios: {changes}/4")

            return extracted

        except Exception as e:
            logger.error(f"Error en extracción: {e}", exc_info=True)
            return None

    def _parallel_processing(self, extracted: dict, discovery: dict) -> Optional[dict]:
        """Procesamiento paralelo de datos mientras se extraen"""
        logger.info("⚙️  Procesamiento: Transformando datos...")

        try:
            wh_map = discovery['wh_map']
            loc_to_wh = discovery['loc_to_wh']
            tag_map = discovery['tag_map']
            pt_to_wh = discovery['pt_to_wh']

            # 1. Procesar Rotation (ventas)
            loc_names = discovery.get('loc_names', {})
            rotation_map, rotation_by_wh = self._process_rotation(extracted.get('rot_30', []), loc_to_wh, loc_names)
            rotation_90d_map, rotation_90d_by_wh = self._process_rotation(extracted.get('rot_90', []), loc_to_wh, loc_names)
            rotation_120d_map, rotation_120d_by_wh = self._process_rotation(extracted.get('rot_120', []), loc_to_wh, loc_names)
            rotation_180d_map, rotation_180d_by_wh = self._process_rotation(extracted.get('rot_180', []), loc_to_wh, loc_names)

            logger.info(f"✓ Rotation procesada: 30d={len(rotation_map)}, 90d={len(rotation_90d_map)}, 120d={len(rotation_120d_map)}, 180d={len(rotation_180d_map)}")

            # 2. Procesar Stock
            stock_by_wh = self._process_stock(extracted.get('stock', []), loc_to_wh, loc_names)
            logger.info(f"✓ Stock procesado: {len(stock_by_wh)} productos")

            # 3. Procesar Revenue
            revenue_map = self._process_revenue_global(extracted.get('pos_global', []))
            revenue_by_wh = self._process_revenue_by_wh(extracted, wh_map)
            logger.info(f"✓ Revenue procesado: global={len(revenue_map)}, por_wh={len(revenue_by_wh)}")

            # 4. Procesar Sales (combinando rotation con revenue)
            sales_map, sales_by_wh = rotation_map.copy(), rotation_by_wh.copy()
            sales_90d_map, sales_by_wh_90d = rotation_90d_map.copy(), rotation_90d_by_wh.copy()
            sales_120d_map, sales_by_wh_120d = rotation_120d_map.copy(), rotation_120d_by_wh.copy()
            sales_180d_map, sales_by_wh_180d = rotation_180d_map.copy(), rotation_180d_by_wh.copy()

            # 5. Procesar Purchase Orders
            pending_by_product, pending_orders_by_product, po_details = self._process_purchase_orders(
                extracted, wh_map, pt_to_wh
            )
            logger.info(f"✓ POs procesadas: {len(pending_by_product)} productos con pedidos")

            # 6. Procesar Orderpoints
            orderpoints_by_product = self._process_orderpoints(extracted.get('orderpoints', []), loc_to_wh)
            logger.info(f"✓ Orderpoints procesados: {len(orderpoints_by_product)} productos")

            return {
                'rotation_map': rotation_map,
                'rotation_by_wh': rotation_by_wh,
                'rotation_90d_map': rotation_90d_map,
                'rotation_90d_by_wh': rotation_90d_by_wh,
                'rotation_180d_map': rotation_180d_map,
                'rotation_180d_by_wh': rotation_180d_by_wh,
                'stock_by_wh': stock_by_wh,
                'revenue_map': revenue_map,
                'revenue_by_wh': revenue_by_wh,
                'sales_map': sales_map,
                'sales_by_wh': sales_by_wh,
                'sales_90d_map': sales_90d_map,
                'sales_by_wh_90d': sales_by_wh_90d,
                'sales_120d_map': sales_120d_map,
                'sales_by_wh_120d': sales_by_wh_120d,
                'sales_180d_map': sales_180d_map,
                'sales_by_wh_180d': sales_by_wh_180d,
                'pending_by_product': pending_by_product,
                'pending_orders_by_product': pending_orders_by_product,
                'orderpoints_by_product': orderpoints_by_product,
                'po_lines_detail': extracted.get('po_lines_detail', []),
                'po_orders_raw': extracted.get('po_orders', []),
            }

        except Exception as e:
            logger.error(f"Error en procesamiento: {e}", exc_info=True)
            return None

    def _process_rotation(self, rot_groups: list, loc_to_wh: dict, loc_names: dict) -> Tuple[dict, dict]:
        """Procesa grupos de rotation en mapas por producto y warehouse"""
        rotation_map = {}
        rotation_by_wh = {}

        for g in rot_groups:
            if not g.get('product_id'):
                continue
            pid, lid, qty = g['product_id'][0], g['location_id'][0], g.get('quantity') or 0
            
            # FILTRO: Solo considerar existencias reales (ignorar devoluciones, merma, etc.)
            loc_name = loc_names.get(lid, "").upper()
            if "EXISTENCIAS" not in loc_name:
                continue

            wh_id = loc_to_wh.get(lid)
            rotation_map[pid] = rotation_map.get(pid, 0) + qty

            if wh_id:
                if pid not in rotation_by_wh:
                    rotation_by_wh[pid] = {}
                rotation_by_wh[pid][wh_id] = rotation_by_wh[pid].get(wh_id, 0) + qty

        return rotation_map, rotation_by_wh

    def _process_stock(self, stock_groups: list, loc_to_wh: dict, loc_names: dict) -> dict:
        """Procesa stock por warehouse"""
        stock_by_wh = {}

        for g in stock_groups:
            if not g.get('product_id'):
                continue
            pid, lid, qty = g['product_id'][0], g['location_id'][0], g.get('quantity') or 0
            
            # FILTRO: Solo considerar existencias reales (ignorar devoluciones, merma, etc.)
            loc_name = loc_names.get(lid, "").upper()
            if "EXISTENCIAS" not in loc_name:
                continue

            wh_id = loc_to_wh.get(lid)

            if wh_id:
                if pid not in stock_by_wh:
                    stock_by_wh[pid] = {}
                stock_by_wh[pid][wh_id] = stock_by_wh[pid].get(wh_id, 0) + qty

        return stock_by_wh

    def _process_revenue_global(self, pos_groups: list) -> dict:
        """Procesa revenue global"""
        return {g['product_id'][0]: (g.get('price_subtotal_incl') or 0)
                for g in pos_groups if g.get('product_id')}

    def _process_revenue_by_wh(self, extracted: dict, wh_map: dict) -> dict:
        """Procesa revenue por warehouse"""
        revenue_by_wh = {}

        for wh_id in wh_map:
            wh_res = extracted.get(f'pos_wh_{wh_id}', [])
            for g in wh_res:
                if not g.get('product_id'):
                    continue
                pid, rev = g['product_id'][0], g.get('price_subtotal_incl') or 0
                if pid not in revenue_by_wh:
                    revenue_by_wh[pid] = {}
                revenue_by_wh[pid][wh_id] = rev

        return revenue_by_wh

    def _process_purchase_orders(self, extracted: dict, wh_map: dict, pt_to_wh: dict) -> Tuple[dict, dict, dict]:
        """Procesa órdenes de compra"""
        po_lines = extracted.get('po_lines', [])
        po_orders = extracted.get('po_orders', [])

        po_details = {o['id']: o for o in po_orders}

        # Aggregate PO Totals por warehouse
        pending_by_product = {}
        for wh_id in wh_map:
            wh_res = extracted.get(f'po_wh_{wh_id}', [])
            for g in wh_res:
                if not g.get('product_id'):
                    continue
                pid = g['product_id'][0]
                qty = (g.get('product_qty') or 0) - (g.get('qty_received') or 0)
                if qty <= 0.05:
                    continue
                if pid not in pending_by_product:
                    pending_by_product[pid] = {}
                pending_by_product[pid][wh_id] = qty

        # Individual orders para tooltip
        pending_orders_by_product = {}
        for l in po_lines:
            if not l.get('product_id'):
                continue
            pid = l['product_id'][0]
            qty = (l.get('product_qty') or 0) - (l.get('qty_received') or 0)
            if qty <= 0.05:
                continue

            oid = l['order_id'][0]
            if oid not in po_details:
                continue
            po = po_details[oid]

            if pid not in pending_orders_by_product:
                pending_orders_by_product[pid] = []

            wh_id = None
            if po.get('picking_type_id'):
                wh_id = pt_to_wh.get(po['picking_type_id'][0])

            pending_orders_by_product[pid].append({
                "order_name": po.get('name', ''),
                "qty": qty,
                "date_planned": l.get('date_planned', ''),
                "supplier": po.get('partner_id', [None, 'N/A'])[1] if po.get('partner_id') else 'N/A',
                "state": po.get('state', 'draft'),
                "warehouse_id": wh_id,
                "company_name": "EXPANDIA" if po.get('company_id') and "Expandia" in str(po['company_id']) else
                                ("ANDYS" if po.get('company_id') and "Andy" in str(po['company_id']) else
                                 (str(po.get('company_id', [None, 'N/A'])[1]).split(' ')[0].upper())),
                "date_order": po.get('date_approve') or po.get('create_date') or ''
            })

        return pending_by_product, pending_orders_by_product, po_details

    def _process_orderpoints(self, orderpoints: list, loc_to_wh: dict) -> dict:
        """Procesa orderpoints (reglas de stock min/max)"""
        orderpoints_by_product = {}

        for op in orderpoints:
            if not op.get('product_id'):
                continue
            pid = op['product_id'][0]

            # Resolve warehouse
            wh_id = None
            if op.get('warehouse_id'):
                wh_id = op['warehouse_id'][0]
            elif op.get('location_id'):
                wh_id = loc_to_wh.get(op['location_id'][0])

            if not wh_id:
                continue

            # Keep rule with highest max qty
            new_max = op.get('product_max_qty') or 0

            if pid not in orderpoints_by_product:
                orderpoints_by_product[pid] = {}

            if wh_id in orderpoints_by_product[pid]:
                existing_max = orderpoints_by_product[pid][wh_id]['max']
                if new_max <= existing_max:
                    continue

            orderpoints_by_product[pid][wh_id] = {
                "min": op.get('product_min_qty') or 0,
                "max": new_max,
                "multiple": op.get('qty_multiple') or 0,
                "group": op['group_id'][1] if op.get('group_id') else '',
                "route": op['route_id'][1] if op.get('route_id') else ''
            }

        return orderpoints_by_product

    def _build_cache_data(self, processed: dict, discovery: dict) -> dict:
        """Construye estructura de cache final con ABC y productos completos"""
        logger.info("🏗️  Construyendo estructura de cache...")

        try:
            # Calcular ABC
            abc_rot_g = calculate_abc_segments(processed['rotation_map'])
            abc_rev_g = calculate_abc_segments(processed['revenue_map'])

            # ABC data combinado
            abc_data = {}
            active_pids = list(set(
                list(processed['rotation_map'].keys()) +
                list(processed['revenue_map'].keys()) +
                list(processed['stock_by_wh'].keys()) +
                list(processed['pending_by_product'].keys())
            ))

            for pid in active_pids:
                cat_rot = abc_rot_g.get(pid, {'cat': 'E'})['cat']
                cat_rev = abc_rev_g.get(pid, {'cat': 'E'})['cat']
                best_cat_global = cat_rot  # Priorizar rotation

                abc_data[pid] = {
                    "category": best_cat_global,
                    "rotation": cat_rot,
                    "revenue": cat_rev,
                    "by_warehouse": {}
                }

            # ABC por warehouse
            all_wh_ids = set()
            for wh_stocks in processed['stock_by_wh'].values():
                for wh_id in wh_stocks:
                    all_wh_ids.add(wh_id)

            wh_map = discovery['wh_map']

            # Pre-compute product sets per warehouse to avoid O(N*M) inner loops
            pids_by_wh = {}
            for pid, wh_dict in processed['stock_by_wh'].items():
                for wh_id in wh_dict:
                    if wh_id not in pids_by_wh: pids_by_wh[wh_id] = set()
                    pids_by_wh[wh_id].add(pid)
            for pid, wh_dict in processed['rotation_by_wh'].items():
                for wh_id in wh_dict:
                    if wh_id not in pids_by_wh: pids_by_wh[wh_id] = set()
                    pids_by_wh[wh_id].add(pid)
            for pid, wh_dict in processed['revenue_by_wh'].items():
                for wh_id in wh_dict:
                    if wh_id not in pids_by_wh: pids_by_wh[wh_id] = set()
                    pids_by_wh[wh_id].add(pid)

            for wh_id in all_wh_ids:
                if wh_id not in wh_map:
                    continue

                wh_pids = pids_by_wh.get(wh_id, set())

                rot_dat = {p: processed['rotation_by_wh'].get(p, {}).get(wh_id, 0) for p in wh_pids}
                rev_dat = {p: processed['revenue_by_wh'].get(p, {}).get(wh_id, 0) for p in wh_pids}

                s_rot = calculate_abc_segments(rot_dat)
                s_rev = calculate_abc_segments(rev_dat)

                for pid in wh_pids:
                    if pid not in abc_data:
                        continue

                    cr = s_rot.get(pid, {'cat': 'E'})['cat']
                    cv = s_rev.get(pid, {'cat': 'E'})['cat']

                    abc_data[pid]["by_warehouse"][str(wh_id)] = {
                        "category": cr,
                        "rotation": cr,
                        "revenue": cv,
                        "val_rot": round(rot_dat.get(pid, 0), 2),
                        "val_rev": round(rev_dat.get(pid, 0), 2)
                    }

            # Fetch product details (con batching eficiente)
            logger.info(f"📦 Obteniendo detalles de {len(active_pids)} productos...")
            detail_products = self._fetch_product_details(active_pids)

            # Build final products
            final_products = self._build_final_products(
                detail_products,
                processed,
                abc_data,
                discovery['tag_map']
            )

            logger.info(f"✅ {len(final_products)} productos procesados completamente")

            def _leaf_categ(raw):
                """'All products / BEBIDAS / GASEOSAS' → 'GASEOSAS'"""
                if not raw:
                    return ''
                parts = [p.strip() for p in str(raw).split('/') if p.strip()]
                filtered = [p for p in parts if not p.lower().startswith('all product') and not p.lower().startswith('todos')]
                return filtered[-1] if filtered else (parts[-1] if parts else '')

            # Build purchase_orders panel list using already-fetched detail_products for barcodes
            barcode_map = {p['id']: (p.get('barcode') or '') for p in detail_products}
            categ_map = {p['id']: _leaf_categ(p['categ_id'][1] if isinstance(p.get('categ_id'), (list, tuple)) else '') for p in detail_products}
            abc_map = {pid: info.get('category', 'E') for pid, info in abc_data.items()}

            # Fetch categories for PO products NOT already in categ_map (not part of active stock)
            po_pids_all = list({
                line['product_id'][0]
                for line in processed.get('po_lines_detail', [])
                if line.get('product_id')
            })
            missing_pids = [pid for pid in po_pids_all if pid not in categ_map]
            if missing_pids:
                try:
                    missing_products = self.client.call_kw(
                        "product.product", "read",
                        [missing_pids],
                        {"fields": ["id", "barcode", "categ_id"]}
                    )
                    for p in (missing_products or []):
                        categ_map[p['id']] = _leaf_categ(p['categ_id'][1] if isinstance(p.get('categ_id'), (list, tuple)) else '')
                        if p['id'] not in barcode_map:
                            barcode_map[p['id']] = p.get('barcode') or ''
                    logger.info(f"📋 Categorías complementarias cargadas para {len(missing_pids)} productos de OC")
                except Exception as e:
                    logger.warning(f"No se pudieron cargar categorías complementarias de OC: {e}")
            _STATE_LABELS = {
                "draft": "Borrador", "sent": "Enviado", "to approve": "Por Aprobar",
                "purchase": "OC", "done": "Hecho", "cancel": "Cancelado",
            }
            _DELIVERY_LABELS = {
                "nothing": "Nada", "to invoice": "Por Facturar", "invoiced": "Facturado",
                "full": "Recibido", "partial": "Parcial", "pending": "Pendiente",
            }
            po_lines_detail = processed.get('po_lines_detail', [])
            po_order_map = {o['id']: o for o in processed.get('po_orders_raw', [])}
            purchase_orders = []
            for line in po_lines_detail:
                oid = line['order_id'][0] if line.get('order_id') else None
                order = po_order_map.get(oid, {})
                pid = line['product_id'][0] if line.get('product_id') else None
                raw_state = order.get('state', line.get('state', 'draft'))
                raw_delivery = order.get('receipt_status') or order.get('invoice_status') or ''
                purchase_orders.append({
                    'line_id': line['id'],
                    'order_ref': order.get('name') or (line['order_id'][1] if line.get('order_id') else ''),
                    'barcode': barcode_map.get(pid, ''),
                    'description': re.sub(r'^\[[^\]]*\]\s*', '', line.get('name') or (line['product_id'][1] if line.get('product_id') else '')),
                    'qty': float(line.get('product_qty') or 0),
                    'qty_received': float(line.get('qty_received') or 0),
                    'date_planned': str(line.get('date_planned') or ''),
                    'date_order': str(order.get('date_order') or ''),
                    'price_unit': float(line.get('price_unit') or 0),
                    'price_total': float(line.get('price_total') or 0),
                    'price_subtotal': float(line.get('price_subtotal') or 0),
                    'supplier': order.get('partner_id', [None, ''])[1] if order.get('partner_id') else '',
                    'entregar_a': order.get('picking_type_id', [None, ''])[1] if order.get('picking_type_id') else '',
                    'categ_name': categ_map.get(pid, ''),
                    'state_raw': raw_state,
                    'state_label': _STATE_LABELS.get(raw_state, str(raw_state).capitalize()),
                    'delivery_status': _DELIVERY_LABELS.get(raw_delivery, raw_delivery),
                    'buyer': order.get('user_id', [None, ''])[1] if order.get('user_id') else '',
                    'order_id': oid,
                    'abc_category': abc_map.get(pid, '') if pid else '',
                })
            logger.info(f"✅ {len(purchase_orders)} líneas de compra incluidas en cache")

            # Build ABC summary
            summary = {"rotation": {}, "revenue": {}}
            for i in abc_rot_g.values():
                summary["rotation"][i['cat']] = summary["rotation"].get(i['cat'], 0) + 1
            for i in abc_rev_g.values():
                summary["revenue"][i['cat']] = summary["revenue"].get(i['cat'], 0) + 1

            # Build cache structure
            cache_data = {
                "last_update": datetime.now().isoformat(),
                "products": final_products,
                "warehouses": discovery['warehouses'],
                "abc_summary": summary,
                "global_stats": {
                    "pending": len([p for p in final_products if p['total_pending'] > 0]),
                    "out_of_stock": len([p for p in final_products if p['total_stock'] <= 0])
                },
                "purchase_orders": purchase_orders,
                "next_sync": None  # Will be set by main.py
            }

            processed['final_products'] = final_products
            return cache_data

        except Exception as e:
            logger.error(f"Error construyendo cache: {e}", exc_info=True)
            return {}

    def _fetch_product_details(self, product_ids: list) -> list:
        """Fetch product details con batching paralelo"""
        detail_products = []

        fields = ["id", "display_name", "barcode", "default_code", "product_tmpl_id",
                 "seller_ids", "standard_price", "type", "categ_id", "brand_id",
                 "additional_product_tag_ids", "product_tag_ids", "uom_package"]

        def fetch_batch(batch):
            try:
                base_rows = self.client.call_kw("product.product", "read", [batch], {"fields": fields}) or []
                adaptia_price_by_id = {}
                if self.adaptia_company_context:
                    adaptia_rows = self.client.call_kw(
                        "product.product",
                        "read",
                        [batch],
                        {"fields": ["id", "standard_price"], "context": self.adaptia_company_context},
                    ) or []
                    adaptia_price_by_id = {
                        row["id"]: round(float(row.get("standard_price") or 0), 2)
                        for row in adaptia_rows
                    }
                for row in base_rows:
                    row["adaptia_standard_price"] = adaptia_price_by_id.get(row["id"], 0.0)
                return base_rows
            except Exception as e:
                logger.error(f"Error fetching product batch: {e}")
                return []

        batches = [product_ids[i:i+400] for i in range(0, len(product_ids), 400)]

        with self.worker_pool.get_executor() as executor:
            futures = [executor.submit(fetch_batch, batch) for batch in batches]

            for i, future in enumerate(futures):
                if i % 5 == 0:
                    logger.info(f"Productos: batch {i+1}/{len(batches)}")

                result = future.result()
                for p in (result or []):
                    detail_products.append(p)

        # Fetch supplier names + prices
        sel_ids = list(set([sid for p in detail_products for sid in (p.get('seller_ids') or [])]))
        supplier_map = {}
        # Per-partner price maps: pid/tmpl_id → {partner_id → {price, prev_price, date}}
        # Records processed in write_date desc order → first entry per partner = most recent
        self._price_by_pid_partner: dict = {}
        self._price_by_tmpl_partner: dict = {}

        if sel_ids:
            def fetch_s(b):
                return self.client.call_kw(
                    "product.supplierinfo",
                    "read",
                    [b],
                    {"fields": ["id", "partner_id", "product_id", "product_tmpl_id",
                                "price", "date_start", "write_date"]},
                )

            s_batches = [sel_ids[i:i+500] for i in range(0, len(sel_ids), 500)]

            with self.worker_pool.get_executor() as executor:
                s_res = []
                for result in executor.map(fetch_s, s_batches):
                    s_res.extend(result or [])

                # Sort by write_date desc — matches purchase-suggestion's "order: write_date desc"
                s_res.sort(key=lambda x: x.get('write_date') or '', reverse=True)

                # Build per-partner price maps (same algorithm as /api/purchase-suggestion)
                for s in s_res:
                    price_val = float(s.get('price') or 0)
                    date_val = str(s.get('date_start') or s.get('write_date') or '')
                    if ' ' in date_val:
                        date_val = date_val[:10]
                    elif 'T' in date_val:
                        date_val = date_val[:10]
                    partner_id = s['partner_id'][0] if s.get('partner_id') else 0

                    if s.get('product_id'):
                        _pid = s['product_id'][0]
                        pid_partners = self._price_by_pid_partner.setdefault(_pid, {})
                        if partner_id not in pid_partners:
                            pid_partners[partner_id] = {'price': price_val, 'prev_price': 0.0, 'date': date_val}
                        elif pid_partners[partner_id]['prev_price'] == 0.0:
                            pid_partners[partner_id]['prev_price'] = price_val

                    if s.get('product_tmpl_id'):
                        _tmpl = s['product_tmpl_id'][0]
                        tmpl_partners = self._price_by_tmpl_partner.setdefault(_tmpl, {})
                        if partner_id not in tmpl_partners:
                            tmpl_partners[partner_id] = {'price': price_val, 'prev_price': 0.0, 'date': date_val}
                        elif tmpl_partners[partner_id]['prev_price'] == 0.0:
                            tmpl_partners[partner_id]['prev_price'] = price_val

                p_ids = list(set([s['partner_id'][0] for s in s_res if s.get('partner_id')]))
                p_name_m = {}

                def fetch_p(b):
                    return self.client.call_kw("res.partner", "read", [b], {"fields": ["id", "name"]})

                p_batches = [p_ids[i:i+500] for i in range(0, len(p_ids), 500)]
                for result in executor.map(fetch_p, p_batches):
                    for part in (result or []):
                        p_name_m[part['id']] = part['name']

                for s in s_res:
                    product_id = s['product_id'][0] if s.get('product_id') else None
                    product_tmpl_id = s['product_tmpl_id'][0] if s.get('product_tmpl_id') else None
                    supplier_map[s['id']] = {
                        "name": p_name_m.get(s['partner_id'][0], "N/A"),
                        "partner_id": s['partner_id'][0],
                        "product_id": product_id,
                        "product_tmpl_id": product_tmpl_id,
                    }

        # Store supplier_map for later use
        self._supplier_map = supplier_map

        return detail_products

    def _get_supplier_prices(self, pid: int, tmpl_id: int, partner_id: int = 0) -> dict:
        pid_map = getattr(self, '_price_by_pid_partner', {})
        tmpl_map = getattr(self, '_price_by_tmpl_partner', {})

        # 1. Try primary supplier's prices (same as purchase-suggestion filtered by that supplier)
        ph = {}
        if partner_id:
            ph = (pid_map.get(pid, {}).get(partner_id)
                  or tmpl_map.get(tmpl_id, {}).get(partner_id)
                  or {})

        # 2. Fallback: globally newest (first partner inserted = has the newest write_date record)
        if not ph:
            pid_partners = pid_map.get(pid, {})
            ph = next(iter(pid_partners.values()), {}) if pid_partners else {}
        if not ph:
            tmpl_partners = tmpl_map.get(tmpl_id, {})
            ph = next(iter(tmpl_partners.values()), {}) if tmpl_partners else {}

        return {
            "list_price":        round(float(ph.get('price', 0) or 0), 2),
            "prev_list_price":   round(float(ph.get('prev_price', 0) or 0), 2),
            "price_update_date": ph.get('date', '') or '',
        }

    def _build_final_products(self, detail_products: list, processed: dict,
                             abc_data: dict, tag_map: dict) -> list:
        """Construye lista final de productos con todos los datos"""
        final_products = []

        for p in detail_products:
            pid = p['id']

            sales_val = processed['sales_map'].get(pid, 0)
            rot_val = processed['rotation_map'].get(pid, 0)
            pending_val = float(sum(processed['pending_by_product'].get(pid, {}).values()))
            total_stock = float(sum(processed['stock_by_wh'].get(pid, {}).values()))

            # Define activity: at least 1 sale in the last 30 days OR pending orders.
            # This matches the user's expected ~13,574 active products.
            has_activity = processed['rotation_map'].get(pid, 0) > 0.001 or pending_val > 0.001

            clean_name = re.sub(r'\[.*?\]', '', p.get('display_name') or "").strip()

            # Provider
            provider, provider_id = "N/A", 0
            sel = pick_best_supplier(p, self._supplier_map)
            if sel:
                provider, provider_id = sel['name'], sel['partner_id'] or 0

            origin = self.provider_origins.get(provider.strip().upper(), "N/A")
            if provider == "N/A" or is_internal_supplier_name(provider) or is_store_fallback_supplier(provider):
                brand_name = p['brand_id'][1] if isinstance(p.get('brand_id'), (list, tuple)) else None
                if brand_name and brand_name != "N/A" and not is_internal_supplier_name(brand_name):
                    provider = brand_name
                    provider_id = 0  # no partner_id for brand fallback — use globally newest price
                    origin = self.provider_origins.get(provider.strip().upper(), origin)
            abc_item = abc_data.get(pid, {})
            provider_upper = provider.strip().upper()
            base_leadtime = self.leadtimes.get(provider_upper, 0)
            has_leadtime = provider_upper in self.leadtimes and base_leadtime > 0

            final_products.append({
                "id": pid,
                "barcode": p.get('barcode') or "",
                "name": clean_name,
                "provider": provider,
                "origen": origin,
                "has_leadtime": has_leadtime,
                "base_leadtime": base_leadtime,
                "has_activity": has_activity,
                "total_stock": total_stock,
                "stock_by_wh": {str(k): float(v) for k, v in processed['stock_by_wh'].get(pid, {}).items()},
                "sales_30d": float(sales_val),
                "sales_30d_global": float(processed['rotation_map'].get(pid, 0)),
                "sales_by_wh": {str(wh): float(q) for wh, q in processed['sales_by_wh'].get(pid, {}).items() if q > 0.05},
                "sales_90d": float(processed['sales_90d_map'].get(pid, 0)),
                "sales_by_wh_90d": {str(wh): float(q) for wh, q in processed['sales_by_wh_90d'].get(pid, {}).items() if q > 0.05},
                "sales_120d": float(processed['sales_120d_map'].get(pid, 0)),
                "sales_by_wh_120d": {str(wh): float(q) for wh, q in processed['sales_by_wh_120d'].get(pid, {}).items() if q > 0.05},
                "sales_180d": float(processed['sales_180d_map'].get(pid, 0)),
                "sales_by_wh_180d": {str(wh): float(q) for wh, q in processed['sales_by_wh_180d'].get(pid, {}).items() if q > 0.05},
                "total_pending": float(sum(processed['pending_by_product'].get(pid, {}).values())),
                "pending_by_wh": {str(wh): float(q) for wh, q in processed['pending_by_product'].get(pid, {}).items()},
                "pending_orders": processed['pending_orders_by_product'].get(pid, []),
                "orderpoints_by_wh": {str(wh): val for wh, val in processed['orderpoints_by_product'].get(pid, {}).items()},
                "uom_package": p.get('uom_package') or 0,
                "default_code": p.get('default_code') or "",
                "product_tmpl_id": (p.get('product_tmpl_id') or [0])[0] if isinstance(p.get('product_tmpl_id'), list) else (p.get('product_tmpl_id') or 0),
                "abc_category": abc_item.get('category', 'E'),
                "abc_details": f"{abc_item.get('rotation', 'E')}/{abc_item.get('revenue', 'E')}",
                "abc_by_wh": abc_item.get("by_warehouse", {}),
                "type_name": p.get('type') or "consu",
                "category_name": p['categ_id'][1] if isinstance(p.get('categ_id'), (list, tuple)) else "N/A",
                "brand_name": p['brand_id'][1] if isinstance(p.get('brand_id'), (list, tuple)) else "N/A",
                "tags": [tag_map.get(tid) for tid in (list(set((p.get('additional_product_tag_ids') or []) + (p.get('product_tag_ids') or [])))) if tag_map.get(tid)],
                "cost_price": round(float(p.get('adaptia_standard_price') or 0), 2) or round(float(p.get('standard_price') or 0), 2),
                **self._get_supplier_prices(pid, (p.get('product_tmpl_id') or [0])[0] if isinstance(p.get('product_tmpl_id'), list) else (p.get('product_tmpl_id') or 0), provider_id),
            })

            if final_products[-1]["cost_price"] <= 0 and final_products[-1]["list_price"] > 0:
                final_products[-1]["cost_price"] = final_products[-1]["list_price"]

            if not final_products[-1]["tags"]:
                final_products[-1]["tags"] = ["Ninguno"]

        return final_products
