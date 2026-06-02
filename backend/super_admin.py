from flask import Blueprint, request, jsonify, current_app
from models import db, SuperAdmin, Shop, Admin, User, Order, SystemLog
from auth_middleware import generate_token, token_required, role_required

super_admin_bp = Blueprint('super_admin', __name__)

def log_system_action(actor_type, actor_id, username, action, shop_id=None):
    try:
        log = SystemLog(
            actor_type=actor_type,
            actor_id=actor_id,
            username=username,
            action=action,
            shop_id=shop_id
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print("Log error:", e)
        db.session.rollback()

@super_admin_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    sa = SuperAdmin.query.filter_by(username=username).first()
    if not sa or not sa.check_password(password):
        return jsonify({"error": "Invalid super admin credentials"}), 401

    token = generate_token(sa.id, sa.username, 'super_admin')
    
    # Log login action
    log_system_action('super_admin', sa.id, sa.username, "Super Admin logged in successfully")
    
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": sa.serialize()
    }), 200

@super_admin_bp.route('/logout', methods=['POST'])
@role_required(['super_admin'])
def logout():
    log_system_action('super_admin', request.user['user_id'], request.user['username'], "Super Admin logged out")
    return jsonify({"message": "Logout successful"}), 200

@super_admin_bp.route('/profile', methods=['GET'])
@role_required(['super_admin'])
def get_profile():
    sa = SuperAdmin.query.get(request.user['user_id'])
    if not sa:
        return jsonify({"error": "Super admin profile not found"}), 404
    return jsonify(sa.serialize()), 200

# SHOP MANAGEMENT
@super_admin_bp.route('/shops', methods=['POST'])
@role_required(['super_admin'])
def create_shop():
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({"error": "Shop name is required"}), 400

    shop = Shop(
        name=name,
        logo_url=data.get('logo_url', ''),
        contact_email=data.get('contact_email', ''),
        contact_phone=data.get('contact_phone', ''),
        privacy_policy=data.get('privacy_policy', 'Default Privacy Policy'),
        address=data.get('address', ''),
        sms_api_key=data.get('sms_api_key', ''),
        whatsapp_api_key=data.get('whatsapp_api_key', ''),
        razorpay_key_id=data.get('razorpay_key_id', ''),
        razorpay_key_secret=data.get('razorpay_key_secret', ''),
        super_coin_enabled=data.get('super_coin_enabled', True),
        super_coin_ratio=data.get('super_coin_ratio', 10),
        gst_percentage=float(data.get('gst_percentage', 18.0)),
        gst_inclusive=bool(data.get('gst_inclusive', False)),
        shipping_enabled=bool(data.get('shipping_enabled', False)),
        shipping_charges_type=str(data.get('shipping_charges_type', 'flat')),
        shipping_charges_flat=float(data.get('shipping_charges_flat', 0.0))
    )

    db.session.add(shop)
    db.session.commit()

    log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Created shop '{name}' (ID: {shop.id})")

    return jsonify({"message": "Shop created successfully", "shop": shop.serialize()}), 201

@super_admin_bp.route('/shops', methods=['GET'])
@token_required
def list_shops():
    # Anyone authenticated can get lists of shops (or even unauthenticated - we will allow that on app.py OPAC)
    shops = Shop.query.all()
    return jsonify([s.serialize() for s in shops]), 200

@super_admin_bp.route('/shops/<int:shop_id>', methods=['GET'])
def get_shop(shop_id):
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"error": "Shop not found"}), 404
    return jsonify(shop.serialize()), 200

@super_admin_bp.route('/shops/<int:shop_id>', methods=['PUT'])
@role_required(['super_admin'])
def update_shop(shop_id):
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    data = request.get_json() or {}
    
    if 'name' in data:
        shop.name = data['name']
    if 'logo_url' in data:
        shop.logo_url = data['logo_url']
    if 'contact_email' in data:
        shop.contact_email = data['contact_email']
    if 'contact_phone' in data:
        shop.contact_phone = data['contact_phone']
    if 'privacy_policy' in data:
        shop.privacy_policy = data['privacy_policy']
    if 'address' in data:
        shop.address = data['address']
    
    # API credentials updates
    if 'sms_api_key' in data:
        shop.sms_api_key = data['sms_api_key']
    if 'whatsapp_api_key' in data:
        shop.whatsapp_api_key = data['whatsapp_api_key']
    if 'razorpay_key_id' in data:
        shop.razorpay_key_id = data['razorpay_key_id']
    if 'razorpay_key_secret' in data:
        shop.razorpay_key_secret = data['razorpay_key_secret']
        
    # Supercoin rules
    if 'super_coin_enabled' in data:
        shop.super_coin_enabled = bool(data['super_coin_enabled'])
    if 'super_coin_ratio' in data:
        shop.super_coin_ratio = int(data['super_coin_ratio'])
    if 'gst_percentage' in data:
        shop.gst_percentage = float(data['gst_percentage'])
    if 'gst_inclusive' in data:
        shop.gst_inclusive = bool(data['gst_inclusive'])
    if 'shipping_enabled' in data:
        shop.shipping_enabled = bool(data['shipping_enabled'])
    if 'shipping_charges_type' in data:
        shop.shipping_charges_type = str(data['shipping_charges_type'])
    if 'shipping_charges_flat' in data:
        shop.shipping_charges_flat = float(data['shipping_charges_flat'])

    db.session.commit()

    log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Updated configurations for shop '{shop.name}' (ID: {shop.id})")

    return jsonify({"message": "Shop settings updated successfully", "shop": shop.serialize()}), 200

@super_admin_bp.route('/shops/<int:shop_id>', methods=['DELETE'])
@role_required(['super_admin'])
def delete_shop(shop_id):
    from models import CustomizationOrder, Collection, Notification, HelpTicket, Coupon, PopupAd, Product, Category, Admin, Order, OrderItem, Review, CartItem, WishlistItem, SystemLog
    import os
    import json

    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    shop_name = shop.name
    upload_folder = current_app.config.get('UPLOAD_FOLDER')

    def delete_file(url):
        if not url or not isinstance(url, str) or not upload_folder:
            return
        # Handle relative or absolute API urls
        if url.startswith('/api/uploads/'):
            filename = url.replace('/api/uploads/', '')
            filename = os.path.basename(filename)  # sanitize
            filepath = os.path.join(upload_folder, filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                    print(f"Deleted upload photo: {filepath}")
                except Exception as e:
                    print(f"Error deleting file {filepath}: {e}")

    try:
        # 1. Delete physical photo uploads associated with the shop's entities
        # Shop logo
        if shop.logo_url:
            delete_file(shop.logo_url)
            
        # Shop banners
        if shop.banners_json:
            try:
                banners = json.loads(shop.banners_json)
                for banner in banners:
                    if isinstance(banner, dict) and 'image' in banner:
                        delete_file(banner['image'])
            except Exception as e:
                print(f"Error parsing banners_json for photo deletion: {e}")

        # Products (images)
        products = Product.query.filter_by(shop_id=shop_id).all()
        product_ids = [p.id for p in products]
        for p in products:
            if p.images_json:
                try:
                    images = json.loads(p.images_json)
                    for img in images:
                        delete_file(img)
                except Exception as e:
                    print(f"Error parsing images_json for product {p.id}: {e}")

        # Categories (images)
        categories = Category.query.filter_by(shop_id=shop_id).all()
        for cat in categories:
            if cat.image_url:
                delete_file(cat.image_url)

        # Reviews (images)
        if product_ids:
            reviews = Review.query.filter(Review.product_id.in_(product_ids)).all()
            for rev in reviews:
                if rev.image_url:
                    delete_file(rev.image_url)

        # Orders (return request images)
        orders = Order.query.filter_by(shop_id=shop_id).all()
        order_ids = [o.id for o in orders]
        for o in orders:
            if o.return_image_url:
                delete_file(o.return_image_url)

        # 2. Step-by-step cascading database record deletion to prevent foreign key errors on MySQL
        # Customization orders
        CustomizationOrder.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Collections
        Collection.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Notifications
        Notification.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Help tickets
        HelpTicket.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Coupons
        Coupon.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Popup ads
        PopupAd.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Reviews, Cart Items, and Wishlist Items associated with shop's products
        if product_ids:
            Review.query.filter(Review.product_id.in_(product_ids)).delete(synchronize_session=False)
            CartItem.query.filter(CartItem.product_id.in_(product_ids)).delete(synchronize_session=False)
            WishlistItem.query.filter(WishlistItem.product_id.in_(product_ids)).delete(synchronize_session=False)

        # Order Items and Orders
        if order_ids:
            OrderItem.query.filter(OrderItem.order_id.in_(order_ids)).delete(synchronize_session=False)
        Order.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Products
        Product.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Categories
        Category.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Admins
        Admin.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # System Logs (related to shop)
        SystemLog.query.filter_by(shop_id=shop_id).delete(synchronize_session=False)

        # Finally, delete the shop itself
        db.session.delete(shop)
        db.session.commit()

        # Log system action
        log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Wiped and deleted shop '{shop_name}' (ID: {shop_id})")

        return jsonify({"message": f"Shop '{shop_name}' and all associated database records/photos wiped successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to wipe shop data: {str(e)}"}), 500

# ADMIN CREATION & ALLOCATION
@super_admin_bp.route('/admins', methods=['POST'])
@role_required(['super_admin'])
def create_admin():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    shop_id = data.get('shop_id')

    if not all([username, password, email, shop_id]):
        return jsonify({"error": "Username, password, email, and shop_id are required"}), 400

    # Verify shop exists
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"error": f"Shop with ID {shop_id} does not exist"}), 404

    # Check duplicate admin
    existing = Admin.query.filter_by(username=username).first()
    if existing:
        return jsonify({"error": "Admin username already exists"}), 400

    admin = Admin(
        username=username,
        email=email,
        name=data.get('name', username),
        shop_id=shop_id,
        is_active=data.get('is_active', True)
    )
    admin.set_password(password)

    db.session.add(admin)
    db.session.commit()

    log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Created Admin '{username}' for shop '{shop.name}'")

    return jsonify({"message": "Admin user created successfully", "admin": admin.serialize()}), 201

@super_admin_bp.route('/admins', methods=['GET'])
@role_required(['super_admin'])
def list_admins():
    admins = Admin.query.all()
    # Serialize with shop info
    res = []
    for a in admins:
        item = a.serialize()
        shop = Shop.query.get(a.shop_id)
        item['shop_name'] = shop.name if shop else "Deleted Shop"
        res.append(item)
    return jsonify(res), 200

@super_admin_bp.route('/admins/<int:admin_id>', methods=['PUT'])
@role_required(['super_admin'])
def update_admin(admin_id):
    admin = Admin.query.get(admin_id)
    if not admin:
        return jsonify({"error": "Admin not found"}), 404

    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    name = data.get('name')
    shop_id = data.get('shop_id')
    password = data.get('password')

    if not all([username, email, shop_id]):
        return jsonify({"error": "Username, email, and shop_id are required"}), 400

    # Verify shop exists
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"error": f"Shop with ID {shop_id} does not exist"}), 404

    # Check duplicate admin username
    if username != admin.username:
        existing = Admin.query.filter_by(username=username).first()
        if existing:
            return jsonify({"error": "Admin username already exists"}), 400

    admin.username = username
    admin.email = email
    admin.name = name if name else username
    admin.shop_id = shop_id
    if 'is_active' in data:
        admin.is_active = bool(data['is_active'])

    if password and password.strip():
        admin.set_password(password)

    db.session.commit()

    log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Updated Admin '{username}' for shop '{shop.name}'")

    res_data = admin.serialize()
    res_data['shop_name'] = shop.name
    return jsonify({"message": "Admin user updated successfully", "admin": res_data}), 200

@super_admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])
@role_required(['super_admin'])
def delete_admin(admin_id):
    admin = Admin.query.get(admin_id)
    if not admin:
        return jsonify({"error": "Admin not found"}), 404

    admin_username = admin.username
    db.session.delete(admin)
    db.session.commit()

    log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Deleted Admin '{admin_username}'")

    return jsonify({"message": "Admin user deleted successfully"}), 200

# LOGS AUDITING AND USER TRACKING
@super_admin_bp.route('/logs', methods=['GET'])
@role_required(['super_admin'])
def get_logs():
    shop_id = request.args.get('shop_id')
    actor_type = request.args.get('actor_type')
    
    query = SystemLog.query
    if shop_id:
        query = query.filter_by(shop_id=int(shop_id))
    if actor_type:
        query = query.filter_by(actor_type=actor_type)
        
    logs = query.order_by(SystemLog.created_at.desc()).all()
    return jsonify([log.serialize() for log in logs]), 200

@super_admin_bp.route('/orders', methods=['GET'])
@role_required(['super_admin'])
def get_all_orders():
    shop_id = request.args.get('shop_id')
    
    query = Order.query
    if shop_id:
        query = query.filter_by(shop_id=int(shop_id))
        
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.serialize() for o in orders]), 200

# CUSTOMER MANAGEMENT
@super_admin_bp.route('/customers', methods=['GET'])
@role_required(['super_admin'])
def list_customers():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.serialize() for u in users]), 200

@super_admin_bp.route('/customers/<int:user_id>', methods=['DELETE'])
@role_required(['super_admin'])
def delete_customer(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Customer account not found"}), 404

    username = user.username
    db.session.delete(user)
    db.session.commit()

    log_system_action('super_admin', request.user['user_id'], request.user['username'], f"Deleted customer '{username}' (ID: {user_id})")

    return jsonify({"message": "Customer account and all associated data deleted successfully"}), 200
