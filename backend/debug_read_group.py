import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_read_group():
    date_30 = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    
    # Global Sales
    groups = models.execute_kw(db, uid, password, 'stock.move', 'read_group', [
        [('date', '>=', date_30), ('state', '=', 'done'), ('location_dest_id.usage', '=', 'customer')],
        ['product_id', 'product_uom_qty'],
        ['product_id']
    ])
    
    # Specific product 267
    prod_267 = next((g for g in groups if g['product_id'] and g['product_id'][0] == 267), None)
    if prod_267:
        print(f"Global Sales for 267 (read_group): {prod_267['product_uom_qty']}")
    else:
        print("Product 267 not found in sales.")

    # Sales by Warehouse (this is trickier with read_group because warehouse_id might be null)
    # We can try to group by warehouse too
    wh_groups = models.execute_kw(db, uid, password, 'stock.move', 'read_group', [
        [('date', '>=', date_30), ('state', '=', 'done'), ('location_dest_id.usage', '=', 'customer')],
        ['product_id', 'warehouse_id', 'product_uom_qty'],
        ['product_id', 'warehouse_id'],
        0, # offset
        None, # limit
        False, # orderby
        False # lazy
    ])
    
    wh_267 = [g for g in wh_groups if g['product_id'] and g['product_id'][0] == 267]
    print(f"Warehouse breakdown for 267:")
    for g in wh_267:
        print(f"  WH: {g['warehouse_id']} | Qty: {g['product_uom_qty']}")

if __name__ == "__main__":
    check_read_group()
