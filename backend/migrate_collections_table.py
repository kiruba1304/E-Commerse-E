import sqlite3
import os

db_path = r"d:\E-Commerse-E\backend\ecommerce.db"
if os.path.exists(db_path):
    print("Database found at:", db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                shop_id INTEGER NOT NULL,
                category_ids_json TEXT,
                FOREIGN KEY(shop_id) REFERENCES shops(id)
            )
        """)
        conn.commit()
        print("Table 'collections' created successfully!")
    except Exception as e:
        print("Error creating table:", e)
    conn.close()
else:
    print("Database file not found at:", db_path)
