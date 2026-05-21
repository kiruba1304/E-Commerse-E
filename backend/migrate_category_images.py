import sqlite3
import os

db_path = r"d:\E-Commerse-E\backend\ecommerce.db"
if os.path.exists(db_path):
    print("Database found at:", db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE categories ADD COLUMN image_url TEXT")
        conn.commit()
        print("Column 'image_url' added successfully to categories table!")
    except sqlite3.OperationalError as e:
        print("Column already exists or migration skipped:", e)
    conn.close()
else:
    print("Database file not found at:", db_path)
