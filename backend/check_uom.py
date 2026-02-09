
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_uom():
    # Aceite Fino Vegetal
    products = models.execute_kw("ati", uid, "7474", 'product.product', 'read', [267], {'fields': ['uom_id']})
    print(f"Product UoM: {products[0]['uom_id']}")
    
    # Check moves UoM
    domain = [
        ('product_id', '=', 267), 
        ('state', '=', 'done'), 
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    moves = models.execute_kw("ati", uid, "7474", 'stock.move.line', 'search_read', 
                             [domain], 
                             {'fields': ['product_uom_id', 'quantity'], 'limit': 10})
    for m in moves:
        print(f"Move Quantity: {m['quantity']}, Move UoM: {m['product_uom_id']}")

check_uom()
