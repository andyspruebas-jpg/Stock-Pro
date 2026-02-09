
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
pid = 267

def investigate_moves():
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
    
    print(f"Product ID 267 - 30 days")
    print(f"Moves found: {record_count}")
    print(f"Sum of 'quantity': {total_quantity}")
    print(f"Sum of 'qty_done': {total_qty_done}")
    
    # Check if any move has quantity > 1
    large_moves = [m for m in moves if m.get('quantity', 0) > 1 or m.get('qty_done', 0) > 1]
    print(f"Moves with quantity > 1: {len(large_moves)}")
    if large_moves:
        print(f"Sample large move: {large_moves[0]}")

investigate_moves()
