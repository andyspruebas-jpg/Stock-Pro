
import xmlrpc.client

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def compare_orders():
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
    models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')
    
    # 1. Check if the specific "missing" order exists and its details
    missing_name = "P25593"
    res = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'purchase.order', 'search_read', 
                           [[['name', '=', missing_name]]], 
                           {'fields': ['name', 'state', 'partner_id', 'company_id', 'user_id']})
    
    if res:
        print(f"FOUND MISSING ORDER {missing_name} IN DB:")
        print(res[0])
    else:
        print(f"ORDER {missing_name} NOT FOUND IN DB!")

    # 2. Look at the last few orders that SHOULD be visible (like P25613)
    visible_name = "P25613"
    res_vis = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'purchase.order', 'search_read', 
                               [[['name', '=', visible_name]]], 
                               {'fields': ['name', 'state', 'partner_id', 'company_id']})
    if res_vis:
        print(f"\nDETAILS FOR A VISIBLE ORDER {visible_name}:")
        print(res_vis[0])

if __name__ == "__main__":
    compare_orders()
