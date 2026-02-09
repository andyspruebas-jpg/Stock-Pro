import requests
import json
from datetime import datetime, timedelta

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

class OdooClient:
    def __init__(self):
        self.session = requests.Session()
        self.url = ODOO_URL

    def authenticate(self):
        payload = {
            "jsonrpc": "2.0",
            "params": {
                "db": ODOO_DB,
                "login": ODOO_USER,
                "password": ODOO_PASS
            }
        }
        response = self.session.post(f"{self.url}/web/session/authenticate", json=payload)
        return response.json()

    def call_kw(self, model, method, args, kwargs={}):
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "model": model,
                "method": method,
                "args": args,
                "kwargs": kwargs
            }
        }
        response = self.session.post(f"{self.url}/web/dataset/call_kw", json=payload)
        return response.json().get("result")

def calculate_abc(data_dict):
    """
    Expects {product_id: value}
    Returns {product_id: category}
    """
    if not data_dict:
        return {}
        
    # Sort items by value descending
    sorted_items = sorted(data_dict.items(), key=lambda x: x[1], reverse=True)
    total_sum = sum(data_dict.values())
    
    if total_sum <= 0:
        return {pid: 'E' for pid, _ in sorted_items}
        
    results = {}
    cum_sum = 0
    for pid, val in sorted_items:
        cum_sum += val
        cum_perc = (cum_sum / total_sum) * 100
        
        if cum_perc <= 20:
            cat = 'AA'
        elif cum_perc <= 40:
            cat = 'A'
        elif cum_perc <= 60:
            cat = 'B'
        elif cum_perc <= 80:
            cat = 'C'
        elif cum_perc <= 90:
            cat = 'D'
        else:
            cat = 'E'
        results[pid] = cat
        
    return results

def main():
    client = OdooClient()
    client.authenticate()
    
    date_90_days_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')
    
    print(f"Fetching POS sales since {date_90_days_ago}...")
    
    # Fetch POS order lines
    # Using pos.order.line if it exists
    pos_lines = client.call_kw("pos.order.line", "search_read", 
                              [[('create_date', '>=', date_90_days_ago)]],
                              {"fields": ["product_id", "qty", "price_subtotal_incl", "price_unit"], "limit": 100000})
    
    if not pos_lines:
        print("No POS lines found.")
        return

    # Aggregate by product
    # Variables: Rotation (Qty), Revenue (Price Subtotal), Margin
    rotation_map = {}
    revenue_map = {}
    
    product_ids = set()
    for line in pos_lines:
        pid = line['product_id'][0]
        product_ids.add(pid)
        rotation_map[pid] = rotation_map.get(pid, 0) + line['qty']
        revenue_map[pid] = revenue_map.get(pid, 0) + line['price_subtotal_incl']
        
    # Fetch costs for margin calculation
    print(f"Fetching costs for {len(product_ids)} products...")
    products_info = client.call_kw("product.product", "read", [list(product_ids)], {"fields": ["standard_price"]})
    cost_map = {p['id']: p['standard_price'] for p in products_info}
    
    margin_map = {}
    for pid in product_ids:
        qty = rotation_map.get(pid, 0)
        rev = revenue_map.get(pid, 0)
        cost = cost_map.get(pid, 0)
        margin = rev - (cost * qty)
        margin_map[pid] = margin
        
    # Calculate ABC for each
    abc_rotation = calculate_abc(rotation_map)
    abc_revenue = calculate_abc(revenue_map)
    abc_margin = calculate_abc(margin_map)
    
    # Unified Category: Let's show the composite or the prioritized one.
    # Instruction says "ponle categoria" (singular). 
    # Usually, a product might be 'A' in rotation but 'C' in margin.
    # The image shows 3 loops. I'll provide all three in a nice string or pick the overall highest.
    
    print("\nResults Sample (Top 5 by Revenue):")
    sorted_rev = sorted(revenue_map.items(), key=lambda x: x[1], reverse=True)
    for pid, rev in sorted_rev[:10]:
        print(f"PID {pid}: Rev={rev:.2f}, Rot={rotation_map[pid]}, Marg={margin_map[pid]:.2f} -> Rot:{abc_rotation[pid]}, Rev:{abc_revenue[pid]}, Marg:{abc_margin[pid]}")

if __name__ == "__main__":
    main()
