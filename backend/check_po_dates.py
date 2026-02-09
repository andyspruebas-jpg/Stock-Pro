
import requests
import json
from datetime import datetime

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def test_po_dates():
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
    if response.json().get("error"):
        print("Auth failed")
        return

    # Fetch some pending POs
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "purchase.order",
            "method": "search_read",
            "args": [[('state', 'in', ['draft', 'sent', 'purchase'])]],
            "kwargs": {"fields": ["name", "date_order", "date_approve", "create_date"], "limit": 10}
        },
        "id": 1
    }
    response = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
    pos = response.json().get("result", [])
    
    print(f"Found {len(pos)} pending orders")
    for po in pos:
        print(f"PO: {po['name']}, State: {po.get('state')}")
        print(f"  date_order: {po['date_order']}")
        print(f"  date_approve: {po.get('date_approve')}")
        print(f"  create_date: {po.get('create_date')}")

if __name__ == "__main__":
    test_po_dates()
