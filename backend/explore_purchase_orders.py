import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def explore_purchase_orders():
    session = requests.Session()
    session.post(f"{ODOO_URL}/web/session/authenticate", json={"params": {"db": ODOO_DB, "login": ODOO_USER, "password": ODOO_PASS}})
    
    def call(model, method, args, kwargs={}):
        r = session.post(f"{ODOO_URL}/web/dataset/call_kw", json={"params": {"model": model, "method": method, "args": args, "kwargs": kwargs}})
        return r.json().get('result')

    # Explore purchase.order model
    print("=== PURCHASE ORDER STATES ===")
    
    # Get RFQ (Request for Quotation) - state = 'draft' or 'sent'
    rfq_domain = [('state', 'in', ['draft', 'sent'])]
    rfqs = call("purchase.order", "search_read", [rfq_domain], {"fields": ["name", "partner_id", "state", "date_order", "amount_total", "picking_type_id"], "limit": 10})
    
    print(f"\nRFQs found: {len(rfqs)}")
    if rfqs:
        print("Sample RFQ:")
        print(json.dumps(rfqs[0], indent=2))
    
    # Get all states
    all_orders = call("purchase.order", "search_read", [[]], {"fields": ["state"], "limit": 1000})
    states = set(o['state'] for o in all_orders if o.get('state'))
    print(f"\nAll states found: {states}")
    
    # Get purchase order lines for a specific product
    print("\n=== PURCHASE ORDER LINES ===")
    # Find a product
    products = call("product.product", "search_read", [[('barcode', '=', '7773103000262')]], {"fields": ["id", "display_name"]})
    if products:
        pid = products[0]['id']
        print(f"Testing with product: {products[0]['display_name']}")
        
        # Get PO lines for this product
        po_lines = call("purchase.order.line", "search_read", 
                       [[('product_id', '=', pid), ('order_id.state', 'in', ['draft', 'sent', 'purchase'])]], 
                       {"fields": ["order_id", "product_id", "product_qty", "price_unit", "date_planned"], "limit": 5})
        
        print(f"PO Lines found: {len(po_lines)}")
        if po_lines:
            print("Sample PO Line:")
            print(json.dumps(po_lines[0], indent=2))

if __name__ == "__main__":
    explore_purchase_orders()
