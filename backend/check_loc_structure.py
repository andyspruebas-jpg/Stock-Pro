
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_loc_structure():
    warehouses = models.execute_kw("ati", uid, "7474", 'stock.warehouse', 'search_read', [], {'fields': ['id', 'name', 'code', 'lot_stock_id']})
    print(f"Warehouses: {warehouses}")
    
    locations = models.execute_kw("ati", uid, "7474", 'stock.location', 'search_read', 
                                 [[('usage', '=', 'internal')]], {'fields': ['id', 'complete_name', 'warehouse_id']})
    
    for l in locations[:10]:
        print(f"Loc: {l['complete_name']} (ID: {l['id']}), WH: {l.get('warehouse_id')}")

check_loc_structure()
