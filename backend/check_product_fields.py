from main import OdooClient
client = OdooClient()
if client.authenticate():
    fields = client.call_kw("product.product", "fields_get", [], {"attributes": ["string"]})
    for f in ["type", "categ_id", "brand_id", "x_brand", "product_brand_id"]:
        if f in fields:
            print(f"{f}: {fields[f]['string']}")
