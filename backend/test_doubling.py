import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def test_read_group_doubling():
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

    # ACEITE FINO LIGHT (0.9L)
    p_ids = call("product.product", "search", [[('barcode', '=', '7773103000262')]])
    pid = p_ids[0]
    
    date_30_ago = (datetime.now() - timedelta(days=30)).replace(hour=0, minute=0, second=0).strftime('%Y-%m-%d %H:%M:%S')
    loc_int_ids = call("stock.location", "search", [[('usage', '=', 'internal')]])
    loc_cust_ids = call("stock.location", "search", [[('usage', '=', 'customer')]])
    
    domain = [
        ('product_id', '=', pid),
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'),
        ('location_id', 'in', loc_int_ids),
        ('location_dest_id', 'in', loc_cust_ids)
    ]
    
    # 1. search_read
    lines = call("stock.move.line", "search_read", [domain], {"fields": ["quantity"]})
    print(f"Search Read Count: {len(lines)}")
    print(f"Search Read Sum: {sum(l['quantity'] for l in lines)}")
    
    # 2. read_group
    groups = call("stock.move.line", "read_group", [domain, ['product_id', 'quantity:sum'], ['product_id']], {"lazy": False})
    if groups:
        print(f"Read Group Sum: {groups[0]['quantity']}")
    else:
        print("Read Group: No results")

if __name__ == "__main__":
    test_read_group_doubling()
