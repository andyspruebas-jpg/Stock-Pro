import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

class OdooClient:
    def __init__(self):
        self.session = requests.Session()
        self.url = ODOO_URL

    def authenticate(self):
        payload = {
            "jsonrpc": "2.0",
            "params": {
                "db": ODOO_DB,
                "login": ODOO_USER,
                "password": ODOO_PASS
            }
        }
        res = self.session.post(f"{self.url}/web/session/authenticate", json=payload)
        return res.json()

    def call_kw(self, model, method, args=None, kwargs=None):
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "model": model,
                "method": method,
                "args": args or [],
                "kwargs": kwargs or {}
            }
        }
        res = self.session.post(f"{self.url}/web/dataset/call_kw", json=payload)
        return res.json().get("result")

def test_user_filter(client, pid, name):
    print(f"\n--- Testing Product: {name} (ID: {pid}) ---")
    
    # User filter from screenshot:
    # 1. Location dest contains "CUSTOME"
    # 2. Reference contains "POS"
    # 3. State is "done" (implied by "Historial de movimientos" typically showing realized moves)
    # 4. Period: last 30 days
    
    date_30_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    
    domain = [
        ('product_id', '=', pid),
        ('date', '>=', date_30_days_ago),
        ('state', '=', 'done'),
        ('location_dest_id.complete_name', 'ilike', 'CUSTOME'),
        ('reference', 'ilike', 'POS')
    ]
    
    # Get grouped by source location to match the screenshot breakdown
    groups = client.call_kw("stock.move.line", "read_group",
                           [domain, ['quantity:sum', 'location_id'], ['location_id']],
                           {"lazy": False})
    
    total_qty = 0
    print("Breakdown by source location:")
    for g in groups:
        qty = g['quantity']
        loc = g['location_id'][1] if g.get('location_id') else "Unknown"
        print(f" - {loc}: {qty}")
        total_qty += qty
    
    print(f"TOTAL for {name}: {total_qty}")

def main():
    client = OdooClient()
    client.authenticate()
    
    # 1. ACEITE FINO LIGHT (0.9L) - User expects 141
    test_user_filter(client, 250, "ACEITE FINO LIGHT (0.9L)")
    
    # 2. ACEITE FINO VEGETAL (0.9L) - User expects 1379
    test_user_filter(client, 267, "ACEITE FINO VEGETAL (0.9L)")

if __name__ == "__main__":
    main()
