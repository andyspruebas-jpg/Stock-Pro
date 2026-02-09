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
    product_id = 267 
    moves = models.execute_kw(db, uid, password, 'stock.move', 'search_read', [
        [('product_id', '=', product_id), ('state', '=', 'done'), ('date', '>=', '2025-12-18 00:00:00'), ('date', '<=', '2025-12-18 23:59:59')]
    ], {
        'fields': ['location_id', 'location_dest_id', 'product_uom_qty', 'date', 'reference'],
        'order': 'product_uom_qty desc'
    })
    
    total = 0
    print(f"Results for Dec 18th (Product ID {product_id}):")
    for m in moves:
        total += m['product_uom_qty']
        loc_from = m['location_id'][1]
        loc_to = m['location_dest_id'][1]
        print(f"Date: {m['date']} | Qty: {m['product_uom_qty']} | From: {loc_from} | To: {loc_to} | Ref: {m['reference']}")
    print(f"Total for Dec 18th: {total}")

if __name__ == "__main__":
    check_moves()
