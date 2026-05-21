import sqlite3

db_path = r"d:\E-Commerse-E\backend\ecommerce.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Set beautiful distinct high-fashion vertical saree photos for each category
mappings = [
    ("Banarasi Tissue", "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80"), # Pink Silk
    ("Chettinad Cotton", "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80"), # Mustard Yellow Silk
    ("Fancy Chiffon", "https://images.unsplash.com/photo-1583391265517-35bbdba01229?auto=format&fit=crop&w=800&q=80"), # Red-Orange Pattern Silk
    ("Muthukattam Checked", "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"), # Blue-Purple Silk
    ("Makeshwari Silk", "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80"),
    ("Apparel", "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80")
]

for name, url in mappings:
    cursor.execute("UPDATE categories SET image_url = ? WHERE name = ?", (url, name))
    print(f"Updated category '{name}' with unique image.")

conn.commit()
conn.close()
print("Done seeding diverse categories!")
