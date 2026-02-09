import xmlrpc.client
import ssl
import json

# Odoo Connection Details
url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

# Setup SSL context
context = ssl._create_unverified_context()

# Authenticate
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common', context=context)
uid = common.authenticate(db, username, password, {})
print(f"Authenticated with UID: {uid}")

models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object', context=context)

# 1. Find the Product ID for "CARNE X GANCHO"
print("\n--- Searching for Product 'CARNE X GANCHO' ---")
products = models.execute_kw(db, uid, password, 'product.product', 'search_read',
    [[('name', 'ilike', 'CARNE X GANCHO')]],
    {'fields': ['id', 'name', 'barcode', 'default_code', 'uom_id']}
)

if not products:
    print("Product not found!")
    exit()

product = products[0]
pid = product['id']
print(f"Found Product: {product['name']} (ID: {pid})")

# 2. Check stock.move.line to confirm the 9619 rotation
print("\n--- Checking Stock Moves (Last 90 days) ---")
moves = models.execute_kw(db, uid, password, 'stock.move.line', 'search_read',
    [[('product_id', '=', pid), ('state', '=', 'done'), 
      ('location_dest_id.complete_name', 'ilike', 'CUSTOME'),
      ('reference', 'ilike', 'POS')]],
    {'fields': ['date', 'qty_done', 'reference', 'location_dest_id'], 'limit': 10}
)

if not moves:
    print("No POS stock moves found!")
else:
    print(f"Found {len(moves)} sample moves.")
    for m in moves:
        print(f"  Date: {m['date']}, Qty: {m['qty_done']}, Ref: {m['reference']}")

# 3. Check pos.order.line for REVENUE
print("\n--- Checking POS Order Lines (Revenue) ---")
pos_lines = models.execute_kw(db, uid, password, 'pos.order.line', 'search_read',
    [[('product_id', '=', pid)]],
    {'fields': ['create_date', 'qty', 'price_unit', 'price_subtotal_incl', 'order_id'], 'limit': 10}
)

if not pos_lines:
    print("!!! NO POS LINES FOUND FOR THIS PRODUCT ID !!!")
else:
    print(f"Found {len(pos_lines)} POS lines. Sample:")
    for pl in pos_lines:
        print(f"  Date: {pl['create_date']}, Qty: {pl['qty']}, Price: {pl['price_unit']}, Total: {pl['price_subtotal_incl']}")
