
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_all_uoms():
    domain = [
        ('product_id', '=', 267), 
        ('state', '=', 'done'), 
        ('location_dest_id.usage', '=', 'customer'),
        ('location_id.usage', '=', 'internal')
    ]
    uoms = models.execute_kw("ati", uid, "7474", "stock.move.line", "read_group", 
                            [domain, ['product_uom_id', 'quantity:sum'], ['product_uom_id']], {"lazy": False})
    print(f"UoM groups found: {uoms}")

check_all_uoms()
