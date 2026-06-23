from fastapi import FastAPI, Query, BackgroundTasks, Response, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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
import gc

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


# Simple Auth Security (For production use environment variables and a real DB)
SECRET_TOKEN = os.environ.get("SECRET_TOKEN", "change-this-secret-token")
DEFAULT_WAREHOUSE_ACCESS = "ALL"
RESTRICTED_ANDYS_ONLY_USERS = {"Dayana", "DiegoH", "DiegoU", "Pablo", "Edwin"}

# VALID_USERS: Load from environment or use defaults for development
# Format in .env: VALID_USERS=admin:change_me_1,user2:change_me_2
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
_sync_start_time = None # Timestamp cuando empezó el sync
_next_sync_time = None # ISO format string
SYNC_TIMEOUT_SEC = 300  # 5 minutos - watchdog reset threshold

def set_sync_state(is_syncing: bool, reason: str = ""):
    global _is_syncing, _sync_start_time

    _is_syncing = is_syncing
    _sync_start_time = time.time() if is_syncing else None

    if reason:
        logger.info(
            "Estado de sincronización actualizado: %s (%s)",
            "en curso" if is_syncing else "inactivo",
            reason,
        )

def get_cache_last_update_iso():
    if not os.path.exists(CACHE_FILE):
        return None

    try:
        return datetime.fromtimestamp(os.path.getmtime(CACHE_FILE)).isoformat()
    except Exception:
        return None

def load_user_data():
    if os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, "r") as f:
            return json.load(f)
    return {}

def save_user_data(data):
    with open(USER_DATA_FILE, "w") as f:
        json.dump(data, f)


def get_default_warehouse_access_for_user(username: str) -> str:
    return "ANDYS_ONLY" if username in RESTRICTED_ANDYS_ONLY_USERS else DEFAULT_WAREHOUSE_ACCESS


def ensure_profile_defaults(username: str, profile: dict | None = None) -> dict:
    profile_data = dict(profile or {})
    profile_data.setdefault("username", username)
    profile_data.setdefault("avatar", None)
    profile_data.setdefault("warehouse_access", get_default_warehouse_access_for_user(username))
    return profile_data


def get_profile_warehouse_access(username: str, profile: dict | None = None) -> str:
    return ensure_profile_defaults(username, profile).get("warehouse_access", DEFAULT_WAREHOUSE_ACCESS)


def get_authenticated_profile_from_token(token: str):
    if not token or "_" not in token:
        return None, None

    username = token.split("_")[0]
    if token != f"{username}_{SECRET_TOKEN}":
        return None, None

    profiles = load_user_data()
    profile = profiles.get(username)
    if profile is None:
        return None, None

    return username, ensure_profile_defaults(username, profile)


def get_request_profile(request: Request):
    token = request.headers.get("X-Token") or request.query_params.get("token", "")
    return get_authenticated_profile_from_token(token)


def warehouse_name_upper(warehouse: dict) -> str:
    return str(warehouse.get("name") or "").upper()


def matches_warehouse_access(warehouse: dict, warehouse_access: str) -> bool:
    if warehouse_access != "ANDYS_ONLY":
        return True

    name = warehouse_name_upper(warehouse)
    return (
        "ANDY" in name
        or "YAM YAM" in name
        or name == "ALMACEN CENTRAL"
        or "ALMACEN PISO 3" in name
    )


def _filter_numeric_dict_by_allowed_ids(values: dict | None, allowed_ids: set[str]) -> dict:
    if not values:
        return {}
    return {
        str(key): value
        for key, value in values.items()
        if str(key) in allowed_ids
    }


def filter_cache_payload_for_access(payload: dict, warehouse_access: str) -> dict:
    if warehouse_access != "ANDYS_ONLY":
        return payload

    warehouses = payload.get("warehouses") or []
    allowed_warehouses = [wh for wh in warehouses if matches_warehouse_access(wh, warehouse_access)]
    allowed_ids = {str(wh.get("id")) for wh in allowed_warehouses if wh.get("id") is not None}
    allowed_names = [warehouse_name_upper(wh) for wh in allowed_warehouses if wh.get("name")]

    filtered_products = []
    for product in payload.get("products") or []:
        stock_by_wh = _filter_numeric_dict_by_allowed_ids(product.get("stock_by_wh"), allowed_ids)
        sales_by_wh = _filter_numeric_dict_by_allowed_ids(product.get("sales_by_wh"), allowed_ids)
        sales_by_wh_90d = _filter_numeric_dict_by_allowed_ids(product.get("sales_by_wh_90d"), allowed_ids)
        sales_by_wh_180d = _filter_numeric_dict_by_allowed_ids(product.get("sales_by_wh_180d"), allowed_ids)
        pending_by_wh = _filter_numeric_dict_by_allowed_ids(product.get("pending_by_wh"), allowed_ids)
        sale_price_by_wh = _filter_numeric_dict_by_allowed_ids(product.get("sale_price_by_wh"), allowed_ids)
        abc_by_wh = _filter_numeric_dict_by_allowed_ids(product.get("abc_by_wh"), allowed_ids)
        orderpoints_by_wh = _filter_numeric_dict_by_allowed_ids(product.get("orderpoints_by_wh"), allowed_ids)
        pending_orders = [
            order for order in (product.get("pending_orders") or [])
            if str(order.get("warehouse_id")) in allowed_ids
        ]

        filtered_products.append({
            **product,
            "total_stock": sum(float(value or 0) for value in stock_by_wh.values()),
            "stock_by_wh": stock_by_wh,
            "sales_30d": sum(float(value or 0) for value in sales_by_wh.values()),
            "sales_30d_global": sum(float(value or 0) for value in sales_by_wh.values()),
            "sales_by_wh": sales_by_wh,
            "sales_90d": sum(float(value or 0) for value in sales_by_wh_90d.values()),
            "sales_by_wh_90d": sales_by_wh_90d,
            "sales_180d": sum(float(value or 0) for value in sales_by_wh_180d.values()),
            "sales_by_wh_180d": sales_by_wh_180d,
            "total_pending": sum(float(value or 0) for value in pending_by_wh.values()),
            "pending_by_wh": pending_by_wh,
            "pending_orders": pending_orders,
            "orderpoints_by_wh": orderpoints_by_wh,
            "abc_by_wh": abc_by_wh,
            "sale_price_by_wh": sale_price_by_wh,
        })

    filtered_global_stats = {
        "pending": sum(1 for product in filtered_products if float(product.get("total_pending") or 0) > 0),
        "out_of_stock": sum(1 for product in filtered_products if float(product.get("total_stock") or 0) <= 0),
    }

    return {
        **payload,
        "warehouses": allowed_warehouses,
        "products": filtered_products,
        "global_stats": filtered_global_stats,
        "_allowed_warehouse_names": allowed_names,
    }

# Initialize user data with defaults if empty
_user_profiles = load_user_data()
profiles_changed = False
for user in VALID_USERS:
    expected_access = get_default_warehouse_access_for_user(user)
    if user not in _user_profiles:
        _user_profiles[user] = {
            "username": user,
            "avatar": None,
            "password": VALID_USERS[user],
            "warehouse_access": expected_access,
        }
        profiles_changed = True
        continue

    original_profile = dict(_user_profiles[user])
    _user_profiles[user] = ensure_profile_defaults(user, _user_profiles[user])
    if "password" not in _user_profiles[user]:
        _user_profiles[user]["password"] = VALID_USERS[user]
    elif _user_profiles[user]["password"] != original_profile.get("password"):
        pass

    if _user_profiles[user] != original_profile:
        profiles_changed = True

if profiles_changed:
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


def is_internal_supplier_name(name: str) -> bool:
    upper = (name or "").strip().upper()
    # Normalize to catch "Andy's" with "ANDYS" and handle different apostrophes
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

def calculate_abc_segments(data_dict, force_aa_threshold=None):
    """
    Clasifica productos en categorías ABC usando porcentaje acumulado (Pareto).
    - Ordena de MAYOR a MENOR ventas.
    - Calcula % individual y % acumulado SOLO sobre productos con ventas > 0.
    - Productos sin ventas reciben cat='' (sin categoría), igual que la fórmula Excel:
      =SI(G>=0; SI(cum%<=20%;"AA"; SI(cum%<=40%;"A"; ...)); "")
    - Thresholds: <=20% AA | <=40% A | <=60% B | <=80% C | <=90% D | >90% E
    """
    if not data_dict:
        return {}

    # 1. Convertir a numérico
    all_items = [(pid, float(v or 0)) for pid, v in data_dict.items()]

    # 2. Separar activos (ventas > 0) e inactivos
    active_items = sorted(
        [(pid, val) for pid, val in all_items if val > 0.000001],
        key=lambda x: x[1],
        reverse=True  # Mayor a menor
    )
    inactive_pids = [pid for pid, val in all_items if val <= 0.000001]

    # 3. Productos sin ventas -> sin categoría ABC
    results = {pid: {'cat': '', 'part': 0, 'cum': 0} for pid in inactive_pids}

    if not active_items:
        return results

    # 4. Total SOLO de activos
    total_val = sum(val for _, val in active_items)
    if total_val <= 0:
        for pid, _ in active_items:
            results[pid] = {'cat': '', 'part': 0, 'cum': 0}
        return results

    # 5. Calcular % individual y % acumulado → clasificar
    cum_sum = 0
    for pid, val in active_items:
        cum_sum += val
        part = (val / total_val) * 100          # % individual
        cum_perc = (cum_sum / total_val) * 100  # % acumulado

        # Clasificar por % ACUMULADO (lógica Pareto)
        if cum_perc <= 20:
            cat = 'AA'
        elif cum_perc <= 40:
            cat = 'A'
        elif cum_perc <= 60:
            cat = 'B'
        elif cum_perc <= 80:
            cat = 'C'
        elif cum_perc <= 90:
            cat = 'D'
        else:
            cat = 'E'

        # Override opcional por umbral absoluto
        if force_aa_threshold and val >= force_aa_threshold:
            cat = 'AA'

        results[pid] = {'cat': cat, 'part': round(part, 4), 'cum': round(cum_perc, 4)}

    return results

def fetch_active_products_data():
    global _next_sync_time
    if _is_syncing:
        logger.warning("Sincronización ya está en curso. Saltando.")
        return None

    set_sync_state(True, "inicio de fetch_active_products_data")
    client = OdooClient()

    try:
        if not client.authenticate():
            logger.error("Failed to authenticate with Odoo")
            return None

        adaptia_company_context = resolve_company_context(client)

        # 1. Start discovery (Warehouses and internal location IDs)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            fut_wh = executor.submit(client.call_kw, "stock.warehouse", "search_read", [], {"fields": ["id", "name", "code", "lot_stock_id", "company_id"]})
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

        date_180_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d %H:%M:%S')
        date_90_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')
        date_30_ago = (datetime.now() - timedelta(days=30)).replace(hour=0, minute=0, second=0).strftime('%Y-%m-%d %H:%M:%S')

        loc_names = {l['id']: l.get('complete_name', '') for l in locations_int}

        # Helper: build rotation maps from raw groups, then discard raw data
        def _build_rotation_maps(groups):
            rmap, rby_wh = {}, {}
            for g in groups:
                if not g.get('product_id'): continue
                pid, lid, qty = g['product_id'][0], g['location_id'][0], g.get('quantity') or 0
                
                loc_name = loc_names.get(lid, "").upper()
                if "EXISTENCIAS" not in loc_name: continue
                
                wh_id = loc_to_wh.get(lid)
                rmap[pid] = rmap.get(pid, 0) + qty
                if wh_id:
                    if pid not in rby_wh: rby_wh[pid] = {}
                    rby_wh[pid][wh_id] = rby_wh[pid].get(wh_id, 0) + qty
            return rmap, rby_wh

        # 2. SEQUENTIAL Core Data — one query at a time to limit RAM
        rot_base_domain = [('state', '=', 'done'),
                           ('location_dest_id', 'in', customer_loc_ids), ('location_id', 'in', internal_loc_ids)]
        rg_fields = ['product_id', 'location_id', 'quantity:sum']
        rg_groupby = ['product_id', 'location_id']

        # --- Rotation 30d: fetch → process → free ---
        logger.info("Fetching Rotation 30d...")
        try:
            rot_groups = client.call_kw("stock.move.line", "read_group",
                [[('date', '>=', date_30_ago)] + rot_base_domain, rg_fields, rg_groupby], {"lazy": False}) or []
        except Exception as e:
            logger.warning(f"Rotation 30d failed: {e}")
            rot_groups = []
        rotation_map, rotation_by_wh = _build_rotation_maps(rot_groups)
        logger.info(f"Rotation 30d done: {len(rot_groups)} groups")
        del rot_groups; gc.collect()

        # --- Rotation 90d: fetch → process → free ---
        logger.info("Fetching Rotation 90d...")
        try:
            rot_groups_90 = client.call_kw("stock.move.line", "read_group",
                [[('date', '>=', date_90_ago)] + rot_base_domain, rg_fields, rg_groupby], {"lazy": False}) or []
        except Exception as e:
            logger.warning(f"Rotation 90d failed: {e}")
            rot_groups_90 = []
        rotation_map_90, rotation_by_wh_90 = _build_rotation_maps(rot_groups_90)
        logger.info(f"Rotation 90d done: {len(rot_groups_90)} groups")
        del rot_groups_90; gc.collect()

        # --- Rotation 180d: fetch → process → free ---
        logger.info("Fetching Rotation 180d...")
        try:
            rot_groups_180 = client.call_kw("stock.move.line", "read_group",
                [[('date', '>=', date_180_ago)] + rot_base_domain, rg_fields, rg_groupby], {"lazy": False}) or []
        except Exception as e:
            logger.warning(f"Rotation 180d failed: {e}")
            rot_groups_180 = []
        rotation_map_180, rotation_by_wh_180 = _build_rotation_maps(rot_groups_180)
        logger.info(f"Rotation 180d done: {len(rot_groups_180)} groups")
        del rot_groups_180; gc.collect()

        # --- Stock: fetch → process → free ---
        logger.info("Fetching Stock data...")
        try:
            stock_groups = client.call_kw("stock.quant", "read_group",
                [[('location_id', 'in', internal_loc_ids), ('quantity', '!=', 0)],
                 ['product_id', 'location_id', 'quantity:sum'], ['product_id', 'location_id']], {"lazy": False}) or []
        except Exception as e:
            logger.warning(f"Stock data failed: {e}")
            stock_groups = []
        stock_by_wh = {}
        for g in stock_groups:
            if not g.get('product_id'): continue
            pid, lid, qty = g['product_id'][0], g['location_id'][0], g.get('quantity') or 0
            
            loc_name = loc_names.get(lid, "").upper()
            if "EXISTENCIAS" not in loc_name: continue
            
            wh_id = loc_to_wh.get(lid)
            if wh_id:
                if pid not in stock_by_wh: stock_by_wh[pid] = {}
                stock_by_wh[pid][wh_id] = stock_by_wh[pid].get(wh_id, 0) + qty
        logger.info(f"Stock done: {len(stock_groups)} groups")
        del stock_groups; gc.collect()

        # --- POS Revenue Global: fetch → process → free ---
        logger.info("Fetching POS Revenue data...")
        rev_domain = [('order_id.date_order', '>=', date_30_ago)]
        try:
            pos_global_groups = client.call_kw("pos.order.line", "read_group",
                [rev_domain, ['product_id', 'price_subtotal_incl:sum'], ['product_id']], {"lazy": False}) or []
        except Exception as e:
            logger.warning(f"POS Global failed: {e}")
            pos_global_groups = []
        revenue_map = {g['product_id'][0]: (g.get('price_subtotal_incl') or 0) for g in pos_global_groups if g.get('product_id')}
        logger.info(f"POS Global done: {len(pos_global_groups)} groups")
        del pos_global_groups; gc.collect()

        # --- POS Revenue Per-Warehouse: sequential ---
        revenue_by_wh = {}
        for wh_id in wh_map:
            try:
                d = rev_domain + [('order_id.picking_type_id.warehouse_id', '=', wh_id)]
                wh_res = client.call_kw("pos.order.line", "read_group",
                    [d, ['product_id', 'price_subtotal_incl:sum'], ['product_id']], {"lazy": False}) or []
            except Exception as e:
                logger.warning(f"POS Revenue for WH {wh_id} failed: {e}. Skipping.")
                wh_res = []
            for g in wh_res:
                if not g.get('product_id'): continue
                pid, rev = g['product_id'][0], g.get('price_subtotal_incl') or 0
                if pid not in revenue_by_wh: revenue_by_wh[pid] = {}
                revenue_by_wh[pid][wh_id] = rev
            del wh_res
        gc.collect()
        logger.info("POS Revenue per-warehouse done")

        # sales_map / sales_by_wh = rotation (physical moves to customer)
        sales_map = dict(rotation_map)
        sales_by_wh = {pid: dict(wh_dict) for pid, wh_dict in rotation_by_wh.items()}
        sales_map_90 = dict(rotation_map_90)
        sales_by_wh_90 = {pid: dict(wh_dict) for pid, wh_dict in rotation_by_wh_90.items()}
        sales_map_180 = dict(rotation_map_180)
        sales_by_wh_180 = {pid: dict(wh_dict) for pid, wh_dict in rotation_by_wh_180.items()}

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

            fut_po_orders = executor.submit(client.call_kw, "purchase.order", "search_read",
                                          [[('create_date', '>=', date_30_ago)]],
                                          {"fields": ["id", "picking_type_id", "name", "partner_id", "state", "date_order", "date_approve", "create_date", "company_id", "user_id", "invoice_status", "receipt_status", "amount_total"]})

            # Panel lines: all states, full fields, for purchase-orders panel (served from cache)
            fut_po_panel_lines = executor.submit(client.call_kw, "purchase.order.line", "search_read",
                                                [[('order_id.create_date', '>=', date_30_ago)]],
                                                {"fields": ["id", "order_id", "product_id", "product_qty", "qty_received",
                                                            "qty_invoiced", "price_unit", "price_subtotal", "price_total",
                                                            "date_planned", "name", "state"],
                                                 "order": "id desc", "limit": 50000})

            fut_orderpoints = executor.submit(client.call_kw, "stock.warehouse.orderpoint", "search_read",
                                              [[('active', '=', True)]],
                                              {"fields": ["product_id", "warehouse_id", "location_id", "product_min_qty", "product_max_qty", "qty_multiple", "group_id", "route_id"]})

            po_global_groups = fut_po_global.result() or []
            po_lines = fut_po_lines.result() or []
            orders = fut_po_orders.result() or []
            po_panel_lines = fut_po_panel_lines.result() or []
            orderpoints = fut_orderpoints.result() or []
        
        po_details = {o['id']: o for o in orders}
        
        # Handle orderpoints
        orderpoints_by_product = {}
        for op in orderpoints:
            if not op.get('product_id'): continue
            pid = op['product_id'][0]
            
            wh_id = None
            if op.get('warehouse_id'):
                wh_id = op['warehouse_id'][0]
            elif op.get('location_id'):
                wh_id = loc_to_wh.get(op['location_id'][0])
                
            if not wh_id: continue
            
            new_max = op.get('product_max_qty') or 0
            
            if pid not in orderpoints_by_product:
                orderpoints_by_product[pid] = {}
                
            if wh_id in orderpoints_by_product[pid]:
                if new_max <= orderpoints_by_product[pid][wh_id]['max']:
                    continue
                    
            orderpoints_by_product[pid][wh_id] = {
                "min": op.get('product_min_qty') or 0,
                "max": new_max
            }

        
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
        # INCLUIR productos con seller_ids aunque no tengan rotación/revenue/stock/pedidos
        products_with_seller = set()
        try:
            all_products_with_seller = client.call_kw("product.product", "search_read", 
                [[("seller_ids", "!=", False)]], 
                {"fields": ["id"], "limit": 100000})
            products_with_seller = set(p['id'] for p in all_products_with_seller if p.get('id'))
            logger.info(f"Found {len(products_with_seller)} products with seller_ids configured")
        except Exception as e:
            logger.warning(f"Could not fetch products with sellers: {e}")
        
        active_pids = list(set(
            list(rotation_map.keys()) + 
            list(revenue_map.keys()) + 
            list(stock_by_wh.keys()) + 
            list(pending_by_product.keys()) +
            list(products_with_seller)  # Incluir todos los que tienen proveedor
        ))
        active_pids_set = set(active_pids)
        logger.info(f"Fetching details for {len(active_pids)} unique products...")

        # 4.1 Pricelist items ("Precio Adicional") — mapped via explicit tariff rules first.
        # Fallback to fuzzy matching only if no explicit rule matched.
        price_by_wh_map = {}  # {product_id: {str(wh_id): price}}
        try:
            import re as _re

            # Strict normalizer for rule detection
            def _norm_key(s):
                if not s: return ""
                s = s.upper().strip()
                s = _re.sub(r"['\u2019\u0027]", '', s)
                return _re.sub(r"\s+", ' ', s).strip()

            # Loose normalizer for fuzzy fallback matching
            def _norm_loose(s):
                s = _norm_key(s)
                # Remove common filler words for better matching
                s = _re.sub(r"\b(BOB|SRL|PRECIOS|LISTA|DE|PARA|PREDETERMINADA)\b", ' ', s)
                return _re.sub(r"\s+", ' ', s).strip()

            # Pre-compute warehouse names/codes and groups used by tariff rules
            _wh_rows = []
            for wh in warehouses:
                _name = wh.get('name', '')
                _code = (wh.get('code') or '').upper().strip()
                if not _name: continue
                _wh_rows.append({
                    "id": wh["id"],
                    "name_raw": _name,
                    "name_key": _norm_key(_name),
                    "name_loose": _norm_loose(_name),
                    "code": _code,
                })

            def _is_yam_yam_wh(_wh):
                """Solo las 2 sucursales Yam Yam."""
                _name = _wh["name_key"]
                _code = _wh["code"]
                return "YAM YAM" in _name or _code in {"YYP", "YYS"}

            def _is_andys_wh(_wh):
                """Sucursales Andy's (no YamYam)."""
                _name = _wh["name_key"]
                _code = _wh["code"]
                return (("ANDYS" in _name) or _code in {"SM", "ACH", "OBR"}) and not _is_yam_yam_wh(_wh)

            def _is_prado_wh(_wh):
                """Solo Nuba Prado."""
                _name = _wh["name_key"]
                _code = _wh["code"]
                return "PRADO" in _name or _code == "NPRA"

            def _is_expandia_tariff_wh(_wh):
                """Tarifa Expandia: todo Santa Cruz = Megacenter, Cinebol, Multicine,
                Equipetrol, Beni, Ventura, Velarde SCZ, etc."""
                _name = _wh["name_key"]
                _code = _wh["code"]
                # Tokens que identifican una sucursal de Santa Cruz
                _scz_tokens = (
                    "MEGACENTER", "CINEBOL", "MULTICINE",
                    "SANTA CRUZ", "BENI", "EQUIPETROL",
                    "HAMACAS", "VENTURA", "VELARDE SCZ", " SCZ",
                )
                if any(tok in _name for tok in _scz_tokens):
                    return True
                # Códigos conocidos de sucursales SCZ
                _scz_codes = {
                    "SCZ", "SCVEN",
                    "NBEN", "NEQP", "NHAM", "NMC", "NCNB",
                    "ENMC", "ENCNB", "ENMUL", "ENBEN", "ENEQP",
                    "ENVEN", "ENVEL", "EALMV",
                }
                if _code in _scz_codes:
                    return True
                return False

            def _is_nuba_wh(_wh):
                """Sucursales Nuba (excluyendo Prado y Santa Cruz que se manejan aparte).
                NO usa startswith('N') genérico para evitar falsos positivos."""
                _name = _wh["name_key"]
                _code = _wh["code"]
                # Códigos explícitamente Nuba LPZ / CBBA
                _nuba_codes = {
                    "N21", "NAC", "NCENT", "NSOPO", "NCOM",
                    "NPINO", "NSHO", "NSUC", "N06",
                    "CBAME", "CBSMA",
                }
                # Aliases conocidos sin el prefijo "NUBA" en el nombre
                _nuba_name_aliases = ("SOPOCACHI", "ALMACEN CENTRAL")
                return (
                    ("NUBA" in _name)
                    or (_code in _nuba_codes)
                    or any(alias in _name for alias in _nuba_name_aliases)
                )

            _yam_yam_wh_ids    = {w["id"] for w in _wh_rows if _is_yam_yam_wh(w)}
            _andys_public_wh_ids = {w["id"] for w in _wh_rows if _is_andys_wh(w)}
            _prado_wh_ids      = {w["id"] for w in _wh_rows if _is_prado_wh(w)}
            _expandia_wh_ids   = {w["id"] for w in _wh_rows if _is_expandia_tariff_wh(w)}
            # Tarifa Nuba = Nuba LPZ/CBBA, excepto Prado y las de Santa Cruz (Expandia)
            _nuba_wh_ids = {
                w["id"] for w in _wh_rows
                if _is_nuba_wh(w)
                and w["id"] not in _prado_wh_ids
                and w["id"] not in _expandia_wh_ids
            }

            # ── Diagnostic logs: verificar mapeo de tarifas ──────────────────
            def _wh_names_for(ids):
                return sorted([w["name_raw"] for w in _wh_rows if w["id"] in ids])
            logger.info(f"[TARIFA] YAM YAM       ({len(_yam_yam_wh_ids)}): {_wh_names_for(_yam_yam_wh_ids)}")
            logger.info(f"[TARIFA] ANDYS PUBLICA  ({len(_andys_public_wh_ids)}): {_wh_names_for(_andys_public_wh_ids)}")
            logger.info(f"[TARIFA] NUBA PRADO     ({len(_prado_wh_ids)}): {_wh_names_for(_prado_wh_ids)}")
            logger.info(f"[TARIFA] EXPANDIA/SCZ   ({len(_expandia_wh_ids)}): {_wh_names_for(_expandia_wh_ids)}")
            logger.info(f"[TARIFA] NUBA (LPZ/CBBA)({len(_nuba_wh_ids)}): {_wh_names_for(_nuba_wh_ids)}")
            # Warehouses sin tarifa asignada (útil para detectar sucursales nuevas)
            _all_classified = _yam_yam_wh_ids | _andys_public_wh_ids | _prado_wh_ids | _expandia_wh_ids | _nuba_wh_ids
            _unclassified = [w["name_raw"] for w in _wh_rows if w["id"] not in _all_classified]
            if _unclassified:
                logger.warning(f"[TARIFA] SIN CLASIFICAR ({len(_unclassified)}): {sorted(_unclassified)}")

            # Pricelist-name rule mapping:
            # - YAM YAM      => las 2 sucursales Yam Yam
            # - Tarifa Publica => Andys
            # - Tarifa Prado  => solo Nuba Prado
            # - Tarifa Expandia => todo Santa Cruz (Megacenter, Cinebol, Multicine…)
            # - Tarifa Nuba   => todos los Nuba de LPZ/CBBA (excepto Prado y STC)
            def _target_wh_ids_from_tariff_name(_name_key):
                if not _name_key:
                    return set()

                # YAM YAM primero (antes que cualquier otra regla)
                if "YAM YAM" in _name_key:
                    return set(_yam_yam_wh_ids)

                if "TARIFA PUBLICA" in _name_key or ("PUBLICA" in _name_key and "NUBA" not in _name_key):
                    return set(_andys_public_wh_ids)

                # Prado antes de Nuba (para que "TARIFA PRADO" no sea capturada por NUBA)
                if "TARIFA PRADO" in _name_key or " PRADO" in f" {_name_key} ":
                    return set(_prado_wh_ids)

                if "TARIFA EXPANDIA" in _name_key or "EXPANDIA" in _name_key or any(token in _name_key for token in ["MEGACENTER", "CINEBOL", "MULTICINE", "SANTA CRUZ", "BENI", "EQUIPETROL", "HAMACAS", "VENTURA", "VELARDE SCZ"]):
                    return set(_expandia_wh_ids)

                if "TARIFA NUBA" in _name_key or (" NUBA" in f" {_name_key} "):
                    return set(_nuba_wh_ids)

                return set()

            # Pre-normalize all warehouse names (for fuzzy fallback only)
            _wh_norm = []
            for _wh in _wh_rows:
                _wh_norm.append((_wh["id"], _wh["name_loose"], _wh["name_raw"]))

            # Fetch POS configs
            _pos_configs = client.call_kw("pos.config", "search_read", [[]],
                {"fields": ["id", "name", "pricelist_id"]}) or []

            # Build pricelist_id → set(wh_id)
            _pl_to_wh_ids = {}
            for _pos in _pos_configs:
                _pl_data = _pos.get('pricelist_id')
                if not _pl_data:
                    continue
                _pl_id = _pl_data[0] if isinstance(_pl_data, list) else _pl_data
                _pl_name_key = _norm_key(_pl_data[1] if isinstance(_pl_data, list) else "")
                _pos_name_key = _norm_key(_pos['name'])

                # 1) Strict explicit tariff mapping based ONLY on Pricelist Name (User requested rules)
                _rule_wh_ids = _target_wh_ids_from_tariff_name(_pl_name_key)
                if _rule_wh_ids:
                    _pl_to_wh_ids.setdefault(_pl_id, set()).update(_rule_wh_ids)
                    continue

                # 2) If Pricelist name didn't match a rule, try POS name rule
                _pos_rule_wh_ids = _target_wh_ids_from_tariff_name(_pos_name_key)
                if _pos_rule_wh_ids:
                    _pl_to_wh_ids.setdefault(_pl_id, set()).update(_pos_rule_wh_ids)
                    continue

                # 3) Fuzzy fallback for legacy/unknown pricelist names
                _pl_name_norm = _norm_loose(_pl_data[1] if isinstance(_pl_data, list) else "")
                _pos_name_norm = _norm_loose(_pos['name'])

                for _wid, _wname_norm, _wname_orig in _wh_norm:
                    if not _wname_norm or len(_wname_norm) < 3: continue
                    # Match if Dashboard WH name is in POS name OR in Pricelist name
                    if _wname_norm in _pos_name_norm or _wname_norm in _pl_name_norm or \
                       _pos_name_norm in _wname_norm or _pl_name_norm in _wname_norm:
                        _pl_to_wh_ids.setdefault(_pl_id, set()).add(_wid)

            # Log mapping for transparency
            for _pl_id, _wh_ids in _pl_to_wh_ids.items():
                _wh_names = [w['name'] for w in warehouses if w['id'] in _wh_ids]
                logger.info(f"Pricelist mapping: PL {_pl_id} matches warehouses: {_wh_names}")

            # Fetch fixed-price pricelist items
            _pl_items = client.call_kw("product.pricelist.item", "search_read",
                [[('compute_price', '=', 'fixed')]],
                {"fields": ["pricelist_id", "product_id", "fixed_price"],
                 "order": "write_date desc",
                 "limit": 200000}) or []

            _seen = set()
            for _item in _pl_items:
                _pl_data = _item.get('pricelist_id')
                if not _pl_data: continue
                _pl_id = _pl_data[0] if isinstance(_pl_data, list) else _pl_data
                _wh_ids = _pl_to_wh_ids.get(_pl_id)
                if not _wh_ids: continue

                _prod_data = _item.get('product_id')
                if not _prod_data: continue
                _pid = _prod_data[0] if isinstance(_prod_data, list) else _prod_data
                if _pid not in active_pids_set: continue

                if (_pid, _pl_id) in _seen: continue
                _seen.add((_pid, _pl_id))

                _fixed = _item.get('fixed_price') or 0
                if _fixed <= 0: continue

                if _pid not in price_by_wh_map:
                    price_by_wh_map[_pid] = {}
                for _wid in _wh_ids:
                    # Only apply if not already set by a more recent/specific rule
                    if str(_wid) not in price_by_wh_map[_pid]:
                        price_by_wh_map[_pid][str(_wid)] = round(float(_fixed), 2)

            logger.info(f"Pricelist items loaded: {len(price_by_wh_map)} products with specific prices")
        except Exception as _e:
            logger.warning(f"Could not load pricelist items: {_e}")
            price_by_wh_map = {}
        
        # Track prices from product fields (lst_price)
        list_prices = {}       # {pid: current_list_price from lst_price}
        
        # We'll use lst_price from product directly
        # and price_by_wh for warehouse-specific prices
        for _pid in active_pids_set:
            list_prices[_pid] = 0
        
        detail_products = []
        costs_map = {}
        
        # Use a local client for thread safety in threads/executors
        # Note: xmlrpc.client.ServerProxy is thread-safe for making calls, 
        # but creating a new one ensures clean state.
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            fields = ["id", "display_name", "barcode", "default_code", "product_tmpl_id", "uom_package", "seller_ids", "standard_price", "lst_price", "type", "categ_id", "brand_id", "additional_product_tag_ids", "product_tag_ids"]
            
            # Helper to create client per thread if needed, but ServerProxy is usually fine. 
            # We will just use the global client but catch errors better.
            def fetch_batch(b): 
                try:
                    base_rows = client.call_kw("product.product", "read", [b], {"fields": fields}) or []
                    adaptia_price_by_id = {}
                    if adaptia_company_context:
                        adaptia_rows = client.call_kw(
                            "product.product",
                            "read",
                            [b],
                            {"fields": ["id", "standard_price"], "context": adaptia_company_context},
                        ) or []
                        adaptia_price_by_id = {
                            row["id"]: round(float(row.get("standard_price") or 0), 2)
                            for row in adaptia_rows
                        }
                    for row in base_rows:
                        row["adaptia_standard_price"] = adaptia_price_by_id.get(row["id"], 0.0)
                    return base_rows
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
            price_history_by_pid: dict = {}          # pid → {price, prev_price, date}
            price_history_by_tmpl: dict = {}         # tmpl_id → {price, prev_price, date}
            price_history_by_partner_pid: dict = {}  # (partner_id, pid) → {price, prev_price, date}
            price_history_by_partner_tmpl: dict = {} # (partner_id, tmpl_id) → {price, prev_price, date}
            if sel_ids:
                def fetch_s(b):
                    return client.call_kw(
                        "product.supplierinfo",
                        "read",
                        [b],
                        {"fields": ["id", "partner_id", "product_id", "product_tmpl_id", "price", "date_start", "write_date"]},
                    )
                s_res = []
                for res in executor.map(fetch_s, [sel_ids[i:i+1000] for i in range(0, len(sel_ids), 1000)]): s_res.extend(res or [])
                p_ids = list(set([s['partner_id'][0] for s in s_res if s.get('partner_id')]))
                p_name_m = {}
                def fetch_p(b): return client.call_kw("res.partner", "read", [b], {"fields": ["id", "name"]})
                for res in executor.map(fetch_p, [p_ids[i:i+1000] for i in range(0, len(p_ids), 1000)]):
                    for part in (res or []): p_name_m[part['id']] = part['name']

                # Sort records newest-first so the first entry = current, second = previous
                def _si_date(s):
                    d = s.get('date_start') or s.get('write_date') or ''
                    return str(d)[:10] if d else ''

                s_res_sorted = sorted(s_res, key=_si_date, reverse=True)

                for s in s_res_sorted:
                    product_id   = s['product_id'][0]   if s.get('product_id')   else None
                    product_tmpl_id = s['product_tmpl_id'][0] if s.get('product_tmpl_id') else None
                    price_val    = float(s.get('price') or 0)
                    date_val     = _si_date(s)

                    supplier_map[s['id']] = {
                        'name':            p_name_m.get(s['partner_id'][0], 'N/A') if s.get('partner_id') else 'N/A',
                        'partner_id':      s['partner_id'][0] if s.get('partner_id') else None,
                        'product_id':      product_id,
                        'product_tmpl_id': product_tmpl_id,
                        'price':           price_val,
                    }

                    partner_id = s['partner_id'][0] if s.get('partner_id') else None

                    # Build price history per product_id (global fallback)
                    if product_id:
                        if product_id not in price_history_by_pid:
                            price_history_by_pid[product_id] = {'price': price_val, 'prev_price': 0.0, 'date': date_val}
                        elif price_history_by_pid[product_id]['prev_price'] == 0.0 and price_val != price_history_by_pid[product_id]['price']:
                            price_history_by_pid[product_id]['prev_price'] = price_val

                    # Build price history per template (global fallback)
                    if product_tmpl_id:
                        if product_tmpl_id not in price_history_by_tmpl:
                            price_history_by_tmpl[product_tmpl_id] = {'price': price_val, 'prev_price': 0.0, 'date': date_val}
                        elif price_history_by_tmpl[product_tmpl_id]['prev_price'] == 0.0 and price_val != price_history_by_tmpl[product_tmpl_id]['price']:
                            price_history_by_tmpl[product_tmpl_id]['prev_price'] = price_val

                    # Build price history per (partner, product) — used to get best-supplier's own price
                    if partner_id and product_id:
                        key = (partner_id, product_id)
                        if key not in price_history_by_partner_pid:
                            price_history_by_partner_pid[key] = {'price': price_val, 'prev_price': 0.0, 'date': date_val}
                        elif price_history_by_partner_pid[key]['prev_price'] == 0.0 and price_val != price_history_by_partner_pid[key]['price']:
                            price_history_by_partner_pid[key]['prev_price'] = price_val
                    if partner_id and product_tmpl_id:
                        key = (partner_id, product_tmpl_id)
                        if key not in price_history_by_partner_tmpl:
                            price_history_by_partner_tmpl[key] = {'price': price_val, 'prev_price': 0.0, 'date': date_val}
                        elif price_history_by_partner_tmpl[key]['prev_price'] == 0.0 and price_val != price_history_by_partner_tmpl[key]['price']:
                            price_history_by_partner_tmpl[key]['prev_price'] = price_val

        # 5. ABC Global y por Sucursal
        # rotation_map contiene SOLO productos con ventas > 0 (vienen de stock moves reales).
        # calculate_abc_segments asigna '' a los que tengan val=0 en el dict.
        abc_rot_g = calculate_abc_segments(rotation_map, force_aa_threshold=2000)
        abc_rev_g = calculate_abc_segments(revenue_map)
        abc_data = {}

        # Categoría global: usar SOLO rotación (unidades físicas vendidas)
        for pid in active_pids:
            cat_rot = abc_rot_g.get(pid, {'cat': ''})['cat']  # '' si no tiene ventas
            cat_rev = abc_rev_g.get(pid, {'cat': ''})['cat']

            abc_data[pid] = {
                "category": cat_rot,   # '' para sin ventas, 'AA'..'E' para los activos
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

            # Solo incluir productos con ventas > 0 en el dataset para el cálculo ABC.
            # Productos con 0 ventas recibirán cat='' automáticamente desde calculate_abc_segments.
            rot_dat = {p: rotation_by_wh.get(p, {}).get(wh_id, 0) for p in wh_pids}
            rev_dat = {p: revenue_by_wh.get(p, {}).get(wh_id, 0) for p in wh_pids}

            s_rot = calculate_abc_segments(rot_dat)
            s_rev = calculate_abc_segments(rev_dat)

            c_aa, c_a = 0, 0
            for pid in wh_pids:
                if pid not in abc_data:
                    continue

                # Usar SOLO rotación (unidades) para ABC por sucursal
                cr = s_rot.get(pid, {'cat': ''})['cat']  # '' si no tiene ventas
                cv = s_rev.get(pid, {'cat': ''})['cat']

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
            total_stock = float(sum(stock_by_wh.get(pid, {}).values()))
            sales_90d_val = float(sales_map_90.get(pid, 0))
            
            # Define activity: at least 1 sale in the last 30 days OR pending orders.
            # This results in the ~13.5k products expected by the user when switch is OFF.
            has_activity = sales_val > 0.001 or pending_val > 0.001
            
            clean_name = re.sub(r'\[.*?\]', '', p.get('display_name') or "").strip()
            provider, provider_id = "N/A", None
            sel = pick_best_supplier(p, supplier_map)
            supplier_price = None
            if sel:
                provider, provider_id = sel['name'], sel['partner_id']
                supplier_price = sel.get('price')

            origin = provider_origins.get(provider.strip().upper(), "N/A")
            
            # Fallback to Brand if provider is still internal or N/A
            # This helps when Odoo has no external supplier info but the brand is known (e.g. VV LOVE)
            if provider == "N/A" or is_internal_supplier_name(provider) or is_store_fallback_supplier(provider):
                brand_name = p['brand_id'][1] if isinstance(p.get('brand_id'), (list, tuple)) else None
                if brand_name and brand_name != "N/A" and not is_internal_supplier_name(brand_name):
                    provider = brand_name
                    # Try to get origin for the brand as well
                    origin = provider_origins.get(provider.strip().upper(), origin)
            abc_item = abc_data.get(pid, {})
            
            adaptia_cost = round(float(p.get('adaptia_standard_price') or 0), 2)
            base_cost = round(float(p.get('standard_price') or 0), 2)
            if adaptia_cost > 0:
                cost_price = adaptia_cost
            elif base_cost > 0:
                cost_price = base_cost
            elif supplier_price is not None and float(supplier_price) > 0:
                cost_price = round(float(supplier_price), 2)
            else:
                cost_price = 0.0
                
            sale_price = round(float(p.get('lst_price') or 0), 2)

            # Price from best supplier first, then global fallback
            tmpl_id_val = (p.get('product_tmpl_id') or [0])[0] if isinstance(p.get('product_tmpl_id'), list) else (p.get('product_tmpl_id') or 0)
            ph = (
                (price_history_by_partner_pid.get((provider_id, pid)) if provider_id else None) or
                (price_history_by_partner_tmpl.get((provider_id, tmpl_id_val)) if provider_id else None) or
                price_history_by_pid.get(pid) or
                price_history_by_tmpl.get(tmpl_id_val) or
                {}
            )
            prev_list_price_val   = round(float(ph.get('prev_price', 0) or 0), 2)
            price_update_date_val = ph.get('date', '') or ''

            final_products.append({
                "id": pid, "barcode": p.get('barcode') or "", "name": clean_name, "provider": provider, "origen": origin,
                "has_activity": has_activity,
                "total_stock": total_stock, "stock_by_wh": {str(k): float(v) for k, v in stock_by_wh.get(pid, {}).items()},
                "sales_30d": float(sales_val), "sales_30d_global": float(rotation_map.get(pid, 0)),
                "sales_by_wh": {str(wh): float(q) for wh, q in sales_by_wh.get(pid, {}).items() if q > 0.05},
                "sales_90d": float(sales_map_90.get(pid, 0)),
                "sales_by_wh_90d": {str(wh): float(q) for wh, q in sales_by_wh_90.get(pid, {}).items() if q > 0.05},
                "sales_180d": float(sales_map_180.get(pid, 0)),
                "sales_by_wh_180d": {str(wh): float(q) for wh, q in sales_by_wh_180.get(pid, {}).items() if q > 0.05},
                "total_pending": float(sum(pending_by_product.get(pid, {}).values())),
                "pending_by_wh": {str(wh): float(q) for wh, q in pending_by_product.get(pid, {}).items()},
                "pending_orders": pending_orders_by_product.get(pid, []),
                "orderpoints_by_wh": {str(wh): val for wh, val in orderpoints_by_product.get(pid, {}).items()},
                "uom_package": p.get('uom_package') or 0,
                "default_code": p.get('default_code') or "",
                "product_tmpl_id": tmpl_id_val,
                "abc_category": abc_item.get('category', 'E'), "abc_details": f"{abc_item.get('rotation', 'E')}/{abc_item.get('revenue', 'E')}",
                "abc_by_wh": abc_item.get("by_warehouse", {}), "type_name": p.get('type') or "consu",
                "category_name": p['categ_id'][1] if isinstance(p.get('categ_id'), (list, tuple)) else "N/A",
                "brand_name": p['brand_id'][1] if isinstance(p.get('brand_id'), (list, tuple)) else "N/A",
                "tags": [tag_map.get(tid) for tid in (list(set((p.get('additional_product_tag_ids') or []) + (p.get('product_tag_ids') or [])))) if tag_map.get(tid)],
                "cost_price": cost_price,
                "sale_price": sale_price,
                "list_price": round(float(ph.get('price', 0) or 0), 2),
                "prev_list_price": prev_list_price_val,
                "price_update_date": price_update_date_val,
                "sale_price_by_wh": {k: v for k, v in price_by_wh_map.get(pid, {}).items() if v != sale_price},
            })
            # If no tags, we could add 'Ninguno' here, but usually 'All' covers it. 
            # However, Odoo shows 'Ninguno', so let's add it if empty for better UX.
            if not final_products[-1]["tags"]:
                final_products[-1]["tags"] = ["Ninguno"]

        summary = {"rotation": {}, "revenue": {}}
        for i in abc_rot_g.values(): summary["rotation"][i['cat']] = summary["rotation"].get(i['cat'], 0) + 1
        for i in abc_rev_g.values(): summary["revenue"][i['cat']] = summary["revenue"].get(i['cat'], 0) + 1

        _next_sync_time = (datetime.now() + timedelta(minutes=30)).isoformat()
        cache_data = {
            "last_update": datetime.now().isoformat(), "products": final_products, "warehouses": warehouses,
            "abc_summary": summary,
            "global_stats": {
                "pending": len([p for p in final_products if p['total_pending'] > 0]),
                "out_of_stock": len([p for p in final_products if p['total_stock'] <= 0])
            },
            "next_sync": _next_sync_time
        }
        n_products = len(final_products)

        # Escribir sidecar de purchase_orders (pequeño, ~kb, para el panel de compras)
        try:
            def _leaf_categ(raw):
                """'All products / BEBIDAS / GASEOSAS' → 'GASEOSAS'"""
                if not raw:
                    return ''
                parts = [p.strip() for p in str(raw).split('/') if p.strip()]
                filtered = [p for p in parts if not p.lower().startswith('all product') and not p.lower().startswith('todos')]
                return filtered[-1] if filtered else (parts[-1] if parts else '')

            _barcode_map = {p['id']: (p.get('barcode') or '') for p in detail_products}
            _categ_map = {p['id']: _leaf_categ(p['categ_id'][1] if isinstance(p.get('categ_id'), (list, tuple)) else '') for p in detail_products}
            _order_map = {o['id']: o for o in orders}
            _SL = {"draft": "Borrador", "sent": "Enviado", "to approve": "Por Aprobar",
                   "purchase": "OC", "done": "Hecho", "cancel": "Cancelado"}
            _DL = {"nothing": "Nada", "to invoice": "Por Facturar", "invoiced": "Facturado",
                   "full": "Recibido", "partial": "Parcial", "pending": "Pendiente"}
            _po_panel = []
            for _l in po_panel_lines:
                _oid = _l['order_id'][0] if _l.get('order_id') else None
                _o = _order_map.get(_oid, {})
                _pid = _l['product_id'][0] if _l.get('product_id') else None
                _rs = _o.get('state', _l.get('state', 'draft'))
                _rd = _o.get('receipt_status') or _o.get('invoice_status') or ''
                _po_panel.append({
                    'line_id': _l['id'], 'order_ref': _o.get('name') or (_l['order_id'][1] if _l.get('order_id') else ''),
                    'barcode': _barcode_map.get(_pid, ''),
                    'description': _l.get('name') or (_l['product_id'][1] if _l.get('product_id') else ''),
                    'qty': float(_l.get('product_qty') or 0),
                    'qty_received': float(_l.get('qty_received') or 0),
                    'qty_invoiced': float(_l.get('qty_invoiced') or 0),
                    'date_planned': str(_l.get('date_planned') or ''),
                    'date_order': str(_o.get('date_order') or ''),
                    'date_approve': str(_o.get('date_approve') or ''),
                    'price_unit': float(_l.get('price_unit') or 0),
                    'price_total': float(_l.get('price_total') or 0),
                    'price_subtotal': float(_l.get('price_subtotal') or 0),
                    'amount_total': float(_o.get('amount_total') or 0),
                    'entregar_a': _o.get('picking_type_id', [None, ''])[1] if _o.get('picking_type_id') else '',
                    'categ_name': _categ_map.get(_pid, 'N/A'),
                    'supplier': _o.get('partner_id', [None, ''])[1] if _o.get('partner_id') else '',
                    'state_raw': _rs, 'state_label': _SL.get(_rs, str(_rs).capitalize()),
                    'delivery_status': _DL.get(_rd, _rd),
                    'buyer': _o.get('user_id', [None, ''])[1] if _o.get('user_id') else '',
                    'order_id': _oid,
                })
            _po_sidecar = os.path.join(BASE_DIR, "purchase_orders_cache.json")
            with open(_po_sidecar, "w") as _pf:
                _pf.write(json.dumps({"lines": _po_panel, "last_update": datetime.now().isoformat()}, separators=(',', ':'), default=str))
            logger.info(f"purchase_orders_cache.json escrito: {len(_po_panel)} líneas")
        except Exception as _pe:
            logger.error(f"Error escribiendo purchase_orders_cache.json: {_pe}", exc_info=True)

        # Serializar UNA sola vez y escribir a ambos archivos — evita tener 2 copias de 25MB en RAM
        json_bytes = json.dumps(cache_data).encode('utf-8')

        # Liberar estructuras intermedias grandes antes de escribir a disco
        del cache_data, final_products, detail_products
        del rotation_map, rotation_by_wh
        del rotation_map_90, rotation_by_wh_90
        del rotation_map_180, rotation_by_wh_180
        del stock_by_wh, revenue_map, revenue_by_wh
        del abc_rot_g, abc_rev_g, abc_data
        gc.collect()

        with open(CACHE_FILE, "wb") as f: f.write(json_bytes)
        try:
            with gzip.open(CACHE_FILE + ".gz", "wb") as f: f.write(json_bytes)
        except: pass

        del json_bytes
        gc.collect()

        logger.info(f"Cache saved: {n_products} products.")
        return None
    except Exception as e:
        logger.error(f"Error Turbo Sync: {e}", exc_info=True)
        return None
    finally:
        set_sync_state(False, "fin de fetch_active_products_data")

async def auto_sync_task():
    """Bucle interno para sincronizar. Espera 30 minutos DESPUÉS de terminar cada sincronización."""
    global _is_syncing, _next_sync_time, _sync_start_time
    logger.info("Iniciando tarea de sincronización automática (GAP de 30 min)")

    # Al arrancar: si el cache existe y es reciente (<25 min), esperar el tiempo restante
    interval_min = 30
    if os.path.exists(CACHE_FILE):
        try:
            cache_age_sec = time.time() - os.path.getmtime(CACHE_FILE)
            wait_sec = max(0, interval_min * 60 - cache_age_sec)
            if wait_sec > 10:
                _next_sync_time = (datetime.now() + timedelta(seconds=wait_sec)).isoformat()
                logger.info(f"Cache reciente ({int(cache_age_sec/60)} min). Próxima sync en {int(wait_sec/60)} min.")
                await asyncio.sleep(wait_sec)
        except Exception:
            pass

    while True:
        try:
            # 1. Iniciar Sincronización
            logger.info("Iniciando ciclo de sincronización...")
            _next_sync_time = None # Limpiar para indicar que está sucediendo ahora

            # Ejecutar en thread aparte para no bloquear el loop de FastAPI
            loop = asyncio.get_event_loop()
            try:
                await asyncio.wait_for(
                    loop.run_in_executor(None, fetch_active_products_data),
                    timeout=SYNC_TIMEOUT_SEC
                )
            except asyncio.TimeoutError:
                logger.error(f"WATCHDOG: Sincronización atascada por >5 min. Reseteando flag _is_syncing.")
                set_sync_state(False, "timeout en auto_sync_task")
            
            # 2. Calcular Próxima Sincronización (30 min desde AHORA, que ya terminó la anterior)
            interval_min = 30
            next_time = datetime.now() + timedelta(minutes=interval_min)
            _next_sync_time = next_time.isoformat()
            
            # 3. Persistir next_sync en archivo pequeño (evita cargar el cache de 25MB solo para esto)
            try:
                next_sync_file = os.path.join(os.path.dirname(CACHE_FILE), "next_sync.json")
                with open(next_sync_file, "w") as f:
                    json.dump({"next_sync": _next_sync_time}, f)
            except Exception as ce:
                logger.error(f"Error guardando next_sync: {ce}")

            logger.info(f"Sincronización completada. Próxima programada para: {_next_sync_time}")
            
            # 4. Esperar los 30 minutos de GAP
            await asyncio.sleep(interval_min * 60) 
            
        except Exception as e:
            logger.error(f"Error en tarea automática: {e}")
            await asyncio.sleep(60) # Reintentar en 1 min si falla el bucle

async def sync_watchdog_task():
    """Monitorea si el sync se queda atascado >5 min y lo resetea."""
    global _is_syncing, _sync_start_time
    logger.info("Iniciando watchdog de sincronización (monitoreo cada 10s)")

    while True:
        try:
            if _is_syncing and _sync_start_time is not None:
                elapsed = time.time() - _sync_start_time
                if elapsed > SYNC_TIMEOUT_SEC:
                    logger.error(f"WATCHDOG: Sync atascado por {int(elapsed)}s. Reseteando flag.")
                    _is_syncing = False
                    _sync_start_time = None
            await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"Error en watchdog: {e}")
            await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    # Iniciar tarea de sincronización automática en background
    asyncio.create_task(auto_sync_task())
    asyncio.create_task(sync_watchdog_task())

@app.get("/api/products")
async def get_products(request: Request, sync: bool = Query(False), background_tasks: BackgroundTasks = None):
    global _data_cache, _is_syncing

    username, profile = get_request_profile(request)
    if not username or not profile:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    warehouse_access = get_profile_warehouse_access(username, profile)

    if sync:
        if not _is_syncing and background_tasks is not None:
            # Start sync in background only if not already running.
            # The worker itself is responsible for flipping _is_syncing.
            background_tasks.add_task(fetch_active_products_data)
        # Either way, fall through and serve the current cache so the
        # frontend can display data immediately while the sync runs in bg.
        # The frontend will detect is_syncing=true and keep polling.


    # 1. Pre-Compressed GZip Delivery (FASTEST)
    accept_encoding = (request.headers.get("accept-encoding") or "").lower()
    
    # Prepare dynamic headers
    base_headers = {
        "X-Next-Sync": _next_sync_time or "",
        "X-Is-Syncing": "true" if _is_syncing else "false",
        "X-Last-Update": str(os.path.getmtime(CACHE_FILE)) if os.path.exists(CACHE_FILE) else ""
    }

    if warehouse_access == DEFAULT_WAREHOUSE_ACCESS and "gzip" in accept_encoding and os.path.exists(CACHE_FILE + ".gz"):
        # USAMOS FileResponse pero evitamos la doble compresión indicando que ya está codificado
        return FileResponse(
            CACHE_FILE + ".gz",
            media_type="application/json",
            headers={**base_headers, "Content-Encoding": "gzip"}
        )

    # 2. Raw JSON Delivery
    if os.path.exists(CACHE_FILE):
        if warehouse_access == DEFAULT_WAREHOUSE_ACCESS:
            return FileResponse(
                CACHE_FILE,
                media_type="application/json",
                headers=base_headers
            )

        with open(CACHE_FILE, "r") as f:
            payload = json.load(f)
        filtered_payload = filter_cache_payload_for_access(payload, warehouse_access)
        filtered_payload.pop("_allowed_warehouse_names", None)
        return JSONResponse(content=filtered_payload, headers=base_headers)

    # 3. Fallback to Background Sync (Never block the request thread for minutes)
    if not _is_syncing and background_tasks is not None:
        background_tasks.add_task(fetch_active_products_data)

    return JSONResponse(content={
        "status": "syncing", 
        "is_syncing": True,
        "message": "Caché no disponible. Iniciando sincronización inicial, por favor espere..."
    }, headers=base_headers)

@app.get("/api/sync/status")
async def get_sync_status():
    return JSONResponse({
        "is_syncing": _is_syncing,
        "sync_start_time": datetime.fromtimestamp(_sync_start_time).isoformat() if _sync_start_time else None,
        "last_update": get_cache_last_update_iso(),
        "next_sync": _next_sync_time,
        "sync_timeout_sec": SYNC_TIMEOUT_SEC,
        "cache_exists": os.path.exists(CACHE_FILE),
    })

@app.post("/api/sync/reset")
async def reset_sync_status():
    was_syncing = _is_syncing
    previous_start_time = _sync_start_time
    set_sync_state(False, "reset manual via /api/sync/reset")

    return JSONResponse({
        "status": "success",
        "message": "Estado de sincronización reiniciado",
        "was_syncing": was_syncing,
        "previous_sync_start_time": datetime.fromtimestamp(previous_start_time).isoformat() if previous_start_time else None,
        "is_syncing": _is_syncing,
    })

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
        profile = ensure_profile_defaults(username, profiles[username])
        return {
            "status": "success", 
            "token": f"{username}_{SECRET_TOKEN}", 
            "user": username,
            "avatar": profile.get("avatar"),
            "warehouse_access": profile.get("warehouse_access", DEFAULT_WAREHOUSE_ACCESS)
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
            if username not in profiles:
                return Response(content=json.dumps({"status": "error"}), status_code=401, media_type="application/json")
            profile = ensure_profile_defaults(username, profiles.get(username, {}))
            return {
                "status": "success", 
                "user": username,
                "avatar": profile.get("avatar"),
                "warehouse_access": profile.get("warehouse_access", DEFAULT_WAREHOUSE_ACCESS)
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

    profiles[username] = ensure_profile_defaults(username, profiles[username])
        
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
        "avatar": profiles[new_user_id].get("avatar"),
        "warehouse_access": profiles[new_user_id].get("warehouse_access", DEFAULT_WAREHOUSE_ACCESS)
    }


@app.get("/api/purchase-orders")
async def get_purchase_orders(request: Request):
    """
    Returns purchase order lines from sync cache (refreshed every 30 min).
    Last 30 days, all states.
    """
    username, profile = get_request_profile(request)
    if not username or not profile:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    warehouse_access = get_profile_warehouse_access(username, profile)

    po_sidecar = os.path.join(BASE_DIR, "purchase_orders_cache.json")

    if not os.path.exists(po_sidecar):
        return JSONResponse({"error": "Cache no disponible, espera la próxima sincronización"}, status_code=503)

    try:
        with open(po_sidecar, "r") as f:
            payload = json.load(f)

        lines = payload.get("lines", [])
        if warehouse_access != DEFAULT_WAREHOUSE_ACCESS and os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r") as f:
                cache_payload = json.load(f)
            filtered_cache = filter_cache_payload_for_access(cache_payload, warehouse_access)
            allowed_names = filtered_cache.get("_allowed_warehouse_names", [])
            lines = [
                line for line in lines
                if any(name in str(line.get("entregar_a") or "").upper() for name in allowed_names)
            ]

        logger.info(f"/api/purchase-orders (cache): returned {len(lines)} lines")
        return JSONResponse(
            {"lines": lines, "total": len(lines)},
            headers={
                "X-Next-Sync": _next_sync_time or "",
                "X-Last-Update": payload.get("last_update", ""),
            }
        )

    except Exception as e:
        logger.error(f"Error in /api/purchase-orders: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/purchase-suggestion")
async def purchase_suggestion(request: Request):
    """
    Genera el pedido sugerido por sala combinando cache (stock/tránsito) con
    ventas POS en tiempo real desde Odoo para el rango de fechas seleccionado.
    """
    token = request.headers.get("X-Token") or request.query_params.get("token", "")
    if token and "_" in token:
        username = token.split("_")[0]
        if token != f"{username}_{SECRET_TOKEN}":
            return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    date_from = (body.get("date_from") or "").strip()
    date_to   = (body.get("date_to")   or "").strip()
    wh_names       = body.get("warehouse_names", [])   # ["ALMACEN CENTRAL", ...]
    category_names  = body.get("category_names",  [])
    supplier_names  = body.get("supplier_names",  [])
    product_barcodes = body.get("product_barcodes", [])  # [] = sin filtro (de OC seleccionada)
    abc_coverage    = body.get("abc_coverage",    {})   # {"AA": 30, "A": 21, ...}

    if not date_from or not date_to:
        return JSONResponse({"error": "Se requieren date_from y date_to"}, status_code=400)

    try:
        from_dt = datetime.strptime(date_from, "%Y-%m-%d")
        to_dt   = datetime.strptime(date_to,   "%Y-%m-%d")
        days    = max(1, (to_dt - from_dt).days + 1)
    except ValueError:
        return JSONResponse({"error": "Formato de fecha inválido (YYYY-MM-DD)"}, status_code=400)

    # 1. Leer cache
    if not os.path.exists(CACHE_FILE):
        return JSONResponse({"error": "Cache no disponible"}, status_code=503)
    try:
        with open(CACHE_FILE, "r") as f:
            cache = json.load(f)
    except Exception as e:
        return JSONResponse({"error": f"Error leyendo cache: {e}"}, status_code=500)

    products_cache    = cache.get("products", [])
    warehouses_cache  = cache.get("warehouses", [])

    # 2. Mapear warehouse_names → objetos de warehouse del cache
    selected_whs = [wh for wh in warehouses_cache if wh.get("name") in wh_names]
    if not selected_whs:
        # Fallback: coincidencia parcial
        selected_whs = [wh for wh in warehouses_cache
                        if any(wh.get("name", "") in n for n in wh_names)]
    if not selected_whs:
        return JSONResponse({"error": "No se encontraron almacenes seleccionados en el cache"}, status_code=400)

    # 3. Filtrar productos por proveedor+fechas (desde PO cache) o barcodes explícitos
    products_list = products_cache

    # Si hay suppliers, derivar los barcodes del proveedor desde purchase_orders_cache.json.
    # IMPORTANTE: la fecha solo afecta las VENTAS (sales_by_wh). Los productos siempre se
    # incluyen usando TODO el historial del proveedor (sin filtro de fecha) para no perder
    # productos activos que no tuvieron PO exactamente en ese período.
    effective_barcodes: set = set()
    if supplier_names:
        po_cache_path = os.path.join(BASE_DIR, "purchase_orders_cache.json")
        try:
            with open(po_cache_path) as _f:
                po_data = json.load(_f)
            sup_set = set(s.strip() for s in supplier_names)
            date_filtered_barcodes: set = set()
            for _l in po_data.get("lines", []):
                if _l.get("supplier") in sup_set:
                    bc = _l.get("barcode") or ""
                    if bc:
                        effective_barcodes.add(bc)   # siempre acumula TODO el historial
                        d = (_l.get("date_order") or "")[:10]
                        if date_from <= d <= date_to:
                            date_filtered_barcodes.add(bc)
            logger.info(f"Barcodes proveedor: {len(date_filtered_barcodes)} en rango, {len(effective_barcodes)} total histórico")
        except Exception as _e:
            logger.warning(f"No se pudo leer PO cache para filtro de proveedor: {_e}")

    # Precios de proveedor y obtener todos los productos del proveedor
    supplier_price_by_pid: dict[int, dict] = {}
    supplier_price_by_tmpl: dict[int, dict] = {}
    
    # 4. Conectar a Odoo
    client = OdooClient()
    if not client.authenticate():
        return JSONResponse({"error": "No se pudo autenticar con Odoo"}, status_code=503)

    if supplier_names:
        try:
            # Usar ilike por cada nombre para tolerar espacios/variantes
            partner_ids_set: set = set()
            for sn in supplier_names:
                _ids = client.call_kw("res.partner", "search",
                    [[("name", "ilike", sn.strip())]], {}) or []
                partner_ids_set.update(_ids)
            partner_ids = list(partner_ids_set)
            if partner_ids:
                sup_info = client.call_kw(
                    "product.supplierinfo", "search_read",
                    [[("partner_id", "in", partner_ids)]],
                    {"fields": ["product_id", "product_tmpl_id", "price", "date_start", "write_date"], "order": "write_date desc", "limit": 50000}
                ) or []
                # Agrupar por product_id (variante) y product_tmpl_id (template)
                for si in sup_info:
                    price_val = float(si.get("price") or 0)
                    # Preferir date_start; si vacío usar write_date (fecha de última modificación)
                    date_val  = str(si.get("date_start") or si.get("write_date") or "")
                    # Truncar a solo la fecha (sin hora)
                    if "T" in date_val:
                        date_val = date_val[:10]
                    elif " " in date_val:
                        date_val = date_val[:10]
                    # Por variante
                    if si.get("product_id"):
                        _pid = si["product_id"][0]
                        if _pid not in supplier_price_by_pid:
                            supplier_price_by_pid[_pid] = {"price": price_val, "prev_price": 0.0, "date": date_val}
                        elif supplier_price_by_pid[_pid]["prev_price"] == 0.0:
                            supplier_price_by_pid[_pid]["prev_price"] = price_val
                    # Por template (fallback cuando product_id es False)
                    if si.get("product_tmpl_id"):
                        _tmpl = si["product_tmpl_id"][0]
                        if _tmpl not in supplier_price_by_tmpl:
                            supplier_price_by_tmpl[_tmpl] = {"price": price_val, "prev_price": 0.0, "date": date_val}
                        elif supplier_price_by_tmpl[_tmpl]["prev_price"] == 0.0:
                            supplier_price_by_tmpl[_tmpl]["prev_price"] = price_val
        except Exception as e:
            logger.warning(f"Error fetching supplier prices: {e}")

    # Filtrar products_list para incluir todos los productos del proveedor
    if supplier_names:
        n_before = len(products_list)
        products_list = [
            p for p in products_list 
            if (p.get("barcode") in effective_barcodes) or 
               (p.get("id") in supplier_price_by_pid) or 
               (p.get("product_tmpl_id") in supplier_price_by_tmpl)
        ]
        logger.info(f"Filtro proveedor: {n_before} → {len(products_list)} productos (barcodes={len(effective_barcodes)}, odoo_pid={len(supplier_price_by_pid)}, odoo_tmpl={len(supplier_price_by_tmpl)})")
    elif product_barcodes:
        bc_set = set(product_barcodes)
        products_list = [p for p in products_list if p.get("barcode") in bc_set]

    if category_names:
        n_before_cat = len(products_list)
        products_list = [p for p in products_list if p.get("category_name") in category_names]
        logger.info(f"Filtro categoría: {n_before_cat} → {len(products_list)} productos")

    # Índice product_id → producto del cache
    pid_to_product = {p["id"]: p for p in products_list if p.get("id")}

    # 5. Descubrir locaciones internas y de clientes para filtrar ventas reales (igual que en Traspasos)
    try:
        locations_int = client.call_kw("stock.location", "search_read", [[('usage', '=', 'internal')]], {"fields": ["id", "warehouse_id"]})
        customer_loc_ids = client.call_kw("stock.location", "search", [[('usage', '=', 'customer')]])
        internal_loc_ids = [l['id'] for l in locations_int]
        loc_to_wh = {l['id']: l['warehouse_id'][0] for l in locations_int if l.get('warehouse_id')}
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        return JSONResponse({"error": "No se pudieron obtener localizaciones de Odoo"}, status_code=500)

    # 6. Query de Ventas ÚNICA (stock.move.line: Interna -> Cliente)
    # Esto incluye POS + Ventas Mayoristas + Entregas Directas
    wh_ids = [wh["id"] for wh in selected_whs]
    sales_by_wh: dict[int, dict[int, float]] = {wh_id: {} for wh_id in wh_ids}
    try:
        domain_batch = [
            ("date", ">=", date_from + " 00:00:00"),
            ("date", "<=", date_to   + " 23:59:59"),
            ("state", "=", "done"),
            ("location_id", "in", internal_loc_ids),
            ("location_dest_id", "in", customer_loc_ids),
        ]
        result_batch = client.call_kw(
            "stock.move.line", "read_group",
            [domain_batch],
            {
                "fields": ["product_id", "quantity:sum", "location_id"],
                "groupby": ["location_id", "product_id"],
                "lazy": False,
            }
        ) or []
        for g in result_batch:
            lid_val = g.get("location_id")
            lid     = lid_val[0] if isinstance(lid_val, (list, tuple)) else lid_val
            wh_id   = loc_to_wh.get(lid)
            
            if wh_id in wh_ids:
                prod_val = g.get("product_id")
                pid_val  = prod_val[0] if isinstance(prod_val, (list, tuple)) else prod_val
                if wh_id and pid_val:
                    sales_by_wh[wh_id][pid_val] = sales_by_wh[wh_id].get(pid_val, 0) + float(g.get("quantity") or 0)
        logger.info(f"Sales batch query (SML): {len(result_batch)} groups for {len(wh_ids)} warehouses")
    except Exception as e:
        logger.warning(f"Batch Sales query failed ({e})")

    # (Precios de proveedor ya calculados arriba)

    # 7. Construir filas de respuesta
    def strip_code_prefix(s: str) -> str:
        return re.sub(r"^\[[^\]]*\]\s*", "", s or "")

    rows = []
    for p in products_list:
        pid       = p.get("id")
        if not pid:
            continue

        abc       = (p.get("abc_category") or "E").upper()
        cob_ideal = float(abc_coverage.get(abc) or 0)
        uom_pack_raw = float(p.get("uom_package") or 0)
        uom_pack     = uom_pack_raw if uom_pack_raw > 0 else 1.0  # 1.0 solo para cálculo interno

        per_wh     = {}
        total_sales = 0.0
        total_stock = 0.0
        total_sug   = 0.0
        has_activity = False

        for wh in selected_whs:
            wh_id     = wh["id"]
            wh_id_str = str(wh_id)
            sales_qty = float(sales_by_wh.get(wh_id, {}).get(pid, 0.0))
            stock     = float(p.get("stock_by_wh", {}).get(wh_id_str, 0.0))

            venta_diaria   = sales_qty / days if days > 0 else 0.0
            cob_actual     = (stock / venta_diaria) if venta_diaria > 0 else 999.0
            # Solo comprar si la cobertura está POR DEBAJO del objetivo (con tolerancia de 5 días).
            # Si el stock ya cubre el objetivo o más, la necesidad es 0.
            necesidad = max(0.0, (cob_ideal - cob_actual - 5) * venta_diaria)
            sugerido       = math.ceil(necesidad / uom_pack) * uom_pack if necesidad > 0 else 0.0

            # ABC específico por almacén si existe, sino global
            abc_info = p.get("abc_by_wh", {}).get(wh_id_str)
            if isinstance(abc_info, dict):
                wh_abc = (abc_info.get('cat') or abc).upper()
            else:
                wh_abc = (str(abc_info) if abc_info else abc).upper()

            stock_con_sugerido = stock + sugerido
            cob_con_sugerido = (stock_con_sugerido / venta_diaria) if venta_diaria > 0 else 999.0
            per_wh[wh["name"]] = {
                "abc":       wh_abc,
                "sales":     round(sales_qty, 4),
                "stock":     round(stock, 2),
                "sugerido":  int(sugerido),
                "cob_actual": round(cob_actual, 1) if cob_actual < 999 else 999,
                "cob_con_sugerido": round(cob_con_sugerido, 1) if cob_con_sugerido < 999 else 999,
            }
            total_sales += sales_qty
            total_stock += stock
            total_sug   += sugerido
            if sales_qty > 0 or stock > 0:
                has_activity = True

        # No saltar productos sin actividad, exportar todos los productos
        # if not has_activity and not effective_barcodes and not product_barcodes:
        #     continue

        stock_transito = sum(
            float(p.get("pending_by_wh", {}).get(str(wh["id"]), 0))
            for wh in selected_whs
        )

        tmpl_id    = p.get("product_tmpl_id") or 0
        price_info = supplier_price_by_pid.get(pid) or supplier_price_by_tmpl.get(tmpl_id) or {}
        precio_lista = float(price_info.get("price", 0))
        prev_price   = float(price_info.get("prev_price", 0))
        fecha_act    = price_info.get("date", "")
        total_sug_int = int(total_sug)
        sub_total    = round(precio_lista * total_sug_int, 2)

        barcode      = p.get("barcode") or ""
        full_name    = p.get("name") or ""
        clean_name   = strip_code_prefix(full_name)

        tags = [t for t in (p.get("tags") or []) if t and t != "Ninguno"]
        rows.append({
            "barcode":          barcode,
            "default_code":     p.get("default_code") or "False",
            "name":             clean_name,
            "full_name":        full_name,
            "tags":             tags,
            "uom_package":      int(uom_pack_raw),
            "abc":              abc,
            "per_wh":           per_wh,
            "stock_transito":   round(stock_transito, 2),
            "all_sales":        round(total_sales, 4),
            "all_stock":        round(total_stock, 2),
            "sugerido_total":   total_sug_int,
            "precio_lista":     precio_lista,
            "prev_price":       prev_price,
            "fecha_actualizada": fecha_act,
            "sub_total":        sub_total,
        })

    logger.info(f"/api/purchase-suggestion: {len(rows)} productos, {len(selected_whs)} salas, {days} días")
    return JSONResponse({
        "rows":       rows,
        "warehouses": [wh["name"] for wh in selected_whs],
        "days":       days,
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5176)
