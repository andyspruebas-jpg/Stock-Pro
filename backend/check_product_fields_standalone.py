import requests
import json

ODOO_URL = "https://ati.com.bo"
ODOO_DB = "ati"
ODOO_USER = "api_odoo@ati.com.bo"
ODOO_PASS = "7474"

session = requests.Session()
payload = {
    "jsonrpc": "2.0",
    "params": {
        "db": ODOO_DB,
        "login": ODOO_USER,
        "password": ODOO_PASS
    }
}
response = session.post(f"{ODOO_URL}/web/session/authenticate", json=payload)
if response.json().get("result"):
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": "product.product",
            "method": "fields_get",
            "args": [],
            "kwargs": {"attributes": ["string"]}
        },
        "id": 1
    }
    res = session.post(f"{ODOO_URL}/web/dataset/call_kw", json=payload).json().get("result")
    for f in ["type", "categ_id", "brand_id", "x_brand", "product_brand_id", "attribute_line_ids"]:
        if f in res:
            print(f"{f}: {res[f]['string']}")
