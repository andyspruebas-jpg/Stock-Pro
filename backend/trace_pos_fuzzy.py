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

# Search for POS orders with similar names
search_pattern = "00012"
print(f"Searching for POS Order containing: {search_pattern}")

pos_orders = models.execute_kw(db, uid, password, 'pos.order', 'search_read',
    [[('name', 'ilike', search_pattern)]],
    {'fields': ['id', 'name', 'lines'], 'limit': 5}
)

if pos_orders:
    for order in pos_orders:
        print(f"Found Order: {order['name']} (ID: {order['id']})")
        lines_ids = order['lines']
        if lines_ids:
            lines_data = models.execute_kw(db, uid, password, 'pos.order.line', 'read',
                [lines_ids],
                {'fields': ['product_id', 'full_product_name', 'qty', 'price_subtotal_incl']}
            )
            for l in lines_data:
                print(f"  - Product: {l['product_id'][1]} (ID: {l['product_id'][0]})")
                print(f"    Qty: {l['qty']}, Rev: {l['price_subtotal_incl']}")
else:
    print("No orders found.")
