
import json
import os

CACHE_FILE = "/home/gabriel/Quiebra/backend/last_sync_cache.json"

def verify():
    if not os.path.exists(CACHE_FILE):
        print("Cache file not found")
        return

    with open(CACHE_FILE, "r") as f:
        data = json.load(f)
    
    products = data.get("products", [])
    print(f"Total products in cache: {len(products)}")
    
    with_sales = [p for p in products if p.get('sales_30d', 0) > 0]
    print(f"Products with sales_30d > 0: {len(with_sales)}")
    
    with_stock = [p for p in products if p.get('total_stock', 0) > 0]
    print(f"Products with total_stock > 0: {len(with_stock)}")
    
    # Logic from App.tsx:
    # (p.currentStock || 0) <= 0 && (p.currentPending || 0) === 0 && (p.currentSales || 0) > 0
    
    quiebre_sin_pedido = []
    quiebre_con_pedido = []
    
    for p in products:
        stock = p.get('total_stock', 0)
        pending = p.get('total_pending', 0)
        sales = p.get('sales_30d', 0)
        
        if stock <= 0:
            if pending > 0:
                quiebre_con_pedido.append(p)
            elif pending == 0 and sales > 0:
                quiebre_sin_pedido.append(p)

    print(f"En Quiebre (Sin Pedido / Con Venta): {len(quiebre_sin_pedido)}")
    print(f"Quiebre / Pedido (En Camino / Sin Stock): {len(quiebre_con_pedido)}")
    
    if len(quiebre_sin_pedido) > 0:
        print("\nEjemplos En Quiebre (top 5):")
        for p in quiebre_sin_pedido[:5]:
            print(f"- {p.get('name')} (Stock: {p.get('total_stock')}, Ventas: {p.get('sales_30d')}, Pending: {p.get('total_pending')})")

verify()
