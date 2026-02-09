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
            "db": ODOO_DB,
            "login": ODOO_USER,
            "password": ODOO_PASS
        }
    }
    r = session.post(f"{ODOO_URL}/web/session/authenticate", json=payload)
    print("Auth:", r.status_code)
    
    def call(model, method, args, kwargs={}):
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
        r = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload)
        return r.json().get('result')

    # Check location usages
    locs = call("stock.location", "read_group", [[], ['usage'], ['usage']])
    print("Location Usages:", locs)
    
    # Check internal locations with stock
    stock_sample = call("stock.quant", "search_read", [[('quantity', '>', 0)]], {"fields": ["location_id"], "limit": 10})
    print("Stock Sample Locations:", stock_sample)

    # Check for specific warehouse locations
    whs = call("stock.warehouse", "search_read", [], {"fields": ["name", "lot_stock_id"]})
    print("Warehouses:", whs[:5])

if __name__ == "__main__":
    test()
