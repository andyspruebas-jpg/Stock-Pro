
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

date_30_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
pid = 267 # Aceite Fino Vegetal (0.9L)

def compare_sales():
    # 1. Stock Moves (Current Logic)
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
    
    # 2. POS Order Lines
    domain_pos = [
        ('product_id', '=', pid),
        ('create_date', '>=', date_30_ago)
    ]
    pos_sum = models.execute_kw("ati", uid, "7474", "pos.order.line", "read_group", 
                               [domain_pos, ['qty:sum'], ['product_id']], {"lazy": False})
    qty_pos = pos_sum[0]['qty'] if pos_sum else 0

    # 3. Sale Order Lines
    domain_sale = [
        ('product_id', '=', pid),
        ('create_date', '>=', date_30_ago),
        ('state', 'in', ['sale', 'done'])
    ]
    sale_sum = models.execute_kw("ati", uid, "7474", "sale.order.line", "read_group", 
                                [domain_sale, ['product_uom_qty:sum'], ['product_id']], {"lazy": False})
    qty_sale = sale_sum[0]['product_uom_qty'] if sale_sum else 0

    print(f"Product ID 267 - 30 days comparison")
    print(f"Stock Move Lines (Current): {qty_stock}")
    print(f"POS Order Lines: {qty_pos}")
    print(f"Sale Order Lines (Confirmed): {qty_sale}")
    print(f"Total POS + Sale: {qty_pos + qty_sale}")

compare_sales()
