from main import OdooClient
import logging

logging.basicConfig(level=logging.INFO)

def check_structure():
    client = OdooClient()
    if not client.authenticate():
        print("Auth failed")
        return

    # Check for specific names in Categories
    print("--- SEARCHING CATEGORIES ---")
    cats = client.call_kw("product.category", "search_read", 
                         [[('name', 'in', ['FRUVER', 'CARNICERIA', 'GRANIPAN'])]], 
                         {"fields": ["name", "parent_id", "complete_name"]})
    print(f"Found Categories: {cats}")

    # Check for specific names in Brands (if exists)
    try:
        print("\n--- SEARCHING BRANDS ---")
        brands = client.call_kw("product.brand", "search_read", 
                               [[('name', 'in', ['FRUVER', 'CARNICERIA', 'GRANIPAN'])]], 
                               {"fields": ["name"]})
        print(f"Found Brands: {brands}")
    except:
        print("product.brand model not found or error.")

    # Check POS Categories
    try:
        print("\n--- SEARCHING POS CATEGORIES ---")
        pos_cats = client.call_kw("pos.category", "search_read", 
                                 [[('name', 'in', ['FRUVER', 'CARNICERIA', 'GRANIPAN'])]], 
                                 {"fields": ["name"]})
        print(f"Found POS Categories: {pos_cats}")
    except:
        print("pos.category error.")

if __name__ == "__main__":
    check_structure()
