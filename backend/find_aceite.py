
import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def find_aceite():
    products = models.execute_kw("ati", uid, "7474", 'product.product', 'search_read', 
                                [[('name', 'ilike', 'ACEITE FINO VEGETAL (0.9L)')]], {'fields': ['id', 'name', 'barcode']})
    print(f"Products found: {products}")

find_aceite()
