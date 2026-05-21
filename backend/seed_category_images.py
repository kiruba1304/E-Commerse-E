import sqlite3

db_path = r"d:\E-Commerse-E\backend\ecommerce.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all categories
cursor.execute("SELECT id, name, image_url FROM categories")
cats = cursor.fetchall()
print("Existing categories:")
for cat in cats:
    print(cat)

# Saree high-resolution vertical cover images:
# Let's map gorgeous Indian saree vertical model photography images to our categories
image_mapping = {
    "Banarasi Tissue": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    "Muthukattam Checked": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    "Uncategorized": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80"
}

for cat_id, name, image_url in cats:
    matched_img = None
    for key, val in image_mapping.items():
        if key.lower() in name.lower():
            matched_img = val
            break
    if not matched_img:
        matched_img = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80" # default beautiful silk saree model
    
    cursor.execute("UPDATE categories SET image_url = ? WHERE id = ?", (matched_img, cat_id))
    print(f"Updated category '{name}' with image: {matched_img}")

conn.commit()
conn.close()
print("Done seeding category cover images!")
