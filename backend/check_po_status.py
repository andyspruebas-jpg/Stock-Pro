
import xmlrpc.client

url = "https://ati.com.bo"
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate("ati", "api_odoo@ati.com.bo", "7474", {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_po(ref):
    try:
        pos = models.execute_kw("ati", uid, "7474", 'purchase.order', 'search_read', 
                               [[('name', '=', ref)]], 
                               {'fields': ['name', 'state', 'date_order']})
        print(f"Searching for {ref}: {pos}")
    except Exception as e:
        print(f"Error searching for {ref}: {e}")

check_po("P25146")
check_po("P25142")
check_po("P25140")
check_po("P25138")
