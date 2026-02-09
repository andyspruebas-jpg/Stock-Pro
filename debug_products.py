import json
import sys

try:
    with open('debug_products.json', 'r') as f:
        data = json.load(f)
        
    products = data.get('products', [])
    print(f"Total products: {len(products)}")
    
    target_found = False
    for p in products:
        if "BOLSA NUBA PAPEL KRAFT" in p.get('name', '').upper() and p.get('provider') == 'AMANDA OFICIAL':
            print(f"--- Product Found: {p['name']} ---")
            print(f"ID: {p['id']}")
            print(f"Pending Orders: {json.dumps(p.get('pending_orders'), indent=2)}")
            print(f"Total Pending: {p.get('total_pending')}")
            target_found = True
            
    if not target_found:
        print("Target product not found in JSON.")
        
except Exception as e:
    print(f"Error: {e}")
