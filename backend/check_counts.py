import xmlrpc.client
from datetime import datetime, timedelta

url = "https://ati.com.bo"
db = "ati"
username = "api_odoo@ati.com.bo"
password = "7474"

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

def check_counts():
    date_30 = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    count = models.execute_kw(db, uid, password, 'stock.move', 'search_count', [
        [('date', '>=', date_30), ('state', '=', 'done'), ('location_dest_id.usage', '=', 'customer')]
    ])
    print(f"Total moves to customer in 30 days: {count}")

    # Specific product 267
    count_267 = models.execute_kw(db, uid, password, 'stock.move', 'search_count', [
        [('product_id', '=', 267), ('date', '>=', date_30), ('state', '=', 'done'), ('location_dest_id.usage', '=', 'customer')]
    ])
    print(f"Moves for product 267 in 30 days: {count_267}")

if __name__ == "__main__":
    check_counts()
