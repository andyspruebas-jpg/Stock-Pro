
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def list_aceites():
    products = models.execute_kw("ati", uid, "7474", 'product.product', 'search_read', 
                                [[('name', 'ilike', 'ACEITE FINO')]], {'fields': ['id', 'name', 'barcode'], 'limit': 20})
    for p in products:
        print(f"ID: {p['id']}, Name: {p['name']}, Barcode: {p['barcode']}")

list_aceites()
