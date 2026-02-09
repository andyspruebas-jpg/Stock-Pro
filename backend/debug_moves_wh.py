import xmlrpc.client
import os

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_moves_wh():
    product_id = 267 
    moves = models.execute_kw(db, uid, password, 'stock.move', 'search_read', [
        [('product_id', '=', product_id), ('state', '=', 'done'), ('date', '>=', '2025-11-24 00:00:00')]
    ], {
        'fields': ['warehouse_id', 'product_uom_qty', 'location_dest_id'],
        'limit': 100
    })
    
    no_wh = 0
    with_wh = 0
    for m in moves:
        if m.get('warehouse_id'):
            with_wh += 1
        else:
            no_wh += 1
    
    print(f"Moves with WH: {with_wh} | Without WH: {no_wh}")

if __name__ == "__main__":
    check_moves_wh()
