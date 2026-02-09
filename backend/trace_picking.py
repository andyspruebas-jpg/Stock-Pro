import xmlrpc.client
import ssl

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"
context = ssl._create_unverified_context()
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common', context=context)
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object', context=context)

pid = 37086 # CARNE X GANCHO

# 1. Get a recent move line
moves = models.execute_kw(db, uid, password, 'stock.move.line', 'search_read',
    [[('product_id', '=', pid), ('state', '=', 'done'), ('reference', 'ilike', 'POS')]],
    {'fields': ['reference', 'picking_id'], 'limit': 1}
)

if moves:
    move = moves[0]
    ref = move['reference']
    picking_id = move['picking_id'][0] if move.get('picking_id') else None
    print(f"Move Ref: {ref}, Picking ID: {picking_id}")
    
    # 2. Find POS Order linked to this picking (if any)
    # Usually pos.order has a field 'picking_ids' or similar, 
    # but in Odoo 16+ it might be the other way around or via origin.
    pos_orders = models.execute_kw(db, uid, password, 'pos.order', 'search_read',
        [[('picking_ids', 'in', [picking_id])]],
        {'fields': ['name', 'lines']}
    )
    
    if not pos_orders:
        # Try searching by name/origin
        pos_orders = models.execute_kw(db, uid, password, 'pos.order', 'search_read',
            [[('name', '=', ref)]],
            {'fields': ['name', 'lines']}
        )
    
    if pos_orders:
        order = pos_orders[0]
        print(f"Found POS Order: {order['name']}")
        lines = models.execute_kw(db, uid, password, 'pos.order.line', 'read',
            [order['lines']], {'fields': ['product_id', 'qty', 'price_subtotal_incl']}
        )
        for l in lines:
            print(f"  - Sale Item: {l['product_id'][1]} (ID: {l['product_id'][0]})")
            print(f"    Qty: {l['qty']}, Revenue: {l['price_subtotal_incl']}")
    else:
        print("POS Order not found for this picking.")
else:
    print("No moves found.")
