import xmlrpc.client
import os

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_pos():
    product_id = 267 
    lines = models.execute_kw(db, uid, password, 'pos.order.line', 'search_read', [
        [('product_id', '=', product_id), ('create_date', '>=', '2025-12-18 00:00:00'), ('create_date', '<=', '2025-12-18 23:59:59')]
    ], {
        'fields': ['qty', 'order_id', 'create_date'],
        'order': 'qty desc'
    })
    
    total = 0
    print(f"POS Results for Dec 18th (Product ID {product_id}):")
    for l in lines:
        total += l['qty']
        print(f"Date: {l['create_date']} | Qty: {l['qty']} | Order: {l['order_id'][1]}")
    print(f"Total POS for Dec 18th: {total}")

if __name__ == "__main__":
    check_pos()
