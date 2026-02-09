
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

def investigate_aceite():
    # Find Aceite Fino Vegetal (0.9L)
    products = models.execute_kw("ati", uid, "7474", 'product.product', 'search_read', 
                                [[('barcode', '=', '7773103803894')]], {'fields': ['id', 'name']})
    if not products:
        print("Product not found")
        return
    
    pid = products[0]['id']
    name = products[0]['name']
    print(f"Product: {name} (ID: {pid})")
    
    domain = [
        ('product_id', '=', pid),
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'),
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    
    moves = models.execute_kw("ati", uid, "7474", 'stock.move.line', 'search_read', [domain], 
                             {'fields': ['quantity', 'qty_done', 'date', 'reference']})
    
    total_quantity = sum(m.get('quantity', 0) for m in moves)
    total_qty_done = sum(m.get('qty_done', 0) for m in moves)
    record_count = len(moves)
    
    print(f"Moves found: {record_count}")
    print(f"Sum of 'quantity': {total_quantity}")
    print(f"Sum of 'qty_done': {total_qty_done}")
    
    if moves:
        print(f"Sample move: {moves[0]}")

investigate_aceite()
