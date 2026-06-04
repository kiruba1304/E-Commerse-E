import os
import time

# Set default timezone to Indian Standard Time (IST)
os.environ['TZ'] = 'Asia/Kolkata'
if hasattr(time, 'tzset'):
    time.tzset()

import uuid
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from models import db, SuperAdmin, Shop, Admin, User, Category, Product, PopupAd, Coupon, Review, Collection, Order, UploadedFile
from dotenv import load_dotenv
from sqlalchemy import text

import razorpay

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Import blueprints
from super_admin import super_admin_bp
from admin import admin_bp
from user import user_bp
from billing_sync import billing_sync_bp

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
    "https://vishnex.com",
    "https://www.vishnex.com",
    "http://vishnex.com",
    "http://www.vishnex.com",
    "https://co.nobaraafashion.co.in",
    "http://co.nobaraafashion.co.in"
])

# Initialize Razorpay Client
# Replace with your actual Test Key ID and Secret
RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID'
RAZORPAY_KEY_SECRET = 'YOUR_RAZORPAY_KEY_SECRET'

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Database Configuration
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')

def create_database_if_not_exists():
    if DB_USER and DB_PASSWORD and DB_HOST and DB_PORT and DB_NAME:
        try:
            import pymysql
            conn = pymysql.connect(
                host=DB_HOST,
                port=int(DB_PORT),
                user=DB_USER,
                password=DB_PASSWORD
            )
            try:
                with conn.cursor() as cursor:
                    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                conn.commit()
                print(f"Database `{DB_NAME}` verified/created successfully.")
            except Exception as e:
                print(f"Error creating database `{DB_NAME}`: {e}")
            finally:
                conn.close()
        except Exception as e:
            print(f"Warning: Could not connect to MySQL server to verify/create database: {e}")

DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
elif DB_USER and DB_PASSWORD and DB_HOST and DB_PORT and DB_NAME:
    import urllib.parse
    encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
    app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    missing_vars = [var for var, val in {
        "DB_USER": DB_USER,
        "DB_PASSWORD": DB_PASSWORD,
        "DB_HOST": DB_HOST,
        "DB_PORT": DB_PORT,
        "DB_NAME": DB_NAME
    }.items() if not val]
    raise RuntimeError(
        f"Database configuration error: MySQL is required, but the following environment "
        f"variables are missing or empty: {', '.join(missing_vars)}. "
        f"Please configure them in your server/container environment or set DATABASE_URL."
    )
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# File Upload Configuration
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{uuid.uuid4().hex}{ext}"
        
        # Save to database as binary data
        try:
            file_data = file.read()
            mime_type = file.mimetype or "application/octet-stream"
            uploaded_file = UploadedFile(
                filename=unique_filename,
                mime_type=mime_type,
                data=file_data
            )
            db.session.add(uploaded_file)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to save image to database: {str(e)}"}), 500
            
        url = f"/api/uploads/{unique_filename}"
        return jsonify({"url": url}), 200

@app.route('/api/uploads/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    # Try serving from database first
    try:
        base_filename = os.path.basename(filename)
        uploaded_file = UploadedFile.query.get(base_filename)
        if uploaded_file:
            return Response(uploaded_file.data, mimetype=uploaded_file.mime_type)
    except Exception as e:
        print(f"Error fetching upload from DB: {e}")

    # Fallback to serving from the local filesystem for backward compatibility
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def home():
    return jsonify({
        "status": "success",
        "message": "Backend is running successfully!",
        "version": "1.0.0"
    }), 200

@app.route('/api')
def api_home():
    return jsonify({
        "status": "success",
        "message": "E-Commerce API is running successfully!",
        "version": "1.0.0"
    }), 200

create_database_if_not_exists()
db.init_app(app)

# Register Blueprints
app.register_blueprint(super_admin_bp, url_prefix='/api/super-admin')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(billing_sync_bp, url_prefix='/api/billing/sync')

# UNIFIED AUTHENTICATION ENDPOINT
@app.route('/api/auth/login', methods=['POST'])
def unified_login():
    from auth_middleware import generate_token
    from admin import log_admin_action
    from super_admin import log_system_action
    from user import log_user_action

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    # 1. Try Super Admin
    sa = SuperAdmin.query.filter_by(username=username).first()
    if sa and sa.check_password(password):
        token = generate_token(sa.id, sa.username, 'super_admin')
        log_system_action('super_admin', sa.id, sa.username, "Super Admin logged in successfully")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": sa.serialize()
        }), 200

    # 2. Try Admin
    admin = Admin.query.filter_by(username=username).first()
    if admin and admin.check_password(password):
        if not admin.is_active:
            return jsonify({"error": "Invalid admin credentials or account is suspended"}), 401
        token = generate_token(admin.id, admin.username, 'admin', admin.shop_id)
        log_admin_action(admin.id, admin.username, admin.shop_id, "Admin logged in successfully")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": admin.serialize()
        }), 200

    # 3. Try User
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        token = generate_token(user.id, user.username, 'user')
        log_user_action(user.id, user.username, "User logged in successfully", shop_id=data.get('shop_id'))

        # Send login email alert if shop_id is provided
        shop_id = data.get('shop_id')
        if shop_id:
            shop = Shop.query.get(shop_id)
            if shop:
                from mail_sender import send_shop_email
                from datetime import datetime
                try:
                    time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    send_shop_email(shop, "login", user.email, {
                        "name": user.name or user.username,
                        "time": time_str
                    }, sender_info={
                        "actor_type": "user",
                        "actor_id": user.id,
                        "username": user.username
                    })
                except Exception as e:
                    print(f"Error sending login alert email: {e}")

        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": user.serialize()
        }), 200

    return jsonify({"error": "Invalid credentials"}), 401

# OPAC (ONLINE PUBLIC ACCESS CATALOG) PUBLIC ENDPOINTS
@app.route('/api/opac/shops', methods=['GET'])
def opac_list_shops():
    """List all shops with branding for customer select"""
    shops = Shop.query.all()
    return jsonify([s.serialize() for s in shops]), 200

@app.route('/api/opac/products', methods=['GET'])
def opac_list_products():
    """Public catalog with advanced search, category filters, and pricing filter"""
    shop_id = request.args.get('shop_id')
    category_id = request.args.get('category_id')
    search_query = request.args.get('search')
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')

    query = Product.query.filter_by(is_deleted=False)

    if shop_id:
        query = query.filter_by(shop_id=int(shop_id))
    if category_id:
        query = query.filter_by(category_id=int(category_id))
    if search_query:
        query = query.filter(Product.name.like(f"%{search_query}%") | Product.description.like(f"%{search_query}%"))
    if min_price:
        query = query.filter(Product.price >= float(min_price))
    if max_price:
        query = query.filter(Product.price <= float(max_price))

    products = query.all()
    return jsonify([p.serialize() for p in products]), 200

@app.route('/api/opac/products/<int:prod_id>', methods=['GET'])
def opac_product_detail(prod_id):
    """Retrieve complete details for a single product plus reviews"""
    prod = Product.query.filter_by(id=prod_id, is_deleted=False).first()
    if not prod:
        return jsonify({"error": "Product not found"}), 404

    # Fetch product reviews
    reviews = Review.query.filter_by(product_id=prod_id).all()
    
    res = prod.serialize()
    res['reviews'] = [r.serialize() for r in reviews]
    return jsonify(res), 200

@app.route('/api/opac/popup-ads', methods=['GET'])
def opac_list_popup_ads():
    """Get active popup ads for public visitors (before/after login)"""
    shop_id = request.args.get('shop_id')
    display_type = request.args.get('display_type', 'before') # before or after

    query = PopupAd.query.filter_by(is_active=True)
    if shop_id:
        query = query.filter_by(shop_id=int(shop_id))

    if display_type == 'before':
        query = query.filter_by(show_before_login=True)
    else:
        query = query.filter_by(show_after_login=True)

    ads = query.all()
    return jsonify([ad.serialize() for ad in ads]), 200

@app.route('/api/opac/categories', methods=['GET'])
def opac_list_categories():
    """List all categories with cover images for a specific shop"""
    shop_id = request.args.get('shop_id')
    if not shop_id:
        return jsonify({"error": "shop_id is required"}), 400
    categories = Category.query.filter_by(shop_id=int(shop_id)).all()
    return jsonify([c.serialize() for c in categories]), 200

@app.route('/api/opac/collections', methods=['GET'])
def opac_list_collections():
    """List all collections with category mappings for a specific shop"""
    shop_id = request.args.get('shop_id')
    if not shop_id:
        return jsonify({"error": "shop_id is required"}), 400
    collections = Collection.query.filter_by(shop_id=int(shop_id)).all()
    return jsonify([c.serialize() for c in collections]), 200


def make_relative(val):
    if not val:
        return val
    import re
    if isinstance(val, str):
        return re.sub(r'^http://(localhost|127\.0\.0\.1)(:\d+)?/', '/', val)
    elif isinstance(val, list):
        return [make_relative(item) for item in val]
    elif isinstance(val, dict):
        return {k: make_relative(v) for k, v in val.items()}
    return val

def sanitize_database_urls():
    from models import Shop, Category, Product, Review, PopupAd, Order
    import re
    
    def clean_url(url):
        if not url:
            return url
        return re.sub(r'^http://(localhost|127\.0\.0\.1)(:\d+)?/', '/', url)
        
    try:
        # 1. Shops
        for shop in Shop.query.all():
            if shop.logo_url and ('localhost' in shop.logo_url or '127.0.0.1' in shop.logo_url):
                shop.logo_url = clean_url(shop.logo_url)
            if shop.saree_models_json and ('localhost' in shop.saree_models_json or '127.0.0.1' in shop.saree_models_json):
                try:
                    data = json.loads(shop.saree_models_json)
                    cleaned = make_relative(data)
                    shop.saree_models_json = json.dumps(cleaned)
                except Exception:
                    pass
            if shop.banners_json and ('localhost' in shop.banners_json or '127.0.0.1' in shop.banners_json):
                try:
                    data = json.loads(shop.banners_json)
                    cleaned = make_relative(data)
                    shop.banners_json = json.dumps(cleaned)
                except Exception:
                    pass

        # 2. Categories
        for cat in Category.query.all():
            if cat.image_url and ('localhost' in cat.image_url or '127.0.0.1' in cat.image_url):
                cat.image_url = clean_url(cat.image_url)
        
        # 3. Products
        for prod in Product.query.all():
            if prod.images_json and ('localhost' in prod.images_json or '127.0.0.1' in prod.images_json):
                try:
                    images = json.loads(prod.images_json)
                    cleaned_images = [clean_url(img) for img in images]
                    prod.images_json = json.dumps(cleaned_images)
                except Exception:
                    pass
                    
        # 4. Reviews
        for rev in Review.query.all():
            if rev.image_url and ('localhost' in rev.image_url or '127.0.0.1' in rev.image_url):
                rev.image_url = clean_url(rev.image_url)
                
        # 5. Popup Ads
        for ad in PopupAd.query.all():
            if ad.image_url and ('localhost' in ad.image_url or '127.0.0.1' in ad.image_url):
                ad.image_url = clean_url(ad.image_url)
                
        # 6. Orders
        for order in Order.query.all():
            if order.return_image_url and ('localhost' in order.return_image_url or '127.0.0.1' in order.return_image_url):
                order.return_image_url = clean_url(order.return_image_url)
                
        db.session.commit()
        print("Database localhost URLs sanitized successfully.")
    except Exception as e:
        print(f"Error sanitizing database URLs: {e}")

# SQLite to MySQL Data Migration Utility
def migrate_sqlite_to_mysql():
    sqlite_path = os.path.join(BASE_DIR, 'ecommerce.db')
    if not os.path.exists(sqlite_path):
        print("Local SQLite database ecommerce.db not found. Skipping data migration.")
        return

    try:
        import pymysql
    except ImportError:
        print("Warning: pymysql is not installed. SQLite to MySQL data migration skipped.")
        return

    # Check if MySQL has data
    try:
        sa_count = SuperAdmin.query.count()
        shop_count = Shop.query.count()
        if sa_count > 0 or shop_count > 0:
            print("MySQL database already has data. Skipping SQLite to MySQL migration.")
            return
    except Exception as e:
        print(f"Error checking MySQL database contents: {e}. Skipping migration.")
        return

    print("MySQL database is empty. Starting migration from SQLite...")
    
    import sqlite3
    
    # Connect to local SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_curr = sqlite_conn.cursor()
    
    # Connect to MySQL using environmental variables
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_HOST = os.getenv('DB_HOST')
    DB_PORT = os.getenv('DB_PORT')
    DB_NAME = os.getenv('DB_NAME')
    
    try:
        mysql_conn = pymysql.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        mysql_curr = mysql_conn.cursor()
    except Exception as e:
        print(f"Could not connect to MySQL to run migration: {e}")
        sqlite_conn.close()
        return

    try:
        # Disable foreign key checks on MySQL
        mysql_curr.execute("SET FOREIGN_KEY_CHECKS = 0;")
        
        # Get tables from SQLite
        sqlite_curr.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in sqlite_curr.fetchall()]
        
        for table in tables:
            try:
                sqlite_curr.execute(f"SELECT * FROM `{table}`")
                rows = sqlite_curr.fetchall()
                if not rows:
                    print(f"Table `{table}` is empty in SQLite. Skipping.")
                    continue
                    
                columns = rows[0].keys()
                col_names_str = ", ".join([f"`{col}`" for col in columns])
                placeholders = ", ".join(["%s"] * len(columns))
                insert_query = f"INSERT INTO `{table}` ({col_names_str}) VALUES ({placeholders})"
                
                data_to_insert = []
                for row in rows:
                    row_data = []
                    for col in columns:
                        val = row[col]
                        row_data.append(val)
                    data_to_insert.append(row_data)
                    
                mysql_curr.executemany(insert_query, data_to_insert)
                print(f"Migrated {len(data_to_insert)} rows to table `{table}`.")
            except Exception as table_err:
                print(f"Failed to migrate table `{table}`: {table_err}")
            
        mysql_conn.commit()
        print("SQLite to MySQL migration completed successfully!")
    except Exception as e:
        mysql_conn.rollback()
        print(f"Error during SQLite to MySQL migration transaction: {e}")
    finally:
        try:
            mysql_curr.execute("SET FOREIGN_KEY_CHECKS = 1;")
        except Exception:
            pass
        mysql_conn.close()
        sqlite_conn.close()

# SEEDING DATABASE LOGIC
def seed_database():
    with app.app_context():
        db.create_all()
        
        # Ensure all columns exist before running any data checks or queries
        ensure_shop_billing_heartbeat_column()
        ensure_online_order_sequence_columns()
        ensure_dtdc_columns()
        ensure_shipping_columns()
        ensure_show_description_column()
        ensure_last_used_address_id_bigint()
        ensure_cod_enabled_columns()
        
        # Automatic SQLite to MySQL migration if using MySQL
        if db.engine.name == 'mysql':
            try:
                migrate_sqlite_to_mysql()
            except Exception as e:
                print(f"Error during SQLite to MySQL migration: {e}")
                
        backfill_online_order_numbers()
        sanitize_database_urls()

        # Check if already seeded
        if SuperAdmin.query.first() is not None:
            print("Database already seeded.")
            return

        print("Seeding initial database content...")

        # 1. Create Super Admin
        sa = SuperAdmin(username="superadmin")
        sa.set_password("admin123")
        db.session.add(sa)

        # 2. Create Shops
        shop1 = Shop(
            name="Aura Tech Hub",
            logo_url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80",
            contact_email="support@auratech.com",
            contact_phone="+91 98765 43210",
            privacy_policy="At Aura Tech Hub, we protect your personal technology purchase data with state of the art encryption.",
            sms_api_key="FAST2SMS_AURA_KEY_9812",
            whatsapp_api_key="WHATSAPP_AURA_SECRET_0029",
            razorpay_key_id="rzp_test_auraId98",
            razorpay_key_secret="auraSecretKeyRazorPay3029",
            super_coin_enabled=True,
            super_coin_ratio=10
        )
        shop2 = Shop(
            name="Vogue Express",
            logo_url="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150&auto=format&fit=crop&q=80",
            contact_email="vogue@stylexpress.com",
            contact_phone="+91 99999 88888",
            privacy_policy="Vogue Express collects your fashion preferences to build custom collections. We never share your data.",
            sms_api_key="FAST2SMS_VOGUE_KEY_1243",
            whatsapp_api_key="WHATSAPP_VOGUE_SECRET_7761",
            razorpay_key_id="rzp_test_vogueId44",
            razorpay_key_secret="vogueSecretKeyRazorPay1102",
            super_coin_enabled=True,
            super_coin_ratio=5
        )
        shop3 = Shop(
            name="Green Life Decor",
            logo_url="https://images.unsplash.com/photo-1545241047-6083a3684587?w=150&auto=format&fit=crop&q=80",
            contact_email="info@greenlifedecor.org",
            contact_phone="+91 88888 77777",
            privacy_policy="Green Life Decor utilizes eco-friendly practices in server management and fully respects customer privacy.",
            sms_api_key="FAST2SMS_GREEN_KEY_3345",
            whatsapp_api_key="WHATSAPP_GREEN_SECRET_8892",
            razorpay_key_id="rzp_test_greenId12",
            razorpay_key_secret="greenSecretKeyRazorPay9982",
            super_coin_enabled=False,
            super_coin_ratio=10
        )

        db.session.add_all([shop1, shop2, shop3])
        db.session.commit() # Commit to get Shop IDs

        # 3. Create Shop Admins
        admin1 = Admin(username="aura_admin", email="admin@auratech.com", name="Aura Technical Manager", shop_id=shop1.id)
        admin1.set_password("admin123")
        
        admin2 = Admin(username="vogue_admin", email="admin@vogue.com", name="Vogue Styles Coordinator", shop_id=shop2.id)
        admin2.set_password("admin123")
        
        admin3 = Admin(username="green_admin", email="admin@greenlife.org", name="Green Planet Decorator", shop_id=shop3.id)
        admin3.set_password("admin123")

        db.session.add_all([admin1, admin2, admin3])

        # 4. Create Categories
        cat_elect = Category(name="Electronics", description="Laptops, smartphones, audio and smart tech items", shop_id=shop1.id)
        cat_acc = Category(name="Accessories", description="Chargers, keyboards, mouse pads, and wires", shop_id=shop1.id)
        db.session.add_all([cat_elect, cat_acc])

        cat_app = Category(name="Apparel", description="Jackets, shirts, trousers, and skirts", shop_id=shop2.id)
        cat_foot = Category(name="Footwear", description="Sneakers, boots, sandals, and formal wear", shop_id=shop2.id)
        db.session.add_all([cat_app, cat_foot])

        cat_home = Category(name="Home Decor", description="Sustainable bamboo logs, ceramic vases, organic candles", shop_id=shop3.id)
        db.session.add(cat_home)
        db.session.commit()

        # 5. Create Products
        p1 = Product(
            name="MacBook Pro 16\"",
            description="Supercharged by M3 Pro. Extreme battery life, beautiful Liquid Retina XDR screen, 18GB Unified Memory, 512GB SSD.",
            price=199999.00,
            original_price=219999.00,
            stock=12,
            alert_threshold=3,
            category_id=cat_elect.id,
            shop_id=shop1.id
        )
        p1.images = [
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500&auto=format&fit=crop&q=80"
        ]

        p2 = Product(
            name="iPhone 15 Pro Max",
            description="Forged in titanium. A17 Pro chip, customizable Action button, the most powerful iPhone camera system.",
            price=149999.00,
            original_price=159999.00,
            stock=15,
            alert_threshold=4,
            category_id=cat_elect.id,
            shop_id=shop1.id,
            promo_code="IPHONE5K",
            promo_discount=5000.00
        )
        p2.images = [
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto=format&fit=crop&q=80"
        ]

        p3 = Product(
            name="Logitech MX Master 3S",
            description="Ergonomic wireless mouse with ultra-fast scrolling, silent clicks, 8K DPI tracking on any surface.",
            price=9999.00,
            stock=25,
            alert_threshold=5,
            category_id=cat_acc.id,
            shop_id=shop1.id
        )
        p3.images = [
            "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=80"
        ]

        p4 = Product(
            name="Premium Leather Jacket",
            description="Handcrafted vintage brown leather jacket with robust brass zippers. Made from 100% genuine top-grain cowhide.",
            price=12999.00,
            original_price=16999.00,
            stock=8,
            alert_threshold=2,
            category_id=cat_app.id,
            shop_id=shop2.id
        )
        p4.images = [
            "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80"
        ]

        p5 = Product(
            name="Classic Knit Sweater",
            description="Warm woolen sweater in ivory cream. Standard fits, incredibly soft fibers, perfect for elegant layering.",
            price=3499.00,
            stock=20,
            alert_threshold=5,
            category_id=cat_app.id,
            shop_id=shop2.id
        )
        p5.images = [
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=80"
        ]

        p6 = Product(
            name="Sustainable Bamboo Organizer",
            description="Clean up your workspace with our zero-waste desk deck. Holds pencils, phone, note pads, and keys neatly.",
            price=1899.00,
            original_price=2499.00,
            stock=2, # triggers stock alert!
            alert_threshold=3,
            category_id=cat_home.id,
            shop_id=shop3.id
        )
        p6.images = [
            "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=500&auto=format&fit=crop&q=80"
        ]

        p7 = Product(
            name="NoBaraa Royal Silk Saree Collection",
            description="Experience ultimate grandeur with the NoBaraa Signature Silk Saree. Meticulously handcrafted by master weavers, this saree features royal gold zari work, pristine traditional weave structures, and ultra-luxe silk fibers that embody timeless elegance.",
            price=24999.00,
            original_price=29999.00,
            stock=10,
            alert_threshold=2,
            category_id=cat_app.id,
            shop_id=shop2.id
        )
        p7.images = [
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1608748010899-18f300247112?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1610030470213-c350de249d32?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=1200&auto=format&fit=crop&q=80"
        ]

        db.session.add_all([p1, p2, p3, p4, p5, p6, p7])

        # 6. Create Popup Ads
        ad1 = PopupAd(
            title="Tech Carnival Season Open!",
            image_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
            target_url="/shop/1",
            show_before_login=True,
            show_after_login=True,
            is_active=True,
            shop_id=shop1.id
        )
        ad2 = PopupAd(
            title="Vogue VIP Club Signup Offer",
            image_url="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80",
            target_url="/shop/2",
            show_before_login=True,
            show_after_login=False,
            is_active=True,
            shop_id=shop2.id
        )
        db.session.add_all([ad1, ad2])

        # 7. Coupons
        cp1 = Coupon(code="TECH10", discount_percentage=10.0, max_discount=2000.0, min_purchase=5000.0, is_active=True, shop_id=shop1.id)
        cp2 = Coupon(code="WELCOME50", discount_percentage=50.0, max_discount=500.0, min_purchase=800.0, is_active=True, shop_id=shop1.id)
        cp3 = Coupon(code="VOGUE20", discount_percentage=20.0, max_discount=5000.0, min_purchase=2000.0, is_active=True, shop_id=shop2.id)
        db.session.add_all([cp1, cp2, cp3])

        # 8. Create a default customer user for quick logging in
        u = User(username="user", email="user@gmail.com", name="Kirubanithi Customer", contact_phone="+91 94444 33333", super_coins=250)
        u.set_password("user123")
        db.session.add(u)

        db.session.commit()
        print("Database seeding completed successfully.")

def ensure_shop_billing_heartbeat_column():
    if db.engine.name != 'sqlite':
        return
    with db.engine.begin() as connection:
        result = connection.execute(text("PRAGMA table_info(shops)"))
        columns = [row[1] for row in result.fetchall()]
        if 'last_billing_heartbeat_at' not in columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN last_billing_heartbeat_at DATETIME"))


def ensure_dtdc_columns():
    if db.engine.name != 'sqlite':
        return
    with db.engine.begin() as connection:
        shop_result = connection.execute(text("PRAGMA table_info(shops)"))
        shop_columns = [row[1] for row in shop_result.fetchall()]
        if 'dtdc_client_code' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN dtdc_client_code VARCHAR(255)"))
        if 'dtdc_api_key' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN dtdc_api_key VARCHAR(255)"))
        if 'dtdc_api_url' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN dtdc_api_url VARCHAR(255)"))
        if 'return_window_days' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN return_window_days INTEGER DEFAULT 7"))

        cat_result = connection.execute(text("PRAGMA table_info(categories)"))
        cat_columns = [row[1] for row in cat_result.fetchall()]
        if 'return_window_days' not in cat_columns:
            connection.execute(text("ALTER TABLE categories ADD COLUMN return_window_days INTEGER"))

        prod_result = connection.execute(text("PRAGMA table_info(products)"))
        prod_columns = [row[1] for row in prod_result.fetchall()]
        if 'return_window_days' not in prod_columns:
            connection.execute(text("ALTER TABLE products ADD COLUMN return_window_days INTEGER"))
        if 'is_deleted' not in prod_columns:
            connection.execute(text("ALTER TABLE products ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL"))

        order_result = connection.execute(text("PRAGMA table_info(orders)"))
        order_columns = [row[1] for row in order_result.fetchall()]
        if 'shipping_label_url' not in order_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_label_url VARCHAR(255)"))
        if 'delivered_at' not in order_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN delivered_at DATETIME"))

        cust_result = connection.execute(text("PRAGMA table_info(customization_orders)"))
        cust_columns = [row[1] for row in cust_result.fetchall()]
        if 'tracking_info' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN tracking_info VARCHAR(255)"))
        if 'shipping_label_url' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN shipping_label_url VARCHAR(255)"))
        if 'quoted_price' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN quoted_price FLOAT"))
        if 'quote_status' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN quote_status VARCHAR(50) DEFAULT 'Pending'"))
        if 'shipping_address' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN shipping_address TEXT"))
        if 'billing_phone' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN billing_phone VARCHAR(50)"))
        if 'payment_method' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'COD'"))
        if 'payment_status' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN payment_status VARCHAR(50) DEFAULT 'Pending'"))
        if 'razorpay_payment_id' not in cust_columns:
            connection.execute(text("ALTER TABLE customization_orders ADD COLUMN razorpay_payment_id VARCHAR(100)"))

        # Reviews table migration
        review_result = connection.execute(text("PRAGMA table_info(reviews)"))
        review_columns = [row[1] for row in review_result.fetchall()]
        if 'image_url' not in review_columns:
            connection.execute(text("ALTER TABLE reviews ADD COLUMN image_url VARCHAR(255)"))



def ensure_online_order_sequence_columns():
    if db.engine.name != 'sqlite':
        return
    with db.engine.begin() as connection:
        shop_result = connection.execute(text("PRAGMA table_info(shops)"))
        shop_columns = [row[1] for row in shop_result.fetchall()]
        if 'last_online_order_number' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN last_online_order_number INTEGER DEFAULT 0"))

        order_result = connection.execute(text("PRAGMA table_info(orders)"))
        order_columns = [row[1] for row in order_result.fetchall()]
        if 'online_order_number' not in order_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN online_order_number INTEGER"))


def backfill_online_order_numbers():
    try:
        shops = Shop.query.all()
        for shop in shops:
            current_max = db.session.query(db.func.coalesce(db.func.max(Order.online_order_number), 0)).filter(Order.shop_id == shop.id).scalar() or 0
            counter = max(int(shop.last_online_order_number or 0), int(current_max))
            pending_orders = (
                Order.query
                .filter_by(shop_id=shop.id, online_order_number=None)
                .order_by(Order.created_at.asc(), Order.id.asc())
                .all()
            )
            for order in pending_orders:
                counter += 1
                order.online_order_number = counter
            if counter != int(shop.last_online_order_number or 0):
                shop.last_online_order_number = counter
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Online order sequence backfill skipped: {e}")


def ensure_shipping_columns():
    if db.engine.name != 'sqlite':
        return
    with db.engine.begin() as connection:
        shop_result = connection.execute(text("PRAGMA table_info(shops)"))
        shop_columns = [row[1] for row in shop_result.fetchall()]
        if 'shipping_enabled' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN shipping_enabled BOOLEAN DEFAULT 0"))
        if 'shipping_charges_type' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN shipping_charges_type VARCHAR(50) DEFAULT 'flat'"))
        if 'shipping_charges_flat' not in shop_columns:
            connection.execute(text("ALTER TABLE shops ADD COLUMN shipping_charges_flat FLOAT DEFAULT 0.0"))

        cat_result = connection.execute(text("PRAGMA table_info(categories)"))
        cat_columns = [row[1] for row in cat_result.fetchall()]
        if 'shipping_charge' not in cat_columns:
            connection.execute(text("ALTER TABLE categories ADD COLUMN shipping_charge FLOAT DEFAULT 0.0"))

        order_result = connection.execute(text("PRAGMA table_info(orders)"))
        order_columns = [row[1] for row in order_result.fetchall()]
        if 'shipping_charge' not in order_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_charge FLOAT DEFAULT 0.0"))
        if 'shipping_gst' not in order_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_gst FLOAT DEFAULT 0.0"))

def ensure_show_description_column():
    try:
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('categories')]
        if 'show_description' not in columns:
            with db.engine.begin() as connection:
                if db.engine.name == 'sqlite':
                    connection.execute(text("ALTER TABLE categories ADD COLUMN show_description BOOLEAN DEFAULT 0 NOT NULL"))
                else:
                    connection.execute(text("ALTER TABLE categories ADD COLUMN show_description TINYINT(1) DEFAULT 0 NOT NULL"))
            print("Successfully added show_description column to categories table.")
    except Exception as e:
        print(f"Error ensuring show_description column: {e}")

def ensure_last_used_address_id_bigint():
    try:
        if db.engine.name == 'mysql':
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE users MODIFY COLUMN last_used_address_id BIGINT"))
            print("Successfully modified last_used_address_id column to BIGINT on MySQL.")
    except Exception as e:
        print(f"Error ensuring last_used_address_id is BIGINT: {e}")

def ensure_cod_enabled_columns():
    try:
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        
        # 1. Shop table
        columns = [col['name'] for col in inspector.get_columns('shops')]
        if 'cod_enabled' not in columns:
            with db.engine.begin() as connection:
                if db.engine.name == 'sqlite':
                    connection.execute(text("ALTER TABLE shops ADD COLUMN cod_enabled BOOLEAN DEFAULT 1 NOT NULL"))
                else:
                    connection.execute(text("ALTER TABLE shops ADD COLUMN cod_enabled TINYINT(1) DEFAULT 1 NOT NULL"))
            print("Successfully added cod_enabled column to shops table.")
        if 'customization_cod_enabled' not in columns:
            with db.engine.begin() as connection:
                if db.engine.name == 'sqlite':
                    connection.execute(text("ALTER TABLE shops ADD COLUMN customization_cod_enabled BOOLEAN DEFAULT 1 NOT NULL"))
                else:
                    connection.execute(text("ALTER TABLE shops ADD COLUMN customization_cod_enabled TINYINT(1) DEFAULT 1 NOT NULL"))
            print("Successfully added customization_cod_enabled column to shops table.")

        # 2. Product table
        columns = [col['name'] for col in inspector.get_columns('products')]
        if 'cod_enabled' not in columns:
            with db.engine.begin() as connection:
                if db.engine.name == 'sqlite':
                    connection.execute(text("ALTER TABLE products ADD COLUMN cod_enabled BOOLEAN DEFAULT 1 NOT NULL"))
                else:
                    connection.execute(text("ALTER TABLE products ADD COLUMN cod_enabled TINYINT(1) DEFAULT 1 NOT NULL"))
            print("Successfully added cod_enabled column to products table.")
            
    except Exception as e:
        print(f"Error ensuring cod_enabled columns: {e}")

@app.route('/api/create-order', methods=['POST'])
def create_order():
    try:
        data = request.json
        amount = data.get('amount') # Amount should be in INR

        # Razorpay expects the amount in paise (e.g., 500 INR = 50000 paise)
        order_amount = int(amount) * 100 
        order_currency = 'INR'
        
        # Create Order via Razorpay API
        order_receipt = f'receipt_order_{uuid.uuid4().hex[:8]}'
        notes = {'Shipping address': data.get('shipping_address', 'Default Address')}   # Optional
        
        razorpay_order = razorpay_client.order.create(dict(
            amount=order_amount,
            currency=order_currency,
            receipt=order_receipt,
            notes=notes,
            payment_capture='0' # '0' for manual capture, '1' for auto capture
        ))
        
        # Return the order details to the frontend
        return jsonify({
            'status': 'success',
            'order_id': razorpay_order['id'],
            'amount': order_amount,
            'currency': order_currency
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    try:
        data = request.json
        
        # Dictionary of parameters required for signature verification
        params_dict = {
            'razorpay_order_id': data.get('razorpay_order_id'),
            'razorpay_payment_id': data.get('razorpay_payment_id'),
            'razorpay_signature': data.get('razorpay_signature')
        }
        
        # Verify the signature
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # If no exception is thrown, verification is successful
        # (Here you would update your database to mark the order as paid)
        return jsonify({
            'status': 'success', 
            'message': 'Payment verified successfully!'
        })

    except razorpay.errors.SignatureVerificationError:
        return jsonify({
            'status': 'error', 
            'message': 'Payment verification failed!'
        }), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400


if __name__ == '__main__':
    seed_database()
    app.run(host='0.0.0.0', port=5500, debug=True)
