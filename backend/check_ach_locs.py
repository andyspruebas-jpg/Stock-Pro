import requests
import json

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def check_locs():
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

    locs = call("stock.location", "search_read", [[('complete_name', 'ilike', 'ACH/')]], {"fields": ["id", "complete_name", "warehouse_id"]})
    for l in locs:
        print(f"Loc: {l['complete_name']} (ID: {l['id']}) Warehouse: {l['warehouse_id']}")

if __name__ == "__main__":
    check_locs()
