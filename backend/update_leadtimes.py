import csv
import json
import os


def update_leadtimes():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base_dir)
    source_csv = os.path.join(root_dir, "nombresjiji.csv")
    origins_csv = os.path.join(root_dir, "clasificacion proveedores.csv")
    leadtimes_json = os.path.join(base_dir, "leadtimes.json")

    if not os.path.exists(source_csv):
        print(f"Error: CSV file not found at {source_csv}")
        return

    origins_rows = []
    leadtimes = {}

    try:
        with open(source_csv, mode="r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                provider = (row.get("PROVEEDOR") or "").strip()
                origin = (row.get("ORIGEN") or "").strip()
                coverage = (row.get("COBERTURA MAX") or "").strip()

                if not provider:
                    continue

                origins_rows.append((provider, origin))
                if coverage:
                    try:
                        leadtimes[provider.upper()] = float(coverage)
                    except ValueError:
                        continue

        with open(origins_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f, delimiter=";")
            writer.writerows(origins_rows)

        with open(leadtimes_json, "w", encoding="utf-8") as f:
            json.dump(leadtimes, f, indent=4, ensure_ascii=False)

        print(f"Successfully synced {len(origins_rows)} providers from {source_csv}")
        print(f"Updated origins CSV: {origins_csv}")
        print(f"Updated leadtimes JSON: {leadtimes_json}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    update_leadtimes()
