import requests
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
        payload = {"jsonrpc": "2.0", "params": {"db": ODOO_DB, "login": ODOO_USER, "password": ODOO_PASS}}
        return self.session.post(f"{self.url}/web/session/authenticate", json=payload).json()

    def call_kw(self, model, method, args, kwargs={}):
        payload = {"jsonrpc": "2.0", "method": "call", "params": {"model": model, "method": method, "args": args, "kwargs": kwargs}}
        return self.session.post(f"{self.url}/web/dataset/call_kw", json=payload).json().get("result")

def main():
    client = OdooClient()
    client.authenticate()
    
    barcode = "7773103000064" # ACEITE FINO VEGETAL (0.9L)
    product = client.call_kw("product.product", "search_read", [[("barcode", "=", barcode)]], {"fields": ["id", "name"]})
    if not product:
        print("Product not found")
        return
    
    pid = product[0]["id"]
    print(f"Product: {product[0]['name']} (ID: {pid})")
    
    date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    
    # Check POS
    pos_lines = client.call_kw("pos.order.line", "search_read", 
                              [[("product_id", "=", pid), ("create_date", ">=", date_30_ago)]],
                              {"fields": ["qty", "create_date"]})
    pos_qty = sum(l["qty"] for l in pos_lines)
    print(f"POS Sales (30d): {pos_qty} across {len(pos_lines)} lines")
    
    # Check SO
    so_lines = client.call_kw("sale.order.line", "search_read", 
                             [[("product_id", "=", pid), ("create_date", ">=", date_30_ago), ("state", "in", ["sale", "done"])]],
                             {"fields": ["product_uom_qty", "create_date"]})
    so_qty = sum(l["product_uom_qty"] for l in so_lines)
    print(f"SO Sales (30d): {so_qty} across {len(so_lines)} lines")
    
    # Check POS lines total count for last 30 days globally
    total_pos_30 = client.call_kw("pos.order.line", "search_count", [[("create_date", ">=", date_30_ago)]])
    print(f"Total POS lines in Odoo (30d): {total_pos_30}")

if __name__ == "__main__":
    main()
