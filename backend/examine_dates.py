
import requests
import json
from datetime import datetime

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def examine_dates():
    session = requests.Session()
    payload = {
        "jsonrpc": "2.0",
        "params": {
            "db": ODOO_DB,
            "login": ODOO_USER,
            "password": ODOO_PASS
        }
    }
    session.post(f"{ODOO_URL}/web/session/authenticate", json=payload)
    
    # search pending PO lines
    po_domain = [('state', 'in', ['draft', 'sent', 'purchase'])]
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "purchase.order.line",
            "method": "search_read",
            "args": [po_domain],
            "kwargs": {"fields": ["product_id", "order_id", "date_planned"], "limit": 20}
        },
        "id": 1
    }
    response = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
    lines = response.json().get("result", [])
    
    order_ids = list(set([l['order_id'][0] for l in lines]))
    
    # fetch orders
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "purchase.order",
            "method": "read",
            "args": [order_ids],
            "kwargs": {"fields": ["name", "date_order", "date_approve", "create_date"]}
        },
        "id": 1
    }
    response = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
    orders = {o['id']: o for o in response.json().get("result", [])}
    
    print(f"{'PO Name':<10} | {'State':<10} | {'Create Date (Ordered)':<20} | {'Date Approve':<20} | {'Date Order (Deadline)':<20} | {'Line Planned (Arrival)':<20}")
    print("-" * 110)
    
    for l in lines:
        oid = l['order_id'][0]
        o = orders.get(oid, {})
        
        c_date = o.get('create_date', '')
        a_date = o.get('date_approve', '')
        d_order = o.get('date_order', '')
        l_planned = l.get('date_planned', '')
        
        print(f"{o.get('name') or '':<10} | {o.get('state') or '':<10} | {str(c_date):<20} | {str(a_date):<20} | {str(d_order):<20} | {str(l_planned):<20}")

if __name__ == "__main__":
    examine_dates()
