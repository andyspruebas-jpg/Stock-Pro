
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
pid = 250 # Aceite Fino Light (0.9L)

def compare_250():
    domain_stock = [
        ('product_id', '=', pid),
        ('date', '>=', date_30_ago),
        ('state', '=', 'done'), 
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    move_sum = models.execute_kw("ati", uid, "7474", "stock.move.line", "read_group", 
                                [domain_stock, ['quantity:sum'], ['product_id']], {"lazy": False})
    qty_stock = move_sum[0]['quantity'] if move_sum else 0
    
    domain_pos = [
        ('product_id', '=', pid),
        ('create_date', '>=', date_30_ago)
    ]
    pos_sum = models.execute_kw("ati", uid, "7474", "pos.order.line", "read_group", 
                               [domain_pos, ['qty:sum'], ['product_id']], {"lazy": False})
    qty_pos = pos_sum[0]['qty'] if pos_sum else 0

    print(f"Product ID 250 - 30 days comparison")
    print(f"Stock Move Lines (Current): {qty_stock}")
    print(f"POS Order Lines: {qty_pos}")

compare_250()
