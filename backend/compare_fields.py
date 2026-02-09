
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def compare_fields():
    domain = [
        ('product_id', '=', 267), 
        ('state', '=', 'done'), 
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    moves = models.execute_kw("ati", uid, "7474", 'stock.move.line', 'search_read', 
                             [domain], 
                             {'fields': ['quantity', 'qty_done'], 'limit': 100})
    
    diffs = [m for m in moves if m.get('quantity') != m.get('qty_done')]
    print(f"Moves with differences: {len(diffs)}")
    if moves:
        print(f"Example - Quantity: {moves[0].get('quantity')}, Qty Done: {moves[0].get('qty_done')}")

compare_fields()
