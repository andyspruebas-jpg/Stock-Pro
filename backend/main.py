from fastapi import FastAPI, Query, BackgroundTasks, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import requests
import json
import logging
import os
import re
from datetime import datetime, timedelta
import math
import concurrent.futures
import gzip
import asyncio
import time
import openai

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    # Look for .env in parent directory (project root)
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logger_temp = logging.getLogger(__name__)
        logger_temp.info(f"Loaded environment variables from {env_path}")
except ImportError:
    # python-dotenv not installed, skip
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Simple Auth Security (For production use environment variables and a real DB)
SECRET_TOKEN = os.environ.get("SECRET_TOKEN", "change-this-secret-token")

# VALID_USERS: Load from environment or use defaults for development
# Format in .env: VALID_USERS=admin:pass123,user2:pass456
_users_env = os.environ.get("VALID_USERS", "")
if _users_env:
    VALID_USERS = {}
    for user_pass in _users_env.split(","):
        if ":" in user_pass:
            user, pwd = user_pass.split(":", 1)
            VALID_USERS[user.strip()] = pwd.strip()
else:
    # Fallback defaults (CHANGE THESE IN PRODUCTION via .env)
    VALID_USERS = {
        "admin": "change_this_password",
        "demo": "demo_password"
    }




# Global variables to serve as In-Memory Cache
_data_cache = None
_cache_last_modified = 0

# Odoo Configuration (from environment variables)
ODOO_URL = os.environ.get("ODOO_URL", "https://your-odoo-instance.com")
ODOO_DB = os.environ.get("ODOO_DB", "your_database")
ODOO_USER = os.environ.get("ODOO_USER", "your_user@example.com")
ODOO_PASS = os.environ.get("ODOO_PASS", "your_password")

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "your-fallback-key-here")
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(BASE_DIR, "last_sync_cache.json")
USER_DATA_FILE = os.path.join(BASE_DIR, "users_data.json")
_is_syncing = False
_next_sync_time = None # ISO format string

def load_user_data():
    if os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, "r") as f:
            return json.load(f)
    return {}

def save_user_data(data):
    with open(USER_DATA_FILE, "w") as f:
        json.dump(data, f)

# Initialize user data with defaults if empty
_user_profiles = load_user_data()
for user in VALID_USERS:
    if user not in _user_profiles:
        _user_profiles[user] = {"username": user, "avatar": None, "password": VALID_USERS[user]}
save_user_data(_user_profiles)

# Restore next_sync from cache if available to persist timer across restarts
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, "r") as f:
            cdata = json.load(f)
            _next_sync_time = cdata.get("next_sync")
            # If next sync is in the past, reset it (auto-sync will pick it up)
            if _next_sync_time:
                ns = datetime.fromisoformat(_next_sync_time)
                if ns < datetime.now():
                    _next_sync_time = None
    except: pass

def load_provider_origins():
    origins = {}
    # Root dir is parent of backend dir
    csv_path = os.path.join(os.path.dirname(BASE_DIR), "clasificacion proveedores.csv")
    if os.path.exists(csv_path):
        try:
            import csv
            with open(csv_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.reader(f, delimiter=';')
                for row in reader:
                    if len(row) >= 2:
                        provider = row[0].strip().upper()
                        origin = row[1].strip()
                        origins[provider] = origin
        except Exception as e:
            logger.error(f"Error loading provider origins: {e}")
    return origins

class OdooClient:
    def __init__(self):
        self.session = requests.Session()
        # Increase pool size for concurrent tasks
        adapter = requests.adapters.HTTPAdapter(pool_connections=20, pool_maxsize=20)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.url = ODOO_URL

    def authenticate(self):
        try:
            payload = {
                "jsonrpc": "2.0",
                "params": {
                    "db": ODOO_DB,
                    "login": ODOO_USER,
                    "password": ODOO_PASS
                }
            }
            response = self.session.post(f"{self.url}/web/session/authenticate", json=payload, timeout=20)
            result = response.json()
            if result.get("error"):
                logger.error(f"Odoo Auth Error: {result['error']}")
                return False
            return True
        except Exception as e:
            logger.error(f"Odoo Connection Error: {e}")
            return False

    def call_kw(self, model, method, args=None, kwargs=None):
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "model": model,
                "method": method,
                "args": args or [],
                "kwargs": kwargs or {}
            },
            "id": 1
        }
        response = self.session.post(f"{self.url}/web/dataset/call_kw", json=payload, timeout=120)
        return response.json().get("result")

def calculate_abc_segments(data_dict, force_aa_threshold=None):
    if not data_dict: return {}
    
    # Force items to be numeric and sort
    sorted_items = sorted([(pid, float(v or 0)) for pid, v in data_dict.items()], key=lambda x: x[1], reverse=True)
    total_val = sum(x[1] for x in sorted_items)
    active_items = [x for x in sorted_items if x[1] > 0.000001]
    num_active = len(active_items)
    
    # Pre-populate all as E
    results = {pid: {'cat': 'E', 'part': 0, 'cum': 100} for pid, _ in sorted_items}
    if total_val <= 0 or num_active == 0: return results
    
    cum_sum = 0
    cat_order = {'AA': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5}
    
    for i, (pid, val) in enumerate(active_items):
        cum_sum += val
        cum_perc = (cum_sum / total_val) * 100
        part = (val / total_val) * 100
        
        # Valor thresholds (Elite-Restrictive)
        if cum_perc <= 1: v_cat = 'AA'
        elif cum_perc <= 5: v_cat = 'A'
        elif cum_perc <= 20: v_cat = 'B'
        elif cum_perc <= 50: v_cat = 'C'
        else: v_cat = 'D'
        
        # Rank thresholds (Elite-Restrictive)
        rank_perc = (i / num_active) * 100
        if rank_perc <= 1: r_cat = 'AA'
        elif rank_perc <= 5: r_cat = 'A'
        elif rank_perc <= 20: r_cat = 'B'
        elif rank_perc <= 50: r_cat = 'C'
        else: r_cat = 'D'
        
        # Best of both
        best = v_cat
        if cat_order[r_cat] < cat_order[v_cat]:
            best = r_cat
            
        # Guarantee top item
        if i == 0: best = 'AA'
        
        # Override
        if force_aa_threshold and val >= force_aa_threshold:
            best = 'AA'
            
        results[pid] = {'cat': best, 'part': round(part, 2), 'cum': round(cum_perc, 2)}
    return results

def fetch_active_products_data():
    global _is_syncing
    if _is_syncing:
        logger.warning("Sincronización ya está en curso. Saltando.")
        return None
        
    _is_syncing = True
    client = OdooClient()
    if not client.authenticate():
        logger.error("Failed to authenticate with Odoo")
        return None

    try:
        # 1. Start discovery (Warehouses and internal location IDs)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            fut_wh = executor.submit(client.call_kw, "stock.warehouse", "search_read", [], {"fields": ["id", "name", "code", "lot_stock_id"]})
            fut_loc_int = executor.submit(client.call_kw, "stock.location", "search_read", [[('usage', '=', 'internal')]], {"fields": ["id", "warehouse_id", "complete_name"]})
            fut_loc_cust = executor.submit(client.call_kw, "stock.location", "search", [[('usage', '=', 'customer')]])
            fut_pts = executor.submit(client.call_kw, "stock.picking.type", "search_read", [], {"fields": ["id", "warehouse_id"]})
            fut_tags = executor.submit(client.call_kw, "product.tag", "search_read", [], {"fields": ["id", "name"]})
            
            warehouses = fut_wh.result() or []
            locations_int = fut_loc_int.result() or []
            customer_loc_ids = fut_loc_cust.result() or []
            pts = fut_pts.result() or []
            tags_res = fut_tags.result() or []
            
        tag_map = {t['id']: t['name'] for t in tags_res}
            
        logger.info(f"Discovery: WH={len(warehouses)}, LocInt={len(locations_int)}, LocCust={len(customer_loc_ids)}, PTs={len(pts)}")

        wh_map = {wh['id']: wh for wh in warehouses}
        # Improved Keyword Map: map 'ACHUMANI' -> wh_id
        wh_keywords = {}
        for wh_id, wh in wh_map.items():
            name = wh['name'].upper()
            # Extract distinctive part (after ANDYS)
            clean = name.replace("ANDYS", "").strip()
            if clean:
                wh_keywords[clean.split()[0]] = wh_id
            wh_keywords[wh['code'].upper()] = wh_id

        pt_to_wh = {}
        for pt in pts:
            if pt.get('warehouse_id'): 
                pt_to_wh[pt['id']] = pt['warehouse_id'][0]
            else:
                pt_name = pt.get('name', '').upper()
                # Try keyword matching (e.g., if 'ACHUMANI' is in 'PoS Orders Achumani')
                matched = False
                for kw, wh_id in wh_keywords.items():
                    if kw in pt_name:
                        pt_to_wh[pt['id']] = wh_id
                        matched = True
                        break
                if not matched:
                    # Fallback to prefix matching
                    for wh_id, wh in wh_map.items():
                        if wh['code'].upper() in pt_name:
                            pt_to_wh[pt['id']] = wh_id; break

        internal_loc_ids = [l['id'] for l in locations_int]
        loc_to_wh = {}
        for l in locations_int:
            if l.get('warehouse_id'): 
                loc_to_wh[l['id']] = l['warehouse_id'][0]
            else:
                l_name = l['complete_name'].upper()
                for kw, wh_id in wh_keywords.items():
                    if kw in l_name:
                        loc_to_wh[l['id']] = wh_id; break

        date_90_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')
        date_30_ago = (datetime.now() - timedelta(days=30)).replace(hour=0, minute=0, second=0).strftime('%Y-%m-%d %H:%M:%S')

        # 2. Parallel Core Data (Rotation 90d, Stock, POS Revenue)
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            domain_rot = [('date', '>=', date_30_ago), ('state', '=', 'done'), 
                          ('location_dest_id', 'in', customer_loc_ids), ('location_id', 'in', internal_loc_ids)]
            fut_rot = executor.submit(client.call_kw, "stock.move.line", "read_group", 
                                     [domain_rot, ['product_id', 'location_id', 'quantity:sum'], ['product_id', 'location_id']], {"lazy": False})
            
            domain_stock = [('location_id', 'in', internal_loc_ids), ('quantity', '!=', 0)]
            fut_stock = executor.submit(client.call_kw, "stock.quant", "read_group",
                                       [domain_stock, ['product_id', 'location_id', 'quantity:sum'], ['product_id', 'location_id']], {"lazy": False})

            # POS Revenue Optimization: Global
            rev_domain = [('order_id.date_order', '>=', date_30_ago)]
            fut_pos_global = executor.submit(client.call_kw, "pos.order.line", "read_group", 
                                            [rev_domain, ['product_id', 'price_subtotal_incl:sum'], ['product_id']], {"lazy": False})
            
            # POS Revenue Optimization: Per-Warehouse (Parallel)
            wh_rev_futs = {}
            for wh_id in wh_map:
                d = rev_domain + [('order_id.picking_type_id.warehouse_id', '=', wh_id)]
                wh_rev_futs[wh_id] = executor.submit(client.call_kw, "pos.order.line", "read_group", 
                                                    [d, ['product_id', 'price_subtotal_incl:sum'], ['product_id']], {"lazy": False})

            rot_groups = fut_rot.result() or []
            logger.info("Rotation data received")
            stock_groups = fut_stock.result() or []
            logger.info("Stock data received")
            pos_global_groups = fut_pos_global.result() or []
            logger.info("POS Global data received")
            
            logger.info(f"Odoo Core Data: Rot={len(rot_groups)}, Stock={len(stock_groups)}, POS Global={len(pos_global_groups)}")

        # 3. Processing Maps (Rotation and Stock)
        rotation_map, rotation_by_wh = {}, {}
        for g in rot_groups:
            if not g.get('product_id'): continue
            pid, lid, qty = g['product_id'][0], g['location_id'][0], g.get('quantity') or 0
            wh_id = loc_to_wh.get(lid)
            rotation_map[pid] = rotation_map.get(pid, 0) + qty
            if wh_id:
                if pid not in rotation_by_wh: rotation_by_wh[pid] = {}
                rotation_by_wh[pid][wh_id] = rotation_by_wh[pid].get(wh_id, 0) + qty

        stock_by_wh = {}
        for g in stock_groups:
            if not g.get('product_id'): continue
            pid, lid, qty = g['product_id'][0], g['location_id'][0], g.get('quantity') or 0
            wh_id = loc_to_wh.get(lid)
            if wh_id:
                if pid not in stock_by_wh: stock_by_wh[pid] = {}
                stock_by_wh[pid][wh_id] = stock_by_wh[pid].get(wh_id, 0) + qty

        # Processing POS Revenue Maps
        revenue_map = {g['product_id'][0]: (g.get('price_subtotal_incl') or 0) for g in pos_global_groups if g.get('product_id')}
        revenue_by_wh = {}
        for wh_id, fut in wh_rev_futs.items():
            wh_res = fut.result() or []
            for g in wh_res:
                if not g.get('product_id'): continue
                pid, rev = g['product_id'][0], g.get('price_subtotal_incl') or 0
                if pid not in revenue_by_wh: revenue_by_wh[pid] = {}
                revenue_by_wh[pid][wh_id] = rev

        sales_map, sales_by_wh = {}, {}
        # Populate initially with rotation (physical moves to customer)
        # This ensures we have sales data even if POS lines are missing or for non-POS backoffice sales
        for pid, qty in rotation_map.items():
            sales_map[pid] = qty
        
        # Consistent mapping [pid][wh_id]
        for pid, wh_dict in rotation_by_wh.items():
            if pid not in sales_by_wh: sales_by_wh[pid] = {}
            for wh_id, qty in wh_dict.items():
                sales_by_wh[pid][wh_id] = qty

        # 3.5 Purchase Orders (Pending RFQs) - Optimized with read_group for totals
        logger.info("Fetching pending purchase orders (Last 30 days)...")
        po_line_domain = [
            ('state', 'in', ['draft', 'sent', 'to approve', 'purchase']),
            ('order_id.create_date', '>=', date_30_ago)
        ]
        po_domain_filter = [
            ('state', 'in', ['draft', 'sent', 'to approve', 'purchase']),
            ('create_date', '>=', date_30_ago)
        ]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            fut_po_global = executor.submit(client.call_kw, "purchase.order.line", "read_group",
                                           [po_line_domain, ['product_id', 'product_qty:sum', 'qty_received:sum'], ['product_id']], {"lazy": False})
            
            # Per-Warehouse PO totals
            wh_po_futs = {}
            for wh_id in wh_map:
                d = po_line_domain + [('order_id.picking_type_id.warehouse_id', '=', wh_id)]
                wh_po_futs[wh_id] = executor.submit(client.call_kw, "purchase.order.line", "read_group",
                                                     [d, ['product_id', 'product_qty:sum', 'qty_received:sum'], ['product_id']], {"lazy": False})

            # Still fetch a subset of individual lines for tooltip display (capped)
            fut_po_lines = executor.submit(client.call_kw, "purchase.order.line", "search_read",
                                         [po_line_domain], 
                                         {"fields": ["product_id", "product_qty", "qty_received", "order_id", "date_planned"], "limit": 15000})

            # Fetch Orders needed for tooltip details
            fut_po_orders = executor.submit(client.call_kw, "purchase.order", "search_read", 
                                          [po_domain_filter], 
                                          {"fields": ["id", "picking_type_id", "name", "partner_id", "state", "date_order", "date_approve", "create_date", "company_id"]})

            po_global_groups = fut_po_global.result() or []
            po_lines = fut_po_lines.result() or []
            orders = fut_po_orders.result() or []
        
        po_details = {o['id']: o for o in orders}
        
        # Aggregate PO Totals from read_groups
        pending_by_product = {}  # {pid: {wh_id: qty}}
        for wh_id, fut in wh_po_futs.items():
            wh_res = fut.result() or []
            for g in wh_res:
                if not g.get('product_id'): continue
                pid = g['product_id'][0]
                qty = (g.get('product_qty') or 0) - (g.get('qty_received') or 0)
                if qty <= 0.05: continue
                if pid not in pending_by_product: pending_by_product[pid] = {}
                pending_by_product[pid][wh_id] = qty

        # Aggregate individual orders for tooltip (using the subset of lines fetched)
        pending_orders_by_product = {}  # {pid: [{order_name, qty, date, supplier}]}
        for l in po_lines:
            if not l.get('product_id'): continue
            pid = l['product_id'][0]
            qty = (l.get('product_qty') or 0) - (l.get('qty_received') or 0)
            if qty <= 0.05: continue
            
            oid = l['order_id'][0]
            if oid not in po_details: continue
            po = po_details[oid]
            
            if pid not in pending_orders_by_product: pending_orders_by_product[pid] = []
            
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
                "company_name": "EXPANDIA" if po.get('company_id') and "Expandia" in str(po['company_id']) else ("ANDYS" if po.get('company_id') and "Andy" in str(po['company_id']) else (str(po.get('company_id', [None, 'N/A'])[1]).split(' ')[0].upper())),
                "date_order": po.get('date_approve') or po.get('create_date') or ''
            })
        
        logger.info(f"Pending POs: Aggregated totals from {len(po_global_groups)} groups and {len(po_lines)} line details.")

        # 4. Product Details Fetch
        active_pids = list(set(list(rotation_map.keys()) + list(revenue_map.keys()) + list(stock_by_wh.keys()) + list(pending_by_product.keys())))
        logger.info(f"Fetching details for {len(active_pids)} unique products...")
        
        detail_products = []
        costs_map = {}
        
        # Use a local client for thread safety in threads/executors
        # Note: xmlrpc.client.ServerProxy is thread-safe for making calls, 
        # but creating a new one ensures clean state.
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            fields = ["id", "display_name", "barcode", "seller_ids", "standard_price", "type", "categ_id", "brand_id", "additional_product_tag_ids", "product_tag_ids"]
            
            # Helper to create client per thread if needed, but ServerProxy is usually fine. 
            # We will just use the global client but catch errors better.
            def fetch_batch(b): 
                try:
                    return client.call_kw("product.product", "read", [b], {"fields": fields})
                except Exception as e:
                    logger.error(f"Batch fetch error: {e}")
                    return []

            batches = [active_pids[i:i+500] for i in range(0, len(active_pids), 500)] # Reduced batch size
            
            for i, res in enumerate(executor.map(fetch_batch, batches)):
                if i % 5 == 0: logger.info(f"Processed batch {i+1}/{len(batches)}")
                for p in (res or []):
                    detail_products.append(p)
                    costs_map[p['id']] = p.get('standard_price') or 0

            # Supplier names
            sel_ids = list(set([sid for p in detail_products for sid in (p.get('seller_ids') or [])]))
            supplier_map = {}
            if sel_ids:
                def fetch_s(b): return client.call_kw("product.supplierinfo", "read", [b], {"fields": ["id", "partner_id"]})
                s_res = []
                for res in executor.map(fetch_s, [sel_ids[i:i+1000] for i in range(0, len(sel_ids), 1000)]): s_res.extend(res or [])
                p_ids = list(set([s['partner_id'][0] for s in s_res if s.get('partner_id')]))
                p_name_m = {}
                def fetch_p(b): return client.call_kw("res.partner", "read", [b], {"fields": ["id", "name"]})
                for res in executor.map(fetch_p, [p_ids[i:i+1000] for i in range(0, len(p_ids), 1000)]):
                    for part in (res or []): p_name_m[part['id']] = part['name']
                for s in s_res: supplier_map[s['id']] = {"name": p_name_m.get(s['partner_id'][0], "N/A"), "partner_id": s['partner_id'][0]}

        # 5. ABC and Assemble
        abc_rot_g = calculate_abc_segments(rotation_map, force_aa_threshold=2000)
        abc_rev_g = calculate_abc_segments(revenue_map)
        abc_data = {}
        # Global best category
        for pid in active_pids:
            cat_rot = abc_rot_g.get(pid, {'cat': 'E'})['cat']
            cat_rev = abc_rev_g.get(pid, {'cat': 'E'})['cat']
            order = {'AA': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5}
            # Prioritize ROTATION (Units) only, per user request.
            # Revenue is ignored for category classification to reflect true movement.
            best_cat_global = cat_rot
            
            abc_data[pid] = {
                "category": best_cat_global,
                "rotation": cat_rot,
                "revenue": cat_rev,
                "by_warehouse": {}
            }
        
        # Branch-specific best category
        all_wh_ids = set()
        for wh_stocks in stock_by_wh.values():
            for wh_id in wh_stocks: all_wh_ids.add(wh_id)
        for wh_dict in rotation_by_wh.values():
            for wh_id in wh_dict: all_wh_ids.add(wh_id)
        for wh_dict in revenue_by_wh.values():
            for wh_id in wh_dict: all_wh_ids.add(wh_id)

        cat_order = {'AA': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5}
        # Pre-calculate products per warehouse to avoid O(N*M) loops
        pids_by_wh = {}
        for pid, whs in stock_by_wh.items():
            for wh_id in whs:
                if wh_id not in pids_by_wh: pids_by_wh[wh_id] = set()
                pids_by_wh[wh_id].add(pid)
        for pid, whv in rotation_by_wh.items():
            for wh_id in whv:
                if wh_id not in pids_by_wh: pids_by_wh[wh_id] = set()
                pids_by_wh[wh_id].add(pid)
        for pid, whv in revenue_by_wh.items():
            for wh_id in whv:
                if wh_id not in pids_by_wh: pids_by_wh[wh_id] = set()
                pids_by_wh[wh_id].add(pid)

        wh_processed = {}
        for wh_id in all_wh_ids:
            # Build dataset for this warehouse
            wh_pids = pids_by_wh.get(wh_id, set())
                
            rot_dat = {p: rotation_by_wh.get(p, {}).get(wh_id, 0) for p in wh_pids}
            rev_dat = {p: revenue_by_wh.get(p, {}).get(wh_id, 0) for p in wh_pids}
            
            s_rot = calculate_abc_segments(rot_dat)
            s_rev = calculate_abc_segments(rev_dat)
            
            c_aa, c_a = 0, 0
            for pid in wh_pids:
                if pid not in abc_data: continue
                # Use ONLY rotation (units) for branch ABC
                cr = s_rot.get(pid, {'cat': 'E'})['cat']
                cv = s_rev.get(pid, {'cat': 'E'})['cat']
                
                # Manual E override: If no sales (cr='E') but has stock, it's definitely E
                # (Logic already handles cr='E' from s_rot if val=0, but being explicit helps clarity)
                
                if cr == 'AA': c_aa += 1
                elif cr == 'A': c_a += 1
                
                abc_data[pid]["by_warehouse"][str(wh_id)] = {
                    "category": cr,
                    "rotation": cr,
                    "revenue": cv,
                    "val_rot": round(rot_dat.get(pid, 0), 2), 
                    "val_rev": round(rev_dat.get(pid, 0), 2)
                }
            logger.info(f"ABC Wh {wh_id}: Pids={len(wh_pids)}, AA={c_aa}, A={c_a}")
            wh_processed[wh_id] = {"AA": c_aa, "A": c_a}
        
        # Log global distribution summary
        total_aa = sum(v["AA"] for v in wh_processed.values())
        logger.info(f"ABC COMPLETE: Processed {len(all_wh_ids)} whs. Total AA in branches: {total_aa}")

        provider_origins = load_provider_origins()
        final_products = []
        for p in detail_products:
            pid = p['id']
            sales_val = sales_map.get(pid, 0)
            rot_val = rotation_map.get(pid, 0)
            pending_val = float(sum(pending_by_product.get(pid, {}).values()))
            
            # Show if it has sales OR rotation OR pending orders
            if sales_val <= 0.001 and rot_val <= 0.001 and pending_val <= 0.001: continue
            
            clean_name = re.sub(r'\[.*?\]', '', p.get('display_name') or "").strip()
            provider, provider_id = "N/A", None
            if p.get('seller_ids'):
                best, fallback = None, None
                for sid in p['seller_ids']:
                    if sid in supplier_map:
                        s = supplier_map[sid]
                        sn = s['name'].upper()
                        if "ANDY" in sn and ("STORE" in sn or "TIENDA" in sn or "SRL" in sn):
                            if not fallback: fallback = s
                        else: best = s; break
                sel = best if best else fallback
                if sel: provider, provider_id = sel['name'], sel['partner_id']

            origin = provider_origins.get(provider.strip().upper(), "N/A")
            abc_item = abc_data.get(pid, {})
            total_stock = float(sum(stock_by_wh.get(pid, {}).values()))
            
            final_products.append({
                "id": pid, "barcode": p.get('barcode') or "", "name": clean_name, "provider": provider, "origen": origin,
                "total_stock": total_stock, "stock_by_wh": {str(k): float(v) for k, v in stock_by_wh.get(pid, {}).items()},
                "sales_30d": float(sales_val), "sales_30d_global": float(rotation_map.get(pid, 0)),
                "sales_by_wh": {str(wh): float(q) for wh, q in sales_by_wh.get(pid, {}).items() if q > 0.05},
                "total_pending": float(sum(pending_by_product.get(pid, {}).values())),
                "pending_by_wh": {str(wh): float(q) for wh, q in pending_by_product.get(pid, {}).items()},
                "pending_orders": pending_orders_by_product.get(pid, []),
                "abc_category": abc_item.get('category', 'E'), "abc_details": f"{abc_item.get('rotation', 'E')}/{abc_item.get('revenue', 'E')}",
                "abc_by_wh": abc_item.get("by_warehouse", {}), "type_name": p.get('type') or "consu",
                "category_name": p['categ_id'][1] if isinstance(p.get('categ_id'), (list, tuple)) else "N/A",
                "brand_name": p['brand_id'][1] if isinstance(p.get('brand_id'), (list, tuple)) else "N/A",
                "tags": [tag_map.get(tid) for tid in (list(set((p.get('additional_product_tag_ids') or []) + (p.get('product_tag_ids') or [])))) if tag_map.get(tid)]
            })
            # If no tags, we could add 'Ninguno' here, but usually 'All' covers it. 
            # However, Odoo shows 'Ninguno', so let's add it if empty for better UX.
            if not final_products[-1]["tags"]:
                final_products[-1]["tags"] = ["Ninguno"]

        summary = {"rotation": {}, "revenue": {}}
        for i in abc_rot_g.values(): summary["rotation"][i['cat']] = summary["rotation"].get(i['cat'], 0) + 1
        for i in abc_rev_g.values(): summary["revenue"][i['cat']] = summary["revenue"].get(i['cat'], 0) + 1

        cache_data = {
            "last_update": datetime.now().isoformat(), "products": final_products, "warehouses": warehouses,
            "abc_summary": summary, 
            "global_stats": {
                "pending": len([p for p in final_products if p['total_pending'] > 0]),
                "out_of_stock": len([p for p in final_products if p['total_stock'] <= 0])
            },
            "next_sync": _next_sync_time
        }
        with open(CACHE_FILE, "w") as f: json.dump(cache_data, f)
        try:
            with gzip.open(CACHE_FILE + ".gz", "wb") as f: f.write(json.dumps(cache_data).encode('utf-8'))
        except: pass
        logger.info(f"Cache saved: {len(final_products)} products.")
        return cache_data
    except Exception as e:
        logger.error(f"Error Turbo Sync: {e}", exc_info=True)
        return None
    finally:
        _is_syncing = False

async def auto_sync_task():
    """Bucle interno para sincronizar. Espera 30 minutos DESPUÉS de terminar cada sincronización."""
    global _next_sync_time
    logger.info("Iniciando tarea de sincronización automática (GAP de 30 min)")
    
    while True:
        try:
            # 1. Iniciar Sincronización
            logger.info("Iniciando ciclo de sincronización...")
            _next_sync_time = None # Limpiar para indicar que está sucediendo ahora
            
            # Ejecutar en thread aparte para no bloquear el loop de FastAPI
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, fetch_active_products_data)
            
            # 2. Calcular Próxima Sincronización (30 min desde AHORA, que ya terminó la anterior)
            interval_min = 30
            next_time = datetime.now() + timedelta(minutes=interval_min)
            _next_sync_time = next_time.isoformat()
            
            # 3. Actualizar el archivo de caché en disco para que la API sirva el nuevo cronograma inmediatamente
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, "r") as f:
                        data = json.load(f)
                    data["next_sync"] = _next_sync_time
                    with open(CACHE_FILE, "w") as f:
                        json.dump(data, f)
                    with gzip.open(CACHE_FILE + ".gz", "wb") as f:
                        f.write(json.dumps(data).encode('utf-8'))
                except Exception as ce:
                    logger.error(f"Error actualizando next_sync en caché: {ce}")

            logger.info(f"Sincronización completada. Próxima programada para: {_next_sync_time}")
            
            # 4. Esperar los 30 minutos de GAP
            await asyncio.sleep(interval_min * 60) 
            
        except Exception as e:
            logger.error(f"Error en tarea automática: {e}")
            await asyncio.sleep(60) # Reintentar en 1 min si falla el bucle

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_sync_task())

@app.get("/api/products")
async def get_products(request: Request, sync: bool = Query(False), background_tasks: BackgroundTasks = None):
    global _data_cache, _is_syncing
    
    if sync:
        if _is_syncing:
            # If already syncing, return lightweight status immediately without loading 18MB file
            return Response(content=json.dumps({
                "status": "syncing",
                "is_syncing": True,
                "message": "Sincronización en curso..."
            }), media_type="application/json")
        else:
            # Start sync in background
            background_tasks.add_task(fetch_active_products_data)
            return Response(content=json.dumps({
                "status": "syncing", 
                "is_syncing": True,
                "message": "Iniciando sincronización..."
            }), media_type="application/json")


    # 1. Pre-Compressed GZip Delivery (FASTEST)
    # Be case-insensitive for header check
    accept_encoding = request.headers.get("accept-encoding", "") or request.headers.get("Accept-Encoding", "")
    accept_encoding = accept_encoding.lower()
    
    # Prepare dynamic headers
    headers = {
        "Content-Type": "application/json",
        "X-Next-Sync": _next_sync_time or "",
        "X-Is-Syncing": "true" if _is_syncing else "false",
        "X-Last-Update": str(os.path.getmtime(CACHE_FILE)) if os.path.exists(CACHE_FILE) else ""
    }

    if "gzip" in accept_encoding and os.path.exists(CACHE_FILE + ".gz"):
        try:
            with open(CACHE_FILE + ".gz", "rb") as f:
                content = f.read()
                headers["Content-Encoding"] = "gzip"
                headers["Content-Length"] = str(len(content))
                return Response(
                    content=content,
                    media_type="application/json",
                    headers=headers
                )
        except Exception as e:
            logger.error(f"Error serving pre-compressed cache: {e}")

    # 2. Raw JSON Delivery
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "rb") as f:
                content = f.read()
                return Response(
                    content=content, 
                    media_type="application/json",
                    headers=headers
                )
        except Exception as e:
            logger.error(f"Error reading cache: {e}")

    # 3. Fallback to Sync
    data = fetch_active_products_data()
    if data:
        return Response(content=json.dumps(data), media_type="application/json")
    return {"products": [], "warehouses": []}

@app.get("/api/movements/{product_id}")
async def get_movements(product_id: int, warehouse_id: int = None):
    logger.info(f"Fetching movements for product_id: {product_id}, warehouse_id: {warehouse_id}")
    client = OdooClient()
    if not client.authenticate(): 
        logger.error("Failed to authenticate for movements")
        return []
    
    domain = [('product_id', '=', product_id), ('state', '=', 'done')]
    
    if warehouse_id:
        # Get locations for this warehouse
        try:
            # We already have warehouse info from sync, but for this direct call let's fetch code
            wh = client.call_kw("stock.warehouse", "search_read", [[('id', '=', warehouse_id)]], {"fields": ["code"]})
            if wh:
                code = wh[0]['code']
                # Filter moves where either origin or destination starts with WH code
                domain.append('|')
                domain.append(('location_id.complete_name', 'ilike', f"{code}/"))
                domain.append(('location_dest_id.complete_name', 'ilike', f"{code}/"))
        except: pass

    try:
        # Use stock.move which is generally more reliable for historical overview
        moves = client.call_kw("stock.move", "search_read", 
                              [domain], 
                              {
                                  "fields": ["date", "reference", "product_uom_qty", "location_id", "location_dest_id"], 
                                  "limit": 100, 
                                  "order": "date desc"
                              })
        
        logger.info(f"Found {len(moves) if moves else 0} moves")
        
        if not moves:
            # Fallback to stock.move.line just in case
            moves = client.call_kw("stock.move.line", "search_read", 
                                  [domain], 
                                  {"fields": ["date", "reference", "qty_done", "location_id", "location_dest_id"], "limit": 100, "order": "date desc"})
            if moves:
                for m in moves:
                    m['product_uom_qty'] = m.pop('qty_done', 0)

        return [
            {
                "date": str(m['date']),
                "ref": m['reference'] or "Sin Ref",
                "qty": float(m.get('product_uom_qty') or m.get('qty_done') or 0),
                "from": m['location_id'][1] if isinstance(m['location_id'], (list, tuple)) else "N/A",
                "to": m['location_dest_id'][1] if isinstance(m['location_dest_id'], (list, tuple)) else "N/A"
            } for m in (moves or [])
        ]
    except Exception as e:
        logger.error(f"Error in get_movements: {e}")
        return []

@app.post("/api/analyze_product")
async def analyze_product(request: Request):
    try:
        data = await request.json()
        product = data.get("product")
        warehouse_name = data.get("warehouse_name", "Vista Global")
        warehouse_id = data.get("warehouse_id")
        
        if not product:
            return {"analysis": "No se proporcionó información del producto."}

        # Extract relevant fields for the prompt
        name = product.get("name", "N/A")
        stock = product.get("currentStock", 0)
        sales = product.get("currentSales", 0)
        coverage = product.get("coverage", 0)
        abc_global = product.get("abc_category", "E")
        
        # Branch specific ABC if available
        abc_branch = "N/A"
        if product.get("abc_by_wh") and warehouse_id:
            wh_id_str = str(warehouse_id)
            abc_branch = product["abc_by_wh"].get(wh_id_str, {}).get("category", "E")

        pending = product.get("currentPending", 0)
        pending_orders = product.get("pending_orders", [])
        pending_details = ""
        if pending_orders:
            details = []
            for o in pending_orders:
                qty = o.get('qty', 0)
                arrival = o.get('date_planned', 'Desconocida')
                details.append(f"- {qty} unidades llegando el {arrival}")
            pending_details = "\n".join(details)
        
        prompt = f"""
        Analiza este producto en el sistema de gestión de stock:
        Nombre: {name}
        Sucursal actual: {warehouse_name}
        Stock actual: {stock}
        Ventas (últimos 30 días): {sales}
        Cobertura: {coverage} días
        Categoría ABC Global: {abc_global}
        Categoría ABC en esta Sucursal: {abc_branch}
        Total pedidos pendientes (en tránsito): {pending}
        Detalles de pedidos:
        {pending_details if pending_details else "No hay pedidos pendientes."}

        Instrucciones: Proporciona una conclusión estratégica muy breve (máximo 3 frases) en tono profesional pero directo.
        Considera que si hay pedidos por llegar pronto, quizás no sea necesario pedir más aunque el stock sea bajo.
        Enfócate en la relación entre el stock, la venta y si debe pedir más o transferir.
        """

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Eres un experto en logística y gestión de inventarios para una cadena de retail. Responde siempre en español."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        analysis = response.choices[0].message.content.strip()
        return {"analysis": analysis}
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return {"analysis": "Error al generar el análisis. Inténtelo más tarde."}

@app.post("/api/analyze_transfers")
async def analyze_transfers(request: Request):
    """
    🧠 NUEVA LÓGICA DE IA MEJORADA
    Primero decide SI vale la pena hacer el traspaso (no cuánto)
    Basado en criterios comerciales claros y scoring inteligente
    """
    try:
        data = await request.json()
        products_list = data.get("products", [])
        source_wh_name = data.get("source_warehouse_name", "Origen")
        target_wh_name = data.get("target_warehouse_name", "Destino")
        source_wh_id = str(data.get("source_warehouse_id"))
        target_wh_id = str(data.get("target_warehouse_id"))

        if not products_list:
            return {"analysis": "No hay productos para analizar.", "suggestions": []}

        # 🎯 CONFIGURACIÓN DE COBERTURAS OBJETIVO POR ABC
        # 🎯 CONFIGURACIÓN DE COBERTURAS OBJETIVO Y RESERVAS
        COBERTURA_OBJETIVO = {
            'AA': 15, 'A': 15, 'B': 15, 'C': 15, 'D': 15, 'E': 15
        }
        
        PROTECCION_ORIGEN = {
            'AA': 7, 'A': 7, 'B': 7, 'C': 7, 'D': 7, 'E': 7
        }

        # 📦 UMBRALES DE MICRO-TRASPASO POR ABC DESTINO
        UMBRAL_MICRO = {
            'AA': 3, 'A': 3, 'B': 6, 'C': 6, 'D': 6, 'E': 6
        }

        suggestions = []
        opportunities = []  # Para micro-traspasos (Vale la pena pero no solo)
        rejected_products = []
        
        for product in products_list:
            pid = product.get('id')
            name = product.get('name', 'N/A')
            
            # 📦 0. DATOS BÁSICOS
            stock_origen = float(product.get('stock_by_wh', {}).get(source_wh_id, 0))
            stock_destino = float(product.get('stock_by_wh', {}).get(target_wh_id, 0))
            ventas_30d_destino = float(product.get('sales_by_wh', {}).get(target_wh_id, 0))
            ventas_30d_origen = float(product.get('sales_by_wh', {}).get(source_wh_id, 0))
            pendiente_destino = float(product.get('pending_by_wh', {}).get(target_wh_id, 0))
            
            # 1) ABC EFECTIVO POR ALMACÉN
            abc_eff_destino = product.get('abc_by_wh', {}).get(target_wh_id, {}).get('category')
            if not abc_eff_destino:
                abc_eff_destino = product.get('abc_category', 'E')
                
            abc_eff_origen = product.get('abc_by_wh', {}).get(source_wh_id, {}).get('category')
            if not abc_eff_origen:
                abc_eff_origen = product.get('abc_category', 'E')

            # 2) FILTROS DUROS (Paso 2)
            # 2.1 Producto muerto
            if ventas_30d_destino == 0:
                rejected_products.append({"name": name, "reason": "Producto muerto (sin ventas)"})
                continue
            
            # 2.2 Origen sin stock real
            if stock_origen <= 0:
                rejected_products.append({"name": name, "reason": "Origen sin stock"})
                continue

            vd_destino = ventas_30d_destino / 30.0
            if vd_destino <= 0:
                rejected_products.append({"name": name, "reason": "Venta diaria es 0"})
                continue

            # 3) NECESIDAD EN DESTINO (Paso 3 - Con Redondeo Ceil)
            cob_obj = COBERTURA_OBJETIVO.get(abc_eff_destino, 15)

            # 🚛 REGLA ESPECIAL: Leches (Volumen alto) -> Máximo 3 días
            # Buscamos "LECHE" en nombre o categoría, excluyendo polvo. Aplica a AA y A.
            p_name_upper = name.upper()
            cat_name_upper = (product.get('category_name') or "").upper()
            
            is_leche = "LECHE" in p_name_upper or "LECHE" in cat_name_upper
            is_polvo = "POLVO" in p_name_upper or "POLVO" in cat_name_upper
            is_high_rot = abc_eff_destino in ['AA', 'A']

            if is_leche and not is_polvo and is_high_rot:
                cob_obj = 3

            cobertura_actual = stock_destino / vd_destino if vd_destino > 0 else 0
            
            necesidad_raw = (vd_destino * cob_obj) - stock_destino - pendiente_destino
            necesidad = max(0, necesidad_raw)
            necesidad_u = math.ceil(necesidad)  # Redondeo preventivo
            
            if necesidad_u <= 0:
                rejected_products.append({"name": name, "reason": "Vistas cubiertas (sin necesidad neta)"})
                continue

            # 4) PROTECCIÓN DEL ORIGEN (Paso 4)
            vd_origen = ventas_30d_origen / 30.0
            es_almacen_distribucion = any(x in source_wh_name.upper() for x in ['ALMACEN', 'CENTRAL', 'PISO 3', 'DISTRIBUCION'])
            
            sales_by_wh = product.get('sales_by_wh', {})
            ventas_otras_sucursales_sin_destino = 0
            ventas_totales_empresa = 0
            sucursales_con_venta = 0
            for wh_id, v in sales_by_wh.items():
                v_num = float(v or 0)
                if v_num > 0.001: sucursales_con_venta += 1
                ventas_totales_empresa += v_num
                if wh_id != source_wh_id and wh_id != target_wh_id:
                    ventas_otras_sucursales_sin_destino += v_num

            # 🛡️ PROTECCIÓN: Solo protegemos para el Origen y OTRAS sucursales (no para la que pide)
            vd_proteger = vd_origen + (ventas_otras_sucursales_sin_destino / 30.0 if es_almacen_distribucion else 0)
            vd_proteger = max(vd_proteger, 0.01)
            
            dias_prot = PROTECCION_ORIGEN.get(abc_eff_origen, 7)
            stock_min_cuidar = vd_proteger * dias_prot
            
            disponible_origen = max(0.0, stock_origen - stock_min_cuidar)
            
            if disponible_origen <= 0:
                rejected_products.append({
                    "name": name, 
                    "reason": f"Protección de origen ({math.ceil(stock_min_cuidar)} un. reservadas)"
                })
                continue

            # 5) MICRO-TRASPASO (Paso 5 - Clasificación)
            umbral_micro = UMBRAL_MICRO.get(abc_eff_destino, 6)
            is_low_priority = necesidad_u < umbral_micro

            # 6) CANTIDAD FINAL (Paso 6)
            cantidad_final = min(necesidad_u, math.floor(disponible_origen))
            if cantidad_final <= 0:
                rejected_products.append({"name": name, "reason": "Sin cantidad posible tras protección"})
                continue

            # 🧠 7) SCORING (Paso 7)
            score_details = []
            
            # 7.1 Participación de Mercado (Nuevo: 0-20 pts)
            # Premia si el destino es el punto de venta principal de este producto
            market_share = ventas_30d_destino / ventas_totales_empresa if ventas_totales_empresa > 0 else 0
            share_pts = market_share * 20.0
            score_details.append(f"Participación: {share_pts:.1f}/20")

            # 7.2 Urgencia con Clamp (0-40 pts)
            ratio = cobertura_actual / cob_obj if cob_obj > 0 else 1
            ratio_clamp = min(max(ratio, 0.0), 1.0)
            urgencia_pts = (1.0 - ratio_clamp) * 40.0
            score_details.append(f"Urgencia: {urgencia_pts:.1f}/40")
            
            # 7.3 ABC pts (0-30 pts)
            abc_pts_map = {'AA': 30, 'A': 25, 'B': 18, 'C': 10, 'D': 0, 'E': 0}
            abc_pts = abc_pts_map.get(abc_eff_destino, 0)
            score_details.append(f"ABC: {abc_pts}/30")
            
            # 7.4 Ventas pts (0-20 pts)
            if ventas_30d_destino >= 30: venta_pts = 20
            elif ventas_30d_destino >= 15: venta_pts = 12
            elif ventas_30d_destino >= 5: venta_pts = 6
            else: venta_pts = 0
            score_details.append(f"Ventas: {venta_pts}/20")
            
            # 7.5 Pendientes pts (0-10 pts)
            if pendiente_destino >= necesidad_u: pendiente_pts = 0
            elif pendiente_destino > 0: pendiente_pts = 5
            else: pendiente_pts = 10
            score_details.append(f"Pendientes: {pendiente_pts}/10")
            
            # 7.6 Bonus Multi-venta (Capped at 5)
            bonus_mv = 0.5 * max(0, sucursales_con_venta - 1)
            bonus_mv = min(bonus_mv, 5.0)
            if bonus_mv > 0: score_details.append(f"Bonus MV: +{bonus_mv:.1f}")
            
            total_score = urgencia_pts + abc_pts + venta_pts + pendiente_pts + bonus_mv
            
            # 🎯 CLASIFICACIÓN FINAL
            item_data = {
                "id": pid,
                "name": name,
                "qty": cantidad_final,
                "score": round(total_score, 1),
                "details": {
                    "abc_destino": abc_eff_destino,
                    "score_breakdown": " | ".join(score_details)
                }
            }

            if is_low_priority:
                # 🟡 VALE LA PENA PERO NO SOLO (Micro-traspaso)
                item_data["reason"] = f"Micro-traspaso: {necesidad_u} < {umbral_micro} (ABC destino={abc_eff_destino})"
                item_data["priority"] = "low"
                opportunities.append(item_data)
            else:
                # 🎯 Evaluación normal por score
                if total_score < 40:
                    rejected_products.append({"name": name, "reason": f"Score bajo ({total_score:.1f}/100)", "score": round(total_score, 1)})
                elif total_score < 60 and disponible_origen < necesidad_u * 1.5:
                    rejected_products.append({"name": name, "reason": f"Score medio ({total_score:.1f}/100) y origen ajustado", "score": round(total_score, 1)})
                else:
                    item_data["reason"] = f"Score: {total_score:.0f}/100 - {abc_eff_destino}"
                    item_data["priority"] = "high"
                    suggestions.append(item_data)

        # Dashboard de salida
        suggestions.sort(key=lambda x: x['score'], reverse=True)
        opportunities.sort(key=lambda x: x['score'], reverse=True)
        
        analysis_lines = [
            f"🧠 ANÁLISIS ESTRATÉGICO DE TRASPASOS v2.0",
            f"",
            f"✅ PRIORITARIOS: {len(suggestions)}",
            f"🟡 OPORTUNIDADES (Micro): {len(opportunities)}",
            f"❌ RECHAZADOS: {len(rejected_products)}",
            f"",
        ]
        
        if suggestions:
            analysis_lines.append(f"🎯 SUGERENCIAS PRINCIPALES:")
            for sug in suggestions[:5]:
                analysis_lines.append(f"• {sug['name'][:40]}: {sug['qty']} un. (Score: {sug['score']})")
            if len(suggestions) > 5: analysis_lines.append(f"... y {len(suggestions)-5} más.")
            analysis_lines.append("")

        if opportunities:
            analysis_lines.append(f"🟡 OPORTUNIDADES (Llenar camión):")
            for opp in opportunities[:3]:
                analysis_lines.append(f"• {opp['name'][:40]}: {opp['qty']} un. ({opp['reason']})")
            if len(opportunities) > 3: analysis_lines.append(f"... y {len(opportunities)-3} más.")
            analysis_lines.append("")
        
        if rejected_products:
            analysis_lines.append(f"❌ EJEMPLOS DE RECHAZADOS:")
            for rej in rejected_products[:3]:
                analysis_lines.append(f"• {rej['name'][:40]}: {rej['reason']}")
        
        return {
            "analysis": "\n".join(analysis_lines),
            "suggestions": suggestions,
            "opportunities": opportunities,
            "stats": {
                "total_aprobados": len(suggestions),
                "total_oportunidades": len(opportunities),
                "total_rechazados": len(rejected_products)
            }
        }

    except Exception as e:
        logger.error(f"Error in analyze_transfers: {e}", exc_info=True)
        return {"analysis": f"Error: {str(e)}", "suggestions": [], "opportunities": []}

@app.post("/api/analyze_all_transfers")
async def analyze_all_transfers(request: Request):
    """
    🧠 ANÁLISIS GLOBAL IA V2.2
    Soporta modo ML híbrido.
    """
    try:
        import importlib
        import global_analysis_v2
        importlib.reload(global_analysis_v2)
        from global_analysis_v2 import analyze_global_to_my_warehouse
        
        data = await request.json()
        products_list = data.get("products", [])
        warehouses = data.get("warehouses", [])
        dest_warehouse_id = data.get("destination_warehouse_id")
        use_ml = data.get("use_ml", False)
        
        if not products_list or not warehouses:
            return {"analysis": "No hay datos suficientes.", "products": []}
        
        if not dest_warehouse_id:
            dest_warehouse_id = next((w['id'] for w in warehouses if w.get('id') is not None), None)

        ml_preds = {}
        if use_ml:
            # En producción esto llamaría a un servicio de inferencia
            # Aquí usamos nuestra función local
            for p in products_list:
                ml_preds[str(p['id'])] = mock_ml_prediction(p, dest_warehouse_id)
        
        result = analyze_global_to_my_warehouse(products_list, warehouses, dest_warehouse_id, ml_predictions=ml_preds)
        return result

    except Exception as e:
        logger.error(f"Error in analyze_all_transfers V2.2: {e}", exc_info=True)
        return {"analysis": f"Error: {str(e)}", "products": []}



# --- Machine Learning Predict Interface ---
def mock_ml_prediction(p, wh_id):
    """
    Simula lo que un modelo real (LightGBM/CatBoost) devolvería.
    En una fase real, esto cargaría .pkl y usaría features del snapshot.
    """
    pid = str(p.get('id'))
    wh_id_str = str(wh_id)
    
    # 1. V ML: Demanda futura estimada (v_ml)
    # Basada en historial + ruido para simular predicción
    v_hist = float(p.get('sales_by_wh', {}).get(wh_id_str, 0)) / 30.0
    # Simula tendencia: si tiene ventas crecientes o muchas solicitudes (placeholder logic)
    tendencia = 1.1 if p.get('abc_category') in ['AA', 'A'] else 0.95
    v_ml = v_hist * tendencia + (0.05 if v_hist < 0.1 else 0)
    
    # 2. Lead Time (días)
    # Simula según si es central o sucursal lejana
    is_central = "CENTRAL" in p.get('name', '').upper() # logic placeholder
    lead_time = 3.5 if is_central else 7.2
    
    # 3. Risk (Riesgo de quiebre 0..1)
    stock = float(p.get('stock_by_wh', {}).get(wh_id_str, 0))
    risk = 0.0
    if v_ml > 0:
        cov = stock / v_ml
        if cov < 3: risk = 0.85
        elif cov < 7: risk = 0.45
        else: risk = 0.1
    
    # 4. Top Factors
    factors = []
    if v_ml > v_hist: factors.append("Alta demanda proyectada (7d)")
    if risk > 0.5: factors.append("Riesgo inminente de quiebre")
    if p.get('abc_category') == 'AA': factors.append("Prioridad estratégica AA")
    
    return {
        "id": pid,
        "v_ml": round(v_ml, 3),
        "v_hist": round(v_hist, 3),
        "lead_time": round(lead_time, 1),
        "risk": round(risk, 2),
        "top_factors": factors[:3]
    }

@app.post("/api/ml/predict")
async def ml_predict(request: Request):
    """
    Endpoint para predecir demanda, lead time y riesgo.
    Input: { products: [], destination_warehouse_id: int }
    """
    try:
        data = await request.json()
        products = data.get("products", [])
        dest_id = data.get("destination_warehouse_id")
        
        if not products or not dest_id:
            return {"predictions": {}}
            
        predictions = {}
        for p in products:
            pred = mock_ml_prediction(p, dest_id)
            predictions[str(p['id'])] = pred
            
        return {"predictions": predictions}
    except Exception as e:
        logger.error(f"Error en /api/ml/predict: {e}")
        return {"predictions": {}}

# --- New authentication endpoints ---
@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    
    profiles = load_user_data()
    if username in profiles and profiles[username]["password"] == password:
        profile = profiles[username]
        return {
            "status": "success", 
            "token": f"{username}_{SECRET_TOKEN}", 
            "user": username,
            "avatar": profile.get("avatar")
        }
    
    return Response(content=json.dumps({"status": "error", "message": "Credenciales inválidas"}), status_code=401, media_type="application/json")

@app.post("/api/verify_token")
async def verify_token(request: Request):
    data = await request.json()
    token = data.get("token")
    
    if not token:
        return Response(content=json.dumps({"status": "error"}), status_code=401, media_type="application/json")
        
    if "_" in token:
        username = token.split("_")[0]
        expected_token = f"{username}_{SECRET_TOKEN}"
        if token == expected_token:
            profiles = load_user_data()
            profile = profiles.get(username, {})
            return {
                "status": "success", 
                "user": username,
                "avatar": profile.get("avatar")
            }
        
    return Response(content=json.dumps({"status": "error"}), status_code=401, media_type="application/json")

@app.post("/api/profile/update")
async def update_profile(request: Request):
    data = await request.json()
    token = data.get("token")
    
    # Simple token verification
    if not token or "_" not in token:
        return Response(status_code=401)
        
    username = token.split("_")[0]
    if token != f"{username}_{SECRET_TOKEN}":
        return Response(status_code=401)
        
    profiles = load_user_data()
    if username not in profiles:
        return Response(status_code=404)
        
    # Update fields
    updated_any = False
    new_user_id = username
    
    # 1. Username Change
    if "new_username" in data and data["new_username"] and data["new_username"] != username:
        new_name = data["new_username"]
        if new_name in profiles:
            return {"status": "error", "message": "Ese nombre de usuario ya está en uso"}
        
        # Move data
        profiles[new_name] = profiles.pop(username)
        profiles[new_name]["username"] = new_name
        new_user_id = new_name
        updated_any = True

    # 2. Password Change (Note: use new_user_id as index)
    if "new_password" in data and data["new_password"]:
        # Verify old password
        current_pw = data.get("current_password")
        if current_pw and profiles[new_user_id]["password"] == current_pw:
            profiles[new_user_id]["password"] = data["new_password"]
            updated_any = True
        else:
            return {"status": "error", "message": "Contraseña actual incorrecta"}
            
    # 3. Avatar Change
    if "avatar" in data:
        profiles[new_user_id]["avatar"] = data["avatar"]
        updated_any = True
        
    if updated_any:
        save_user_data(profiles)
        
    # Return new user and token if username changed
    return {
        "status": "success", 
        "user": new_user_id,
        "token": f"{new_user_id}_{SECRET_TOKEN}" if new_user_id != username else None,
        "avatar": profiles[new_user_id].get("avatar")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5176)
