
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

def test_multi_agg():
    domain = [
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'), 
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    try:
        # Try multiple sum aggregations
        groups = models.execute_kw("ati", uid, "7474", "stock.move.line", "read_group", 
                                    [
                                        domain,
                                        ['product_id', 'location_id', 'quantity:sum', 'qty_done:sum'],
                                        ['product_id', 'location_id'],
                                    ],
                                    {"lazy": False}
                                    )
        print(f"Count: {len(groups) if groups else 0}")
        if groups:
            print(f"Sample: {groups[0]}")
    except Exception as e:
        print(f"Error: {e}")

test_multi_agg()
