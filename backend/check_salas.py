import requests
import json

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
        res = self.session.post(f"{self.url}/web/session/authenticate", json=payload)
        return res.json()

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
        res = self.session.post(f"{self.url}/web/dataset/call_kw", json=payload)
        return res.json().get("result")

def main():
    client = OdooClient()
    client.authenticate()
    
    # Check ALL locations for "SALA"
    locs = client.call_kw("stock.location", "search_read", 
                         [], 
                         {"fields": ["id", "complete_name", "usage"]})
    
    print("Locations containing 'SALA':")
    found = False
    for l in locs:
        if "SALA" in l['complete_name'].upper():
            print(f"ID: {l['id']} - Name: {l['complete_name']} | Usage: {l['usage']}")
            found = True
    if not found:
        print("None found.")

    # Check recent internal transfers
    transfers = client.call_kw("stock.move.line", "search_read",
                               [[('location_id.usage', '=', 'internal'), 
                                 ('location_dest_id.usage', '=', 'internal'), 
                                 ('location_id', '!=', 'location_dest_id'),
                                 ('state', '=', 'done')]],
                               {"fields": ["location_id", "location_dest_id", "reference"], "limit": 20})
    
    print("\nRecent Internal Transfers (Internal -> Internal):")
    for t in transfers:
        loc_from = t['location_id'][1] if t.get('location_id') else "N/A"
        loc_to = t['location_dest_id'][1] if t.get('location_dest_id') else "N/A"
        print(f"Ref: {t['reference']} | From: {loc_from} | To: {loc_to}")

if __name__ == "__main__":
    main()
