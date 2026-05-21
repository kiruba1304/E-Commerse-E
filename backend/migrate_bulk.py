import sqlite3

conn = sqlite3.connect('ecommerce.db')
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(products)")
columns = [row[1] for row in cursor.fetchall()]
print("Existing columns:", columns)

if 'bulk_sale_price' not in columns:
    cursor.execute("ALTER TABLE products ADD COLUMN bulk_sale_price REAL")
    print("Added: bulk_sale_price")
else:
    print("Already exists: bulk_sale_price")

if 'min_quantity' not in columns:
    cursor.execute("ALTER TABLE products ADD COLUMN min_quantity INTEGER")
    print("Added: min_quantity")
else:
    print("Already exists: min_quantity")

conn.commit()
conn.close()
print("Migration complete!")
