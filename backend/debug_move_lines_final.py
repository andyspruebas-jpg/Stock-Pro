
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
        # Try both names
        for fieldname in ['quantity', 'qty_done']:
            print(f"Trying {fieldname}:sum")
            try:
                move_groups = models.execute_kw("ati", uid, "7474", "stock.move.line", "read_group", 
                                            [
                                                domain,
                                                ['product_id', 'location_id', f'{fieldname}:sum'],
                                                ['product_id', 'location_id'],
                                            ],
                                            {"lazy": False}
                                            )
                print(f"Success with {fieldname}: {len(move_groups)} groups found.")
                print(f"Sample: {move_groups[0]}")
                break
            except Exception as e:
                print(f"Failed with {fieldname}: {e}")
    except Exception as e:
        print(f"Outer Error: {e}")

check_move_lines()
