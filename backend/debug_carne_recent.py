import xmlrpc.client
import ssl
from datetime import datetime, timedelta

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"
context = ssl._create_unverified_context()
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common', context=context)
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object', context=context)

pid = 37086 # CARNE X GANCHO
date_90_days_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')

print(f"--- Checking RECENT Stock Moves (Since {date_90_days_ago}) ---")
domain = [('product_id', '=', pid), ('state', '=', 'done'), 
          ('location_dest_id.complete_name', 'ilike', 'CUSTOME'),
          ('date', '>=', date_90_days_ago)]
# Using 'quantity' as in main.py
fields = ['product_id', 'quantity:sum']
groupby = ['product_id']

recent_moves = models.execute_kw(db, uid, password, 'stock.move.line', 'read_group',
    [domain, fields, groupby]
)
print(f"Inventory Rotation (Stock Moves): {recent_moves}")

print(f"\n--- Checking RECENT POS Lines (Since {date_90_days_ago}) ---")
pos_domain = [('product_id', '=', pid), ('create_date', '>=', date_90_days_ago)]
pos_fields = ['product_id', 'qty:sum', 'price_subtotal_incl:sum']
pos_groupby = ['product_id']
recent_pos = models.execute_kw(db, uid, password, 'pos.order.line', 'read_group',
    [pos_domain, pos_fields, pos_groupby]
)
print(f"POS Sales (Revenue): {recent_pos}")
