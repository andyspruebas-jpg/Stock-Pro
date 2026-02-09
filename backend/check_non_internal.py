
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

def check_other_sources():
    # Check moves to customers from NON-INTERNAL locations
    domain = [
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'), 
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '!=', 'internal')
    ]
    groups = models.execute_kw("ati", uid, "7474", "stock.move.line", "read_group", 
                              [domain, ['quantity:sum', 'location_id'], ['location_id']], {"lazy": False})
    print(f"Non-internal sources to customers: {groups}")

check_other_sources()
