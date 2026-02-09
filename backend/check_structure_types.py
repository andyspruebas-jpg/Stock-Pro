from main import OdooClient
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_structure():
    client = OdooClient()
    if not client.authenticate():
        print("Auth failed")
        return

    # Check Categories
    print("--- CATEGORIES ---")
    cats = client.call_kw("product.category", "search_read", [], {"fields": ["name", "parent_id"]})
    for c in cats:
        print(f"Cat: {c['name']}")

    # Check Brands (if brand_id exists on product, usually it's product.brand or similar, but let's check product.template fields first or just values)
    # Using fetch_active_products_data logic to see raw values
    
    print("\n--- SAMPLE PRODUCTS ---")
    # Fetch a few products to see meaningful fields
    products = client.call_kw("product.product", "search_read", [], {"fields": ["name", "categ_id", "brand_id", "pos_categ_id"], "limit": 50})
    for p in products:
        cat = p['categ_id'][1] if p.get('categ_id') else "N/A"
        brand = p['brand_id'][1] if p.get('brand_id') else "N/A"
        print(f"Name: {p['name']} | Cat: {cat} | Brand: {brand}")

if __name__ == "__main__":
    check_structure()
