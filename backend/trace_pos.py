import xmlrpc.client
import ssl

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"
context = ssl._create_unverified_context()
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common', context=context)
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object', context=context)

# Check a specific order from the debug output
ref = "OBR/POS/00012"
print(f"Investigating POS Order Ref: {ref}")

pos_orders = models.execute_kw(db, uid, password, 'pos.order', 'search_read',
    [[('name', '=', ref)]],
    {'fields': ['id', 'name', 'lines']}
)

if pos_orders:
    order = pos_orders[0]
    lines_ids = order['lines']
    if lines_ids:
        lines_data = models.execute_kw(db, uid, password, 'pos.order.line', 'read',
            [lines_ids],
            {'fields': ['product_id', 'full_product_name', 'qty', 'price_subtotal_incl']}
        )
        print("Lines in this order:")
        for l in lines_data:
            print(f"  - Product: {l['product_id'][1]} (ID: {l['product_id'][0]})")
            print(f"    Qty: {l['qty']}, Rev: {l['price_subtotal_incl']}")
else:
    print("Order not found.")
