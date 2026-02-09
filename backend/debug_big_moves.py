import xmlrpc.client
import os

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_big_moves():
    product_id = 267 
    moves = models.execute_kw(db, uid, password, 'stock.move', 'search_read', [
        [('product_id', '=', product_id), ('state', '=', 'done'), ('date', '>=', '2025-12-18 00:00:00'), ('date', '<=', '2025-12-18 23:59:59')]
    ], {
        'fields': ['product_uom_qty', 'reference', 'location_dest_id'],
        'order': 'product_uom_qty desc',
        'limit': 10
    })
    
    for m in moves:
        print(f"Qty: {m['product_uom_qty']} | Ref: {m['reference']} | To: {m['location_dest_id'][1]}")

if __name__ == "__main__":
    check_big_moves()
