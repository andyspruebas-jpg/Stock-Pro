import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def debug_product():
    session = requests.Session()
    payload = {
        "jsonrpc": "2.0",
        "params": {
            "db": ODOO_DB, "login": ODOO_USER, "password": ODOO_PASS
        }
    }
    session.post(f"{ODOO_URL}/web/session/authenticate", json=payload)
    
    def call(model, method, args, kwargs={}):
        payload = {
            "jsonrpc": "2.0", "method": "call",
            "params": { "model": model, "method": method, "args": args, "kwargs": kwargs }
        }
        r = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
        return r.json().get('result')

    # Find product ID for ACEITE FINO LIGHT (0.9L)
    p_ids = call("product.product", "search", [[('barcode', '=', '7773103000262')]])
    if not p_ids:
        print("Product not found")
        return
    pid = p_ids[0]
    print(f"Product ID: {pid}")

    date_30_ago = (datetime.now() - timedelta(days=30)).replace(hour=0, minute=0, second=0).strftime('%Y-%m-%d %H:%M:%S')
    
    # Internal & Customer locs
    loc_int_ids = call("stock.location", "search", [[('usage', '=', 'internal')]])
    loc_cust_ids = call("stock.location", "search", [[('usage', '=', 'customer')]])
    
    # Get move lines
    domain = [
        ('product_id', '=', pid),
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'),
        ('location_id', 'in', loc_int_ids),
        ('location_dest_id', 'in', loc_cust_ids)
    ]
    lines = call("stock.move.line", "search_read", [domain], {"fields": ["id", "date", "reference", "location_id", "location_dest_id", "quantity"]})
    
    print(f"Total lines found: {len(lines)}")
    total_qty = sum(l['quantity'] for l in lines)
    print(f"Total Qty: {total_qty}")
    
    for l in lines[:10]:
        print(f"Line: {l['date']} {l['reference']} Qty: {l['quantity']} From: {l['location_id'][1]}")

if __name__ == "__main__":
    debug_product()
