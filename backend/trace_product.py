import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def trace_product():
    session = requests.Session()
    session.post(f"{ODOO_URL}/web/session/authenticate", json={"params": {"db": ODOO_DB, "login": ODOO_USER, "password": ODOO_PASS}})
    
    def call(model, method, args, kwargs={}):
        r = session.post(f"{ODOO_URL}/web/dataset/call_kw", json={"params": {"model": model, "method": method, "args": args, "kwargs": kwargs}})
        return r.json().get('result')

    # ACEITE FINO LIGHT (0.9L)
    p_ids = call("product.product", "search", [[('barcode', '=', '7773103000262')]])
    pid = p_ids[0]
    
    date_30_ago = (datetime.now() - timedelta(days=30)).replace(hour=0, minute=0, second=0).strftime('%Y-%m-%d %H:%M:%S')
    loc_int_ids = call("stock.location", "search", [[('usage', '=', 'internal')]])
    loc_cust_ids = call("stock.location", "search", [[('usage', '=', 'customer')]])
    
    domain_rot = [('product_id', '=', pid), ('date', '>=', date_30_ago), ('state', '=', 'done'), 
                  ('location_dest_id', 'in', loc_cust_ids), ('location_id', 'in', loc_int_ids)]
    
    rot_groups = call("stock.move.line", "read_group", [domain_rot, ['product_id', 'location_id', 'quantity:sum'], ['product_id', 'location_id']], {"lazy": False})
    
    print(f"Read Group segments: {len(rot_groups or [])}")
    total_rot = 0
    if rot_groups:
        for g in rot_groups:
            total_rot += g['quantity']
    print(f"Sum of Rot Groups: {total_rot}")

    # POS Orders
    orders = call("pos.order", "search_read", [[('date_order', '>=', date_30_ago)]], {"fields": ["id"]})
    order_ids = [o['id'] for o in (orders or [])]
    # Filter lines for our product
    rev_lines = []
    if order_ids:
        # Batched to avoid long URI
        batch_size = 500
        for i in range(0, len(order_ids), batch_size):
            batch = order_ids[i:i+batch_size]
            res = call("pos.order.line", "search_read", [[('order_id', 'in', batch), ('product_id', '=', pid)]], {"fields": ["qty", "order_id"]})
            rev_lines.extend(res or [])
            
    print(f"POS Lines Count for this product: {len(rev_lines)}")
    pos_qty = sum(l['qty'] for l in rev_lines)
    print(f"POS Qty Sum: {pos_qty}")

if __name__ == "__main__":
    trace_product()
