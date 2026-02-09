import json
import sys

try:
    with open('debug_products_filtered.json', 'r') as f:
        data = json.load(f)
        
    products = data.get('products', [])
    print(f"Total products: {len(products)}")
    
    # Let's look for products with pending orders in Odoo but maybe 0 here
    # Or products where Provider is 'Andys'
    
    count_andys = 0
    count_granja = 0
    
    for p in products:
        prov = p.get('provider', '').upper()
        if 'ANDY' in prov:
            count_andys += 1
            if count_andys < 5:
                print(f"--- ANDYS Provider Product: {p['name']} ---")
                print(f"  Pending: {p['total_pending']}")
                print(f"  Orders: {p['pending_orders']}")
        
        if 'GRANJA' in prov:
            count_granja += 1
            if count_granja < 5:
                print(f"--- GRANJA Provider Product: {p['name']} ---")
                print(f"  Pending: {p['total_pending']}")
    
    print(f"\nTotal 'Andys' products: {count_andys}")
    print(f"Total 'Granja' products: {count_granja}")
    
    # Check "CHICOLAC" or "PIL" from screenshot
    for p in products:
        if "CHICOLAC" in p['name'].upper() or "PIL" in p['name'].upper():
            print(f"--- Check Product: {p['name']} ---")
            print(f"  Provider: {p.get('provider')}")
            print(f"  Pending: {p['total_pending']}")
            print(f"  Pending Detail: {p['pending_orders']}")

except Exception as e:
    print(f"Error: {e}")
