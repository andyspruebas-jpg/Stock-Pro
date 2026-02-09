import xmlrpc.client
import os

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_moves():
    product_id = 267 # ACEITE FINO VEGETAL (0.9L)
    moves = models.execute_kw(db, uid, password, 'stock.move', 'search_read', [
        [('product_id', '=', product_id), ('state', '=', 'done')]
    ], {
        'fields': ['location_id', 'location_dest_id', 'product_uom_qty', 'date', 'reference'],
        'limit': 50,
        'order': 'date desc'
    })
    
    print(f"Results for Product ID {product_id}:")
    for m in moves:
        loc_from = m['location_id'][1]
        loc_to = m['location_dest_id'][1]
        print(f"Date: {m['date']} | Qty: {m['product_uom_qty']} | From: {loc_from} | To: {loc_to} | Ref: {m['reference']}")

if __name__ == "__main__":
    check_moves()
