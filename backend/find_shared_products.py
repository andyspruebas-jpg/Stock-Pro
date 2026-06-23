import json
import csv
import os

CSV_PATH = "/home/gabriel/Quiebra/CAMBIO DE PRECIO USHAS MAYO---HECHO MAYO 12.csv"
CACHE_PATH = "/home/gabriel/Quiebra/backend/last_sync_cache.json"

def load_csv_barcodes():
    barcodes = set()
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        for row in reader:
            if len(row) >= 2:
                bc = row[1].strip()
                if bc and len(bc) >= 8 and bc.isdigit():
                    barcodes.add(bc)
    return barcodes

def identify_warehouses(warehouses):
    andys_ids = set()
    nuba_ids = set()
    andys_names = set()
    nuba_names = set()
    for w in warehouses:
        wid = w["id"]
        name = w.get("name", "").upper()
        if "ANDY" in name:
            andys_ids.add(wid)
            andys_names.add(name)
        if "NUBA" in name or "SOPOCACHI" in name or "ALMACEN CENTRAL" in name:
            nuba_ids.add(wid)
            nuba_names.add(name)
    return andys_ids, nuba_ids, andys_names, nuba_names

def find_shared_products(csv_barcodes, cache_path):
    with open(cache_path, "r") as f:
        data = json.load(f)

    warehouses = data.get("warehouses", [])
    andys_ids, nuba_ids, andys_names, nuba_names = identify_warehouses(warehouses)

    print(f"Andy's warehouses ({len(andys_ids)}): {andys_names}")
    print(f"Nuba warehouses ({len(nuba_ids)}): {nuba_names}")
    print()

    products = data.get("products", [])
    results = []

    for p in products:
        bc = str(p.get("barcode", "")).strip()
        if bc not in csv_barcodes:
            continue

        stock_by_wh = p.get("stock_by_wh", {})
        if isinstance(stock_by_wh, dict):
            andys_stock = sum(qty for wid, qty in stock_by_wh.items() if int(wid) in andys_ids)
            nuba_stock = sum(qty for wid, qty in stock_by_wh.items() if int(wid) in nuba_ids)
        else:
            andys_stock = 0
            nuba_stock = 0

        if andys_stock > 0 and nuba_stock > 0:
            results.append({
                "barcode": bc,
                "name": p.get("name", ""),
                "andys_stock": andys_stock,
                "nuba_stock": nuba_stock,
            })

    return results

if __name__ == "__main__":
    csv_barcodes = load_csv_barcodes()
    print(f"Barcode en CSV: {len(csv_barcodes)}")

    results = find_shared_products(csv_barcodes, CACHE_PATH)

    print(f"\nProductos que estan en AMBAS tiendas (Andy's + Nuba): {len(results)}")
    print("-" * 80)
    for r in results:
        print(f"{r['barcode']} | {r['name'][:50]} | Andy's: {r['andys_stock']} | Nuba: {r['nuba_stock']}")

    if results:
        out = "/home/gabriel/Quiebra/shared_both_tiendas.csv"
        with open(out, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["barcode", "name", "andys_stock", "nuba_stock"])
            w.writeheader()
            w.writerows(results)
        print(f"\nGuardado en: {out}")