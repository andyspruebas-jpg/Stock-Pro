
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Odoo Configuration
ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

class OdooClientStandalone:
    def __init__(self):
        self.session = requests.Session()
        self.url = ODOO_URL

    def authenticate(self):
        try:
            payload = {
                "jsonrpc": "2.0",
                "params": {
                    "db": ODOO_DB,
                    "login": ODOO_USER,
                    "password": ODOO_PASS
                }
            }
            response = self.session.post(f"{self.url}/web/session/authenticate", json=payload, timeout=20)
            result = response.json()
            if result.get("error"):
                print(f"Odoo Auth Error: {result['error']}")
                return False
            return True
        except Exception as e:
            print(f"Odoo Connection Error: {e}")
            return False

    def call_kw(self, model, method, args=None, kwargs=None):
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "model": model,
                "method": method,
                "args": args or [],
                "kwargs": kwargs or {}
            },
            "id": 1
        }
        response = self.session.post(f"{self.url}/web/dataset/call_kw", json=payload, timeout=120)
        return response.json().get("result")

def test_odoo():
    client = OdooClientStandalone()
    if not client.authenticate():
        print("Could not connect to Odoo")
        return

    # Check some purchase orders
    orders = client.call_kw("purchase.order", "search_read", [[('state', 'in', ['draft', 'sent', 'to approve', 'purchase', 'done'])]], {"fields": ["id", "name", "date_order"], "limit": 10})
    if orders:
        for o in orders:
            print(f"Order: {o['name']}, ID: {o['id']}, Date Order: {repr(o.get('date_order'))}")
    else:
        print("No orders found")

if __name__ == "__main__":
    test_odoo()
