import requests
import json

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def check():
    session = requests.Session()
    session.post(f"{ODOO_URL}/web/session/authenticate", json={
        "jsonrpc": "2.0",
        "params": {"db": ODOO_DB, "login": ODOO_USER, "password": ODOO_PASS}
    })
    
    res = session.post(f"{ODOO_URL}/web/dataset/call_kw", json={
        "jsonrpc": "2.0", "method": "call", "id": 1,
        "params": {
            "model": "purchase.order.line", "method": "search_read",
            "args": [[('state', '=', 'purchase')]],
            "kwargs": {"fields": ["id", "state"], "limit": 5}
        }
    }).json().get('result')
    print("Confirmed orders sample:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    check()
