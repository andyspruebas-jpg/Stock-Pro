
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_outputs():
    locations = models.execute_kw("ati", uid, "7474", 'stock.location', 'search_read', 
                                 [[('name', 'ilike', 'Output'), ('usage', '!=', 'internal')]], {'fields': ['id', 'complete_name', 'usage']})
    print(f"Non-internal Output locations: {locations}")
    
    locations2 = models.execute_kw("ati", uid, "7474", 'stock.location', 'search_read', 
                                 [[('name', 'ilike', 'Salida'), ('usage', '!=', 'internal')]], {'fields': ['id', 'complete_name', 'usage']})
    print(f"Non-internal Salida locations: {locations2}")

check_outputs()
