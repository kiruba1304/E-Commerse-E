import sqlite3
import json
import os

db_path = r"d:\E-Commerse-E\backend\ecommerce.db"
if os.path.exists(db_path):
    print("Database found. Seeding default collection...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Fetch category IDs
        cursor.execute("SELECT id, name FROM categories")
        categories = cursor.fetchall()
        print("Categories found in DB:", categories)
        
        category_ids = [c[0] for c in categories]
        
        # Check if collection already exists
        cursor.execute("SELECT id FROM collections WHERE name='The Saree & Ethnic Collection'")
        exist = cursor.fetchone()
        
        category_ids_json = json.dumps(category_ids)
        
        if not exist:
            # Seed default collection
            cursor.execute(
                "INSERT INTO collections (name, shop_id, category_ids_json) VALUES (?, ?, ?)",
                ("The Saree & Ethnic Collection", 1, category_ids_json)
            )
            print("Default Collection 'The Saree & Ethnic Collection' created successfully!")
        else:
            # Update existing collection to contain all categories
            cursor.execute(
                "UPDATE collections SET category_ids_json=? WHERE name='The Saree & Ethnic Collection'",
                (category_ids_json,)
            )
            print("Existing Collection 'The Saree & Ethnic Collection' updated with all category mappings!")
            
        conn.commit()
    except Exception as e:
        print("Error seeding collections:", e)
    conn.close()
else:
    print("Database not found!")
