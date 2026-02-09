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
    
    # Check all pending purchase lines
    res = session.post(f"{ODOO_URL}/web/dataset/call_kw", json={
        "jsonrpc": "2.0", "method": "call", "id": 1,
        "params": {
            "model": "purchase.order.line", "method": "search_read",
            "args": [[('state', 'in', ['purchase', 'to approve']), ('qty_received', '<', 'product_qty')]],
            "kwargs": {"fields": ["product_id", "product_qty", "qty_received", "state"], "limit": 10}
        }
    }).json().get('result')
    print("Pending Purchase Lines (Confirmed):")
    print(json.dumps(res, indent=2))

    # Check draft purchase lines
    res = session.post(f"{ODOO_URL}/web/dataset/call_kw", json={
        "jsonrpc": "2.0", "method": "call", "id": 1,
        "params": {
            "model": "purchase.order.line", "method": "search_read",
            "args": [[('state', 'in', ['draft', 'sent']), ('product_qty', '>', 0)]],
            "kwargs": {"fields": ["product_id", "product_qty", "qty_received", "state"], "limit": 10}
        }
    }).json().get('result')
    print("\nPending Purchase Lines (Draft/Sent):")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    check()
