
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_loc_hierarchy():
    # Fetch all internal locations with their parent and warehouse_id
    locations = models.execute_kw("ati", uid, "7474", 'stock.location', 'search_read', 
                                 [[('usage', '=', 'internal')]], 
                                 {'fields': ['id', 'complete_name', 'warehouse_id', 'location_id']})
    
    print(f"Total internal locations: {len(locations)}")
    
    no_wh = [l for l in locations if not l.get('warehouse_id')]
    print(f"Locations with NO warehouse_id: {len(no_wh)}")
    
    if no_wh:
        print(f"Sample with no WH: {no_wh[0]}")
    
    with_wh = [l for l in locations if l.get('warehouse_id')]
    print(f"Locations WITH warehouse_id: {len(with_wh)}")

check_loc_hierarchy()
