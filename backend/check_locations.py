import requests
import json

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def check():
    session = requests.Session()
    payload = {
        "jsonrpc": "2.0",
        "params": {
            "db": ODOO_DB,
            "login": ODOO_USER,
            "password": ODOO_PASS
        }
    }
    response = session.post(f"{ODOO_URL}/web/session/authenticate", json=payload)
    
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "stock.location",
            "method": "search_read",
            "args": [[('usage', '=', 'internal')]],
            "kwargs": {"fields": ["id", "name", "complete_name", "display_name"]}
        },
        "id": 1
    }
    response = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
    print(json.dumps(response.json().get('result'), indent=2))

if __name__ == "__main__":
    check()
