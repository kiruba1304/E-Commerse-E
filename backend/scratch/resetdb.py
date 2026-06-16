import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import db
from sqlalchemy import text

with app.app_context():
    print("Resetting database products, orders, shops, and related tables...")
    try:
        # Disable foreign key checks
        db.session.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        # Truncate tables (deletes all data and resets auto-increment to 1)
        print("Truncating order_items...")
        db.session.execute(text("TRUNCATE TABLE order_items;"))
        
        print("Truncating orders...")
        db.session.execute(text("TRUNCATE TABLE orders;"))
        
        print("Truncating cart_items...")
        db.session.execute(text("TRUNCATE TABLE cart_items;"))
        
        print("Truncating wishlist_items...")
        db.session.execute(text("TRUNCATE TABLE wishlist_items;"))
        
        print("Truncating reviews...")
        db.session.execute(text("TRUNCATE TABLE reviews;"))
        
        print("Truncating customization_orders...")
        db.session.execute(text("TRUNCATE TABLE customization_orders;"))
        
        print("Truncating products...")
        db.session.execute(text("TRUNCATE TABLE products;"))

        print("Truncating categories...")
        db.session.execute(text("TRUNCATE TABLE categories;"))

        print("Truncating collections...")
        db.session.execute(text("TRUNCATE TABLE collections;"))

        print("Truncating popup_ads...")
        db.session.execute(text("TRUNCATE TABLE popup_ads;"))

        print("Truncating coupons...")
        db.session.execute(text("TRUNCATE TABLE coupons;"))

        print("Truncating notifications...")
        db.session.execute(text("TRUNCATE TABLE notifications;"))

        print("Truncating system_logs...")
        db.session.execute(text("TRUNCATE TABLE system_logs;"))

        print("Truncating admins...")
        db.session.execute(text("TRUNCATE TABLE admins;"))

        print("Truncating shops...")
        db.session.execute(text("TRUNCATE TABLE shops;"))
        
        # Reset AUTO_INCREMENT counters explicitly
        print("Resetting AUTO_INCREMENT counters...")
        db.session.execute(text("ALTER TABLE products AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE orders AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE customization_orders AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE categories AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE collections AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE popup_ads AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE coupons AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE notifications AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE system_logs AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE admins AUTO_INCREMENT = 1;"))
        db.session.execute(text("ALTER TABLE shops AUTO_INCREMENT = 1;"))
        
        # Re-enable foreign key checks
        db.session.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        
        db.session.commit()
        print("Success! Database fully cleared. All ID counters reset to 1.")
    except Exception as e:
        db.session.rollback()
        print(f"Error resetting database: {e}")
