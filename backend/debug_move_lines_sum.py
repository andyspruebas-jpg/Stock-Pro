
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
    
    try:
        move_groups = models.execute_kw("ati", uid, "7474", "stock.move.line", "read_group", 
                                    [
                                        domain,
                                        ['product_id', 'location_id', 'qty_done:sum'], # fields
                                        ['product_id', 'location_id'], # groupby
                                    ],
                                    {"lazy": False}
                                    )
        print(f"Result count: {len(move_groups) if move_groups else 0}")
        if move_groups:
            print(f"Sample result: {move_groups[0]}")
    except Exception as e:
        print(f"Error: {e}")

check_move_lines()
