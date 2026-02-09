import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def test_rev():
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

    date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    
    # 1. Check if we can find pos.orders in the last 30 days
    orders = call("pos.order", "search_read", [[('date_order', '>=', date_30_ago)]], {"fields": ["id", "picking_type_id"], "limit": 10})
    print("POS Orders found:", len(orders) if orders else 0)
    if orders:
        print("Order sample:", orders[0])
        
    # 2. Check pos.order.line query with order_id.picking_type_id
    # Get all picking type IDs from orders to be sure
    pt_ids = list(set([o['picking_type_id'][0] for o in orders if o.get('picking_type_id')]))
    print("PT IDs to test:", pt_ids)
    
    if pt_ids:
        domain = [('create_date', '>=', date_30_ago), ('order_id.picking_type_id', 'in', pt_ids)]
        res = call("pos.order.line", "read_group", 
                   [domain, ['product_id', 'order_id.picking_type_id', 'qty:sum'], ['product_id', 'order_id.picking_type_id']], {"lazy": False})
        print("Query with order_id.picking_type_id result:", len(res) if res else "None")
        if res and len(res) > 0:
            print("First item:", res[0])
            
        # 3. Try with order_id.session_id.config_id.picking_type_id if previous failed
        domain2 = [('create_date', '>=', date_30_ago)]
        res2 = call("pos.order.line", "read_group", 
                    [domain2, ['product_id', 'qty:sum'], ['product_id']], {"lazy": False, "limit": 5})
        print("Simple query result:", len(res2) if res2 else "None")

if __name__ == "__main__":
    test_rev()
