import requests
import json

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

def test():
    session = requests.Session()
    payload = {
        "jsonrpc": "2.0",
        "params": {
            "db": ODOO_DB, "login": ODOO_USER, "password": ODOO_PASS
        }
    }
    session.post(f"{ODOO_URL}/web/session/authenticate", json=payload)
    
    def call(model, method, args, kwargs={}):
        payload = {
            "jsonrpc": "2.0", "method": "call",
            "params": { "model": model, "method": method, "args": args, "kwargs": kwargs }
        }
        r = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
        res = r.json()
        if 'error' in res:
            print(f"Error in {model}.{method}: {res['error'].get('message')} - {res['error'].get('data', {}).get('message')}")
        return res.get('result')

    # Get some internal locs
    loc_ids = call("stock.location", "search", [[('usage', '=', 'internal')]], {"limit": 100})
    print(f"Testing with {len(loc_ids)} locations")
    
    # Test read_group on stock.quant
    res = call("stock.quant", "read_group", 
               [[('location_id', 'in', loc_ids), ('quantity', '>', 0)], 
                ['product_id', 'location_id', 'quantity:sum'], ['product_id', 'location_id']], {"lazy": False})
    print("stock.quant result length:", len(res) if res is not None else "None")
    if res and len(res) > 0:
        print("First item:", res[0])

    # Test pos.order.line fields
    fields_pos = call("pos.order.line", "fields_get", [], {"attributes": ["type", "string"]})
    print("Is order_id in pos.order.line?", "order_id" in fields_pos)
    
    # Try alternate Rev query
    res_pos = call("pos.order.line", "read_group",
                   [[], ['product_id', 'qty:sum'], ['product_id']], {"lazy": False, "limit": 10})
    print("pos.order.line total groups:", len(res_pos) if res_pos else "None")

if __name__ == "__main__":
    test()
