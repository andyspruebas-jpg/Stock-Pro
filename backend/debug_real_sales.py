import xmlrpc.client
import os

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_sales_only():
    product_id = 267 
    moves = models.execute_kw(db, uid, password, 'stock.move', 'search_read', [
        [('product_id', '=', product_id), ('state', '=', 'done'), 
         ('date', '>=', '2025-11-24 00:00:00'), ('date', '<=', '2025-12-24 23:59:59'),
         ('location_dest_id.usage', '=', 'customer')]
    ], {
        'fields': ['product_uom_qty', 'date', 'reference'],
        'limit': 2000
    })
    
    total = sum(m['product_uom_qty'] for m in moves)
    print(f"Total REAL sales (to customer) last 30 days: {total}")
    print(f"Number of sale records: {len(moves)}")

if __name__ == "__main__":
    check_sales_only()
