import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'ecommerce.db')

def migrate():
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Migrate products table
    cursor.execute("PRAGMA table_info(products)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'barcode' not in columns:
        print("Adding column 'barcode' to table 'products'...")
        cursor.execute("ALTER TABLE products ADD COLUMN barcode VARCHAR(100)")
    else:
        print("Column 'barcode' already exists in table 'products'.")

    if 'sku_code' not in columns:
        print("Adding column 'sku_code' to table 'products'...")
        cursor.execute("ALTER TABLE products ADD COLUMN sku_code VARCHAR(100)")
    else:
        print("Column 'sku_code' already exists in table 'products'.")

    if 'hsc_code' not in columns:
        print("Adding column 'hsc_code' to table 'products'...")
        cursor.execute("ALTER TABLE products ADD COLUMN hsc_code VARCHAR(100)")
    else:
        print("Column 'hsc_code' already exists in table 'products'.")

    # 2. Migrate shops table
    cursor.execute("PRAGMA table_info(shops)")
    shop_columns = [col[1] for col in cursor.fetchall()]

    if 'billing_api_key' not in shop_columns:
        print("Adding column 'billing_api_key' to table 'shops'...")
        cursor.execute("ALTER TABLE shops ADD COLUMN billing_api_key VARCHAR(255)")
    else:
        print("Column 'billing_api_key' already exists in table 'shops'.")

    if 'last_billing_heartbeat_at' not in shop_columns:
        print("Adding column 'last_billing_heartbeat_at' to table 'shops'...")
        cursor.execute("ALTER TABLE shops ADD COLUMN last_billing_heartbeat_at DATETIME")
    else:
        print("Column 'last_billing_heartbeat_at' already exists in table 'shops'.")

    if 'last_online_order_number' not in shop_columns:
        print("Adding column 'last_online_order_number' to table 'shops'...")
        cursor.execute("ALTER TABLE shops ADD COLUMN last_online_order_number INTEGER DEFAULT 0")
    else:
        print("Column 'last_online_order_number' already exists in table 'shops'.")

    # 3. Migrate orders table
    cursor.execute("PRAGMA table_info(orders)")
    order_columns = [col[1] for col in cursor.fetchall()]

    if 'is_synced' not in order_columns:
        print("Adding column 'is_synced' to table 'orders'...")
        cursor.execute("ALTER TABLE orders ADD COLUMN is_synced BOOLEAN DEFAULT 0")
    else:
        print("Column 'is_synced' already exists in table 'orders'.")

    if 'online_order_number' not in order_columns:
        print("Adding column 'online_order_number' to table 'orders'...")
        cursor.execute("ALTER TABLE orders ADD COLUMN online_order_number INTEGER")
    else:
        print("Column 'online_order_number' already exists in table 'orders'.")

    # 4. Backfill sequential online order numbers for pending website orders
    print("Backfilling online order numbers for pending website orders...")
    cursor.execute("SELECT id, shop_id, COALESCE(last_online_order_number, 0) FROM shops")
    shop_rows = cursor.fetchall()
    shop_counter = {row[1]: row[2] or 0 for row in shop_rows}

    cursor.execute(
        "SELECT id, shop_id FROM orders WHERE online_order_number IS NULL AND status = 'Pending' ORDER BY shop_id, created_at, id"
    )
    pending_orders = cursor.fetchall()

    for order_id, shop_id in pending_orders:
        next_number = shop_counter.get(shop_id, 0) + 1
        shop_counter[shop_id] = next_number
        cursor.execute("UPDATE orders SET online_order_number = ? WHERE id = ?", (next_number, order_id))

    for shop_id, next_number in shop_counter.items():
        cursor.execute("UPDATE shops SET last_online_order_number = ? WHERE id = ?", (next_number, shop_id))

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == '__main__':
    migrate()
