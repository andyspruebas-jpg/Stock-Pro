
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_fields():
    fields = models.execute_kw("ati", uid, "7474", 'stock.move.line', 'fields_get', [], {'attributes': ['string', 'type']})
    print("qty_done" in fields)
    print("quantity" in fields)
    if "qty_done" in fields: print(f"qty_done: {fields['qty_done']}")
    if "quantity" in fields: print(f"quantity: {fields['quantity']}")

check_fields()
