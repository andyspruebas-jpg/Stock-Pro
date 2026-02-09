
import requests
import json
import xmlrpc.client

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def debug_order(order_name):
    print(f"DEBUGGING ORDER: {order_name}")
    
    # 1. XML-RPC Connection
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
    models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')
    
    # 2. Search for the order
    order_ids = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'purchase.order', 'search', [[['name', '=', order_name]]])
    
    if not order_ids:
        print(f"❌ Order {order_name} NOT FOUND with XML-RPC search.")
        return

    print(f"✅ Order found! ID: {order_ids[0]}")
    
    # 3. Read Order Details
    fields = ['name', 'state', 'date_approve', 'date_order', 'create_date', 'partner_id']
    order_data = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'purchase.order', 'read', [order_ids], {'fields': fields})
    
    for o in order_data:
        print("\n--- ORDER DETAILS ---")
        print(f"Name: {o.get('name')}")
        print(f"State: {o.get('state')}")
        print(f"Create Date: {o.get('create_date')}")
        print(f"Date Approve: {o.get('date_approve')}")
        print(f"Date Order (Deadline): {o.get('date_order')}")
        print(f"Partner: {o.get('partner_id')}")

if __name__ == "__main__":
    # Test with one of the orders visible in the screenshot
    debug_order("P25596")
    debug_order("P25595")
    debug_order("P25594")
    debug_order("P25593")
