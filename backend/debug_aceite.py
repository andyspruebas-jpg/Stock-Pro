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

def main():
    client = OdooClient()
    client.authenticate()
    
    # Target: ACEITE FINO LIGHT (0.9L) (ID 250)
    pid = 250
    product_name = "ACEITE FINO LIGHT (0.9L)"
    print(f"Product: {product_name} (ID: {pid})")
    
    date_30_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    
    # 1. Total POS Sales
    pos_lines = client.call_kw("pos.order.line", "read_group",
                               [[('product_id', '=', pid), ('create_date', '>=', date_30_days_ago)],
                                ['qty:sum'], ['product_id']])
    pos_qty = pos_lines[0]['qty'] if pos_lines else 0
    print(f"POS Sales Qty (30d): {pos_qty}")
    
    # 2. Total Stock Moves (Internal -> Customer)
    move_lines = client.call_kw("stock.move.line", "read_group",
                                [
                                    [('product_id', '=', pid), ('date', '>=', date_30_days_ago), 
                                     ('state', '=', 'done'), ('location_dest_id.usage', '=', 'customer')],
                                    ['quantity:sum'], ['product_id']
                                ])
    move_qty = move_lines[0]['quantity'] if move_lines else 0
    print(f"Stock Move Lines Qty (Internal -> Customer) (30d): {move_qty}")
    
    # 3. Internal Transfers from 'Existencias' to 'Existencias'
    # This is what I want to count as "Venta" (Salida de Sala)
    transfers = client.call_kw("stock.move.line", "read_group",
                                [
                                    [('product_id', '=', pid), ('date', '>=', date_30_days_ago), 
                                     ('state', '=', 'done'), 
                                     ('location_id.complete_name', 'ilike', '/Existencias'),
                                     ('location_dest_id.complete_name', 'ilike', '/Existencias')],
                                    ['quantity:sum'], 
                                    ['location_id', 'location_dest_id']
                                ],
                                {"lazy": False})
    
    transfer_qty = 0
    if transfers:
        for t in transfers:
            q = t['quantity']
            loc_from = t['location_id'][1]
            loc_to = t['location_dest_id'][1]
            # Verify if warehouses are different by checking prefix (e.g. ACH/ vs OBR/)
            wh_from = loc_from.split('/')[0]
            wh_to = loc_to.split('/')[0]
            
            if wh_from != wh_to:
                print(f"Inter-store Transfer: {q} from {loc_from} to {loc_to}")
                transfer_qty += q
            else:
                print(f"Internal Warehouse move (IGNORED): {q} from {loc_from} to {loc_to}")
    
    # 4. ALL moves out of Existencias
    all_out = client.call_kw("stock.move.line", "read_group",
                                [
                                    [('product_id', '=', pid), ('date', '>=', date_30_days_ago), 
                                     ('state', '=', 'done'), 
                                     ('location_id.complete_name', 'ilike', '/Existencias')],
                                    ['quantity:sum'], 
                                    ['location_dest_id']
                                ],
                                {"lazy": False})
    
    print("\nAll Outgoing moves from 'Existencias' (30d):")
    total_out = 0
    if all_out:
        for m in all_out:
            q = m['quantity']
            loc_to = m['location_dest_id'][1] if m.get('location_dest_id') else "Unknown"
            print(f"To: {loc_to} | Qty: {q}")
            total_out += q
    print(f"Total Outgoing from Existencias: {total_out}")

if __name__ == "__main__":
    main()
