
import xmlrpc.client
import logging

# Odoo Credentials (extracted from common knowledge of this setup or main.py if available)
# Since I don't want to leak or guess, I'll read them from main.py if possible.
# Actually, I'll just use the logic from main.py but in a simplified script.

def test_odoo():
    from main import get_odoo_client
    client = get_odoo_client()
    if not client:
        print("Could not connect to Odoo")
        return

    # Check some purchase orders
    orders = client.call_kw("purchase.order", "search_read", [[('state', 'in', ['draft', 'sent', 'to approve', 'purchase', 'done'])]], {"fields": ["id", "name", "date_order"], "limit": 5})
    for o in orders:
        print(f"Order: {o['name']}, ID: {o['id']}, Date Order: {repr(o.get('date_order'))}")

if __name__ == "__main__":
    test_odoo()
