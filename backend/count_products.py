
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def count_products():
    total = models.execute_kw("ati", uid, "7474", 'product.product', 'search_count', [[]])
    with_barcode = models.execute_kw("ati", uid, "7474", 'product.product', 'search_count', [[('barcode', '!=', False)]])
    print(f"Total products: {total}")
    print(f"Products with barcode: {with_barcode}")

count_products()
