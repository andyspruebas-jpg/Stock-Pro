
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_90_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')

def check_pos():
    domain = [('create_date', '>=', date_90_ago)]
    try:
        groups = models.execute_kw("ati", uid, "7474", "pos.order.line", "read_group", 
                                    [
                                        domain,
                                        ['product_id', 'price_subtotal_incl'], # no sum
                                        ['product_id'],
                                    ],
                                    {"lazy": False}
                                    )
        if groups:
            print(f"Sample without sum: {groups[0]}")
            
        groups_sum = models.execute_kw("ati", uid, "7474", "pos.order.line", "read_group", 
                                    [
                                        domain,
                                        ['product_id', 'price_subtotal_incl:sum'], # with sum
                                        ['product_id'],
                                    ],
                                    {"lazy": False}
                                    )
        if groups_sum:
            print(f"Sample with sum: {groups_sum[0]}")
    except Exception as e:
        print(f"Error: {e}")

check_pos()
