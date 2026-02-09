
import requests
import json

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def check_fields():
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
            "model": "purchase.order",
            "method": "fields_get",
            "args": [],
            "kwargs": {"attributes": ["string", "help"]}
        },
        "id": 1
    }
    response = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
    fields = response.json().get("result", {})
    
    for f in ["date_order", "date_approve", "create_date", "date_planned"]:
        if f in fields:
            print(f"{f}: {fields[f].get('string')} - {fields[f].get('help')}")

if __name__ == "__main__":
    check_fields()
