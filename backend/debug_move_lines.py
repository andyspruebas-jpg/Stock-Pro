
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

def check_move_lines():
    domain = [
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'),
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    
    count = models.execute_kw("ati", uid, "7474", 'stock.move.line', 'search_count', [domain])
    print(f"Total stock.move.line in last 30 days: {count}")
    
    if count > 0:
        sample = models.execute_kw("ati", uid, "7474", 'stock.move.line', 'search_read', [domain], {'limit': 1, 'fields': ['product_id', 'location_id', 'location_dest_id', 'qty_done', 'date']})
        print(f"Sample line: {sample}")

check_move_lines()
