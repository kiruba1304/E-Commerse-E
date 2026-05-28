from flask import Blueprint, request, jsonify, send_file, render_template_string
from models import db, Admin, Shop, Product, Category, Order, OrderItem, PopupAd, Coupon, Review, User, SystemLog, Notification, Collection, CustomizationOrder
from auth_middleware import generate_token, token_required, role_required
from datetime import datetime, timezone
import json

admin_bp = Blueprint('admin', __name__)

def log_admin_action(admin_id, username, shop_id, action):
    try:
        log = SystemLog(
            actor_type='admin',
            actor_id=admin_id,
            username=username,
            action=action,
            shop_id=shop_id
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print("Log error:", e)
        db.session.rollback()

@admin_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not admin.check_password(password) or not admin.is_active:
        return jsonify({"error": "Invalid admin credentials or account is suspended"}), 401

    token = generate_token(admin.id, admin.username, 'admin', admin.shop_id)
    
    # Log login
    log_admin_action(admin.id, admin.username, admin.shop_id, "Admin logged in successfully")
    
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": admin.serialize()
    }), 200

@admin_bp.route('/logout', methods=['POST'])
@role_required(['admin'])
def logout():
    user = request.user
    log_admin_action(user['user_id'], user['username'], user['shop_id'], "Admin logged out")
    return jsonify({"message": "Logout successful"}), 200

@admin_bp.route('/profile', methods=['GET', 'PUT'])
@role_required(['admin'])
def manage_profile():
    admin = Admin.query.get(request.user['user_id'])
    if not admin:
        return jsonify({"error": "Admin not found"}), 404

    if request.method == 'GET':
        return jsonify(admin.serialize()), 200
    
    data = request.get_json() or {}
    if 'name' in data:
        admin.name = data['name']
    if 'email' in data:
        admin.email = data['email']
    if 'password' in data and data['password']:
        admin.set_password(data['password'])
        
    db.session.commit()
    log_admin_action(admin.id, admin.username, admin.shop_id, "Updated admin profile details")
    
    return jsonify({"message": "Profile updated successfully", "admin": admin.serialize()}), 200

@admin_bp.route('/shop', methods=['GET', 'PUT'])
@role_required(['admin'])
def manage_shop():
    shop = Shop.query.get(request.user['shop_id'])
    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    if request.method == 'GET':
        return jsonify(shop.serialize()), 200
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
    if 'sms_api_key' in data:
        shop.sms_api_key = data['sms_api_key']
    if 'whatsapp_api_key' in data:
        shop.whatsapp_api_key = data['whatsapp_api_key']
    if 'razorpay_key_id' in data:
        shop.razorpay_key_id = data['razorpay_key_id']
    if 'razorpay_key_secret' in data:
        shop.razorpay_key_secret = data['razorpay_key_secret']
    if 'billing_api_key' in data:
        shop.billing_api_key = data['billing_api_key']
    if 'gst_percentage' in data:
        try:
            shop.gst_percentage = float(data['gst_percentage'])
        except ValueError:
            return jsonify({"error": "Invalid GST percentage value"}), 400
    if 'gst_inclusive' in data:
        shop.gst_inclusive = bool(data['gst_inclusive'])
    if 'saree_models' in data:
        shop.saree_models = data['saree_models']
    if 'banners' in data:
        shop.banners = data['banners']
    if 'smtp_host' in data:
        shop.smtp_host = data['smtp_host']
    if 'smtp_port' in data:
        try:
            shop.smtp_port = int(data['smtp_port']) if data['smtp_port'] else None
        except ValueError:
            return jsonify({"error": "Invalid SMTP port value"}), 400
    if 'smtp_user' in data:
        shop.smtp_user = data['smtp_user']
    if 'smtp_password' in data:
        shop.smtp_password = data['smtp_password']
    if 'smtp_use_tls' in data:
        shop.smtp_use_tls = bool(data['smtp_use_tls'])
    if 'smtp_sender_name' in data:
        shop.smtp_sender_name = data['smtp_sender_name']
    if 'email_templates' in data:
        shop.email_templates = data['email_templates']
    if 'color_palette' in data:
        shop.color_palette = data['color_palette']
    if 'customization_min_quantity' in data:
        try:
            shop.customization_min_quantity = int(data['customization_min_quantity'])
        except ValueError:
            return jsonify({"error": "Invalid customization minimum quantity"}), 400

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop.id, "Updated shop details & payment integrations")
    return jsonify({"message": "Shop settings updated successfully", "shop": shop.serialize()}), 200


@admin_bp.route('/billing-status', methods=['GET'])
@role_required(['admin'])
def billing_status_page():
    """Serve a small admin page that polls the billing sync status for the current shop."""
    shop = Shop.query.get(request.user['shop_id'])
    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    api_key = shop.billing_api_key or ''
    api_key_json = json.dumps(api_key)

    html = '''
    <!doctype html>
    <html>
        <head>
            <meta charset="utf-8" />
            <title>Billing App Status</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; }
                .status { display:flex; align-items:center; gap:12px; }
                .dot { width:14px; height:14px; border-radius:50%; background:#999 }
                .online { background: #22c55e }
                .offline { background: #ef4444 }
            </style>
        </head>
        <body>
            <h2>Billing Desktop Presence</h2>
            <div class="status">
                <div id="dot" class="dot offline"></div>
                <div>
                    <div id="state">Checking...</div>
                    <div id="last">Last seen: N/A</div>
                </div>
            </div>

            <script>
                const apiKey = {{ api_key_json|safe }};
                async function fetchStatus(){
                    try{
                        const url = '/api/billing/sync/status?api_key=' + encodeURIComponent(apiKey);
                        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
                        if (!res.ok) throw new Error('Network');
                        const j = await res.json();
                        const st = j.billing_status || {};
                        const isOnline = !!st.is_online;
                        document.getElementById('dot').className = 'dot ' + (isOnline ? 'online' : 'offline');
                        document.getElementById('state').textContent = isOnline ? 'Online' : 'Offline';
                        document.getElementById('last').textContent = 'Last seen: ' + (st.last_seen_at || 'N/A');
                    }catch(e){
                        document.getElementById('dot').className = 'dot offline';
                        document.getElementById('state').textContent = 'Error';
                        document.getElementById('last').textContent = '';
                    }
                }

                fetchStatus();
                setInterval(fetchStatus, 10000);
            </script>
        </body>
    </html>
    '''

    return render_template_string(html, api_key_json=api_key_json)

@admin_bp.route('/shop/test-smtp', methods=['POST'])
@role_required(['admin'])
def test_smtp_configuration():
    shop = Shop.query.get(request.user['shop_id'])
    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    data = request.get_json() or {}
    recipient = data.get('recipient')
    if not recipient:
        return jsonify({"error": "Recipient email is required"}), 400

    # Temporarily override with unsaved config details if sent for pre-testing
    templates_data = data.get('email_templates', None)
    if templates_data:
        import json
        templates_json = json.dumps(templates_data)
    else:
        templates_json = shop.email_templates_json

    test_shop = Shop(
        id=shop.id,
        name=shop.name,
        smtp_host=data.get('smtp_host', shop.smtp_host),
        smtp_port=int(data.get('smtp_port')) if data.get('smtp_port') else shop.smtp_port,
        smtp_user=data.get('smtp_user', shop.smtp_user),
        smtp_password=data.get('smtp_password', shop.smtp_password),
        smtp_use_tls=bool(data.get('smtp_use_tls', shop.smtp_use_tls)),
        smtp_sender_name=data.get('smtp_sender_name', shop.smtp_sender_name),
        email_templates_json=templates_json
    )

    from mail_sender import send_shop_email
    # We will test using a simple test payload
    placeholders = {
        "name": "Admin Tester",
        "otp": "123456",
        "reset_link": "http://localhost:5173/reset?token=test",
        "order_id": "9999",
        "total_amount": "999.00",
        "items": "1x Test Item",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    test_template_type = data.get('template_type', 'otp')
    success = send_shop_email(test_shop, test_template_type, recipient, placeholders, sender_info={
        "actor_type": "admin",
        "actor_id": request.user['user_id'],
        "username": request.user['username']
    })
    if success:
        return jsonify({"message": f"Test email sent successfully to {recipient}!"}), 200
    else:
        return jsonify({"error": "Failed to send email. Check your SMTP settings and logs."}), 500


# CATEGORY MANAGEMENT
@admin_bp.route('/categories', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_categories():
    shop_id = request.user['shop_id']
    
    if request.method == 'GET':
        categories = Category.query.filter_by(shop_id=shop_id).all()
        return jsonify([c.serialize() for c in categories]), 200

    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({"error": "Category name is required"}), 400

    cat = Category(
        name=name,
        description=data.get('description', ''),
        image_url=data.get('image_url', ''),
        shop_id=shop_id,
        customization_enabled=bool(data.get('customization_enabled', False))
    )
    db.session.add(cat)
    db.session.commit()
    
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Created product category '{name}'")
    return jsonify(cat.serialize()), 201

@admin_bp.route('/categories/<int:cat_id>', methods=['PUT', 'DELETE'])
@role_required(['admin'])
def modify_category(cat_id):
    shop_id = request.user['shop_id']
    cat = Category.query.filter_by(id=cat_id, shop_id=shop_id).first()
    if not cat:
        return jsonify({"error": "Category not found"}), 404

    if request.method == 'DELETE':
        # Re-assign products to uncategorized if category deleted
        products = Product.query.filter_by(category_id=cat_id).all()
        for p in products:
            p.category_id = None
        
        name = cat.name
        db.session.delete(cat)
        db.session.commit()
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Deleted product category '{name}'")
        return jsonify({"message": "Category deleted successfully"}), 200

    data = request.get_json() or {}
    if 'name' in data:
        cat.name = data['name']
    if 'description' in data:
        cat.description = data['description']
    if 'image_url' in data:
        cat.image_url = data['image_url']
    if 'customization_enabled' in data:
        cat.customization_enabled = bool(data['customization_enabled'])

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Updated product category '{cat.name}'")
    return jsonify(cat.serialize()), 200

# COLLECTION MANAGEMENT
@admin_bp.route('/collections', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_collections():
    shop_id = request.user['shop_id']
    
    if request.method == 'GET':
        collections = Collection.query.filter_by(shop_id=shop_id).all()
        return jsonify([c.serialize() for c in collections]), 200

    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({"error": "Collection name is required"}), 400

    category_ids = data.get('category_ids', [])
    col = Collection(
        name=name,
        shop_id=shop_id,
        separate_categories_mobile=bool(data.get('separate_categories_mobile', False)),
        show_category_banner=bool(data.get('show_category_banner', True))
    )
    col.category_ids = category_ids
    db.session.add(col)
    db.session.commit()
    
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Created collection '{name}'")
    return jsonify(col.serialize()), 201

@admin_bp.route('/collections/<int:col_id>', methods=['PUT', 'DELETE'])
@role_required(['admin'])
def modify_collection(col_id):
    shop_id = request.user['shop_id']
    col = Collection.query.filter_by(id=col_id, shop_id=shop_id).first()
    if not col:
        return jsonify({"error": "Collection not found"}), 404

    if request.method == 'DELETE':
        name = col.name
        db.session.delete(col)
        db.session.commit()
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Deleted collection '{name}'")
        return jsonify({"message": "Collection deleted successfully"}), 200

    data = request.get_json() or {}
    if 'name' in data:
        col.name = data['name']
    if 'category_ids' in data:
        col.category_ids = data['category_ids']
    if 'separate_categories_mobile' in data:
        col.separate_categories_mobile = bool(data['separate_categories_mobile'])
    if 'show_category_banner' in data:
        col.show_category_banner = bool(data['show_category_banner'])

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Updated collection '{col.name}'")
    return jsonify(col.serialize()), 200

# PRODUCT CATALOG (CRUD with multiple image support up to 10)
@admin_bp.route('/products', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_products():
    shop_id = request.user['shop_id']

    if request.method == 'GET':
        products = Product.query.filter_by(shop_id=shop_id).all()
        return jsonify([p.serialize() for p in products]), 200

    data = request.get_json() or {}
    name = data.get('name')
    price = data.get('price')
    stock = data.get('stock')

    if not name or price is None or stock is None:
        return jsonify({"error": "Name, price, and stock are required fields"}), 400

    images = data.get('images', [])
    if len(images) > 10:
        return jsonify({"error": "A product can have a maximum of 10 images"}), 400

    p = Product(
        name=name,
        description=data.get('description', ''),
        price=float(price),
        original_price=float(data.get('original_price', price)),
        stock=int(stock),
        alert_threshold=int(data.get('alert_threshold', 5)),
        promo_code=data.get('promo_code', ''),
        promo_discount=float(data.get('promo_discount', 0.0)) if data.get('promo_discount') else 0.0,
        bulk_sale_price=float(data['bulk_sale_price']) if data.get('bulk_sale_price') else None,
        min_quantity=int(data['min_quantity']) if data.get('min_quantity') else None,
        category_id=data.get('category_id'),
        shop_id=shop_id,
        customization_enabled=bool(data.get('customization_enabled', False)),
        barcode=data.get('barcode', ''),
        sku_code=data.get('sku_code', ''),
        hsc_code=data.get('hsc_code', '')
    )
    p.images = images  # sets JSON field via property setter
    
    db.session.add(p)
    db.session.commit()

    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Added product '{name}' (Stock: {stock}, Price: {price})")
    
    return jsonify(p.serialize()), 201

@admin_bp.route('/products/<int:prod_id>', methods=['PUT', 'DELETE'])
@role_required(['admin'])
def modify_product(prod_id):
    shop_id = request.user['shop_id']
    p = Product.query.filter_by(id=prod_id, shop_id=shop_id).first()
    if not p:
        return jsonify({"error": "Product not found"}), 404

    if request.method == 'DELETE':
        name = p.name
        db.session.delete(p)
        db.session.commit()
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Deleted product '{name}'")
        return jsonify({"message": "Product deleted successfully"}), 200

    data = request.get_json() or {}
    if 'name' in data:
        p.name = data['name']
    if 'description' in data:
        p.description = data['description']
    if 'price' in data:
        p.price = float(data['price'])
    if 'original_price' in data:
        p.original_price = float(data['original_price'])
    if 'stock' in data:
        p.stock = int(data['stock'])
    if 'alert_threshold' in data:
        p.alert_threshold = int(data['alert_threshold'])
    if 'images' in data:
        images = data['images']
        if len(images) > 10:
            return jsonify({"error": "A product can have a maximum of 10 images"}), 400
        p.images = images
    if 'promo_code' in data:
        p.promo_code = data['promo_code']
    if 'promo_discount' in data:
        p.promo_discount = float(data['promo_discount'])
    if 'bulk_sale_price' in data:
        p.bulk_sale_price = float(data['bulk_sale_price']) if data['bulk_sale_price'] else None
    if 'min_quantity' in data:
        p.min_quantity = int(data['min_quantity']) if data['min_quantity'] else None
    if 'category_id' in data:
        p.category_id = data['category_id']
    if 'customization_enabled' in data:
        p.customization_enabled = bool(data['customization_enabled'])
    if 'barcode' in data:
        p.barcode = data['barcode']
    if 'sku_code' in data:
        p.sku_code = data['sku_code']
    if 'hsc_code' in data:
        p.hsc_code = data['hsc_code']

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Modified product details for '{p.name}'")
    return jsonify(p.serialize()), 200

# INVENTORY MANAGEMENT (Stock Evaluation & Alert)
@admin_bp.route('/inventory', methods=['GET'])
@role_required(['admin'])
def inventory_evaluation():
    shop_id = request.user['shop_id']
    products = Product.query.filter_by(shop_id=shop_id).all()
    
    total_items = 0
    total_value = 0.0
    alerts = []
    
    for p in products:
        total_items += p.stock
        total_value += (p.stock * p.price)
        if p.stock <= p.alert_threshold:
            alerts.append({
                "id": p.id,
                "name": p.name,
                "stock": p.stock,
                "threshold": p.alert_threshold
            })
            
    return jsonify({
        "total_unique_products": len(products),
        "total_stock_count": total_items,
        "total_inventory_value": total_value,
        "alerts": alerts
    }), 200

# REVENUE REPORT AND GRAPHICAL ANALYSIS
@admin_bp.route('/revenue-report', methods=['GET'])
@role_required(['admin'])
def revenue_report():
    shop_id = request.user['shop_id']
    orders = Order.query.filter_by(shop_id=shop_id, status='Customer Received').all()
    
    # We can also get all completed orders to see total revenue
    all_completed = Order.query.filter_by(shop_id=shop_id).filter(Order.status != 'Returned').all()
    
    total_sales = sum([o.final_amount for o in all_completed])
    gst_collected = sum([o.gst_amount for o in all_completed])
    total_orders = len(all_completed)
    
    # Group by category
    category_sales = {}
    # Group by payment method
    payment_sales = {"COD": 0, "UPI": 0}
    # Sales by day (past 7 days simple grouping)
    sales_by_day = {}
    
    for o in all_completed:
        # Payment breakdown
        payment_sales[o.payment_method] = payment_sales.get(o.payment_method, 0) + 1
        
        # Day breakdown
        day_str = o.created_at.strftime('%Y-%m-%d')
        sales_by_day[day_str] = sales_by_day.get(day_str, 0.0) + o.final_amount
        
        # Category breakdown
        for item in o.items:
            prod = Product.query.get(item.product_id)
            cat_name = prod.category.name if (prod and prod.category) else "Uncategorized"
            category_sales[cat_name] = category_sales.get(cat_name, 0.0) + (item.price * item.quantity)
            
    # Format reports for simple React graph components
    cat_data = [{"name": k, "value": round(v, 2)} for k, v in category_sales.items()]
    day_data = [{"date": k, "revenue": round(v, 2)} for k, v in sorted(sales_by_day.items())]
    pay_data = [{"method": k, "count": v} for k, v in payment_sales.items()]
    
    return jsonify({
        "summary": {
            "total_revenue": round(total_sales, 2),
            "gst_collected": round(gst_collected, 2),
            "order_count": total_orders,
            "average_order_value": round(total_sales / total_orders, 2) if total_orders > 0 else 0.0
        },
        "charts": {
            "category_sales": cat_data,
            "daily_sales": day_data,
            "payment_methods": pay_data
        }
    }), 200

# CUSTOMER MANAGEMENT
@admin_bp.route('/customers', methods=['GET'])
@role_required(['admin'])
def list_customers():
    shop_id = request.user['shop_id']
    # Select all registered users in the system
    users = User.query.order_by(User.created_at.desc()).all()
    orders = Order.query.filter_by(shop_id=shop_id).all()
    
    customers = []
    for user in users:
        user_orders = [o for o in orders if o.user_id == user.id]
        total_spent = sum([o.final_amount for o in user_orders])
        customers.append({
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "contact_phone": user.contact_phone,
            "total_orders": len(user_orders),
            "total_spent": round(total_spent, 2),
            "joined_at": user.created_at.isoformat() if user.created_at else None
        })
            
    return jsonify(customers), 200

# ORDER MANAGEMENT (Tracking status: Dispatched, Customer Received, Returns)
@admin_bp.route('/orders', methods=['GET'])
@role_required(['admin'])
def manage_orders():
    shop_id = request.user['shop_id']
    orders = Order.query.filter_by(shop_id=shop_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.serialize() for o in orders]), 200

@admin_bp.route('/orders/<int:order_id>', methods=['PUT'])
@role_required(['admin'])
def update_order_status(order_id):
    shop_id = request.user['shop_id']
    order = Order.query.filter_by(id=order_id, shop_id=shop_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    data = request.get_json() or {}
    status = data.get('status') # Pending, Dispatched, Customer Received, Returned
    tracking_info = data.get('tracking_info')

    if status:
        valid_statuses = ['Pending', 'Accepted', 'Rejected', 'Dispatched', 'Customer Received', 'Returned']
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400
        
        # Handle SuperCoin additions if transitioned to Customer Received
        if status == 'Customer Received' and order.status != 'Customer Received':
            if order.payment_method == 'COD':
                order.payment_status = 'Paid'
            # Add supercoins to user profile
            shop = Shop.query.get(shop_id)
            if shop and shop.super_coin_enabled:
                coins_to_add = int(order.final_amount / shop.super_coin_ratio)
                if coins_to_add > 0:
                    order.user.super_coins += coins_to_add
                    order.super_coins_earned = coins_to_add
                    # Push in-app notification to customer
                    notif = Notification(
                        recipient_type='user',
                        recipient_id=order.user_id,
                        title="SuperCoins Credited!",
                        message=f"Congratulations! You earned {coins_to_add} SuperCoins from your order #{order.id}.",
                        shop_id=shop_id
                    )
                    db.session.add(notif)
        
        order.status = status
        
    if tracking_info is not None:
        order.tracking_info = tracking_info

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Updated order #{order.id} status to '{order.status}'")
    
    return jsonify(order.serialize()), 200

@admin_bp.route('/orders/<int:order_id>/return', methods=['PUT'])
@role_required(['admin'])
def resolve_return_request(order_id):
    shop_id = request.user['shop_id']
    order = Order.query.filter_by(id=order_id, shop_id=shop_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    data = request.get_json() or {}
    decision = data.get('decision') # Approved, Rejected
    if decision not in ['Approved', 'Rejected']:
        return jsonify({"error": "Decision must be 'Approved' or 'Rejected'"}), 400

    if order.return_request_status != 'Pending':
        return jsonify({"error": "No pending return request for this order"}), 400

    order.return_request_status = decision
    if decision == 'Approved':
        order.status = 'Returned'
        # Refund super coins if any were spent
        if order.super_coins_used > 0:
            order.user.super_coins += order.super_coins_used
            
        # Deduct super coins that were earned
        if order.super_coins_earned > 0:
            order.user.super_coins = max(0, order.user.super_coins - order.super_coins_earned)
            
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Approved return request for order #{order.id}")
    else:
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Rejected return request for order #{order.id}")

    db.session.commit()
    
    # Notify User
    notif = Notification(
        recipient_type='user',
        recipient_id=order.user_id,
        title=f"Return Request {decision}",
        message=f"Your return request for order #{order.id} was {decision.lower()}.",
        shop_id=shop_id
    )
    db.session.add(notif)
    db.session.commit()
    
    return jsonify(order.serialize()), 200

# POPUP ADS PUSHING
@admin_bp.route('/popup-ads', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_popup_ads():
    shop_id = request.user['shop_id']

    if request.method == 'GET':
        ads = PopupAd.query.filter_by(shop_id=shop_id).all()
        return jsonify([ad.serialize() for ad in ads]), 200

    data = request.get_json() or {}
    title = data.get('title')
    image_url = data.get('image_url')

    if not title or not image_url:
        return jsonify({"error": "Title and image_url are required"}), 400

    ad = PopupAd(
        title=title,
        image_url=image_url,
        target_url=data.get('target_url', ''),
        show_before_login=bool(data.get('show_before_login', True)),
        show_after_login=bool(data.get('show_after_login', True)),
        is_active=bool(data.get('is_active', True)),
        shop_id=shop_id
    )
    db.session.add(ad)
    db.session.commit()

    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Created popup ad campaign '{title}'")
    return jsonify(ad.serialize()), 201

@admin_bp.route('/popup-ads/<int:ad_id>', methods=['PUT', 'DELETE'])
@role_required(['admin'])
def modify_popup_ad(ad_id):
    shop_id = request.user['shop_id']
    ad = PopupAd.query.filter_by(id=ad_id, shop_id=shop_id).first()
    if not ad:
        return jsonify({"error": "Popup ad not found"}), 404

    if request.method == 'DELETE':
        title = ad.title
        db.session.delete(ad)
        db.session.commit()
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Deleted popup ad '{title}'")
        return jsonify({"message": "Popup ad deleted successfully"}), 200

    data = request.get_json() or {}
    if 'title' in data:
        ad.title = data['title']
    if 'image_url' in data:
        ad.image_url = data['image_url']
    if 'target_url' in data:
        ad.target_url = data['target_url']
    if 'show_before_login' in data:
        ad.show_before_login = bool(data['show_before_login'])
    if 'show_after_login' in data:
        ad.show_after_login = bool(data['show_after_login'])
    if 'is_active' in data:
        ad.is_active = bool(data['is_active'])

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Updated popup ad campaign '{ad.title}'")
    return jsonify(ad.serialize()), 200

# COUPONS MANAGEMENT
@admin_bp.route('/coupons', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_coupons():
    shop_id = request.user['shop_id']

    if request.method == 'GET':
        coupons = Coupon.query.filter_by(shop_id=shop_id).all()
        return jsonify([c.serialize() for c in coupons]), 200

    data = request.get_json() or {}
    code = data.get('code')
    discount_percentage = data.get('discount_percentage')

    if not code or discount_percentage is None:
        return jsonify({"error": "Coupon code and discount percentage are required"}), 400

    # Prevent duplicate coupon code for same shop
    existing = Coupon.query.filter_by(code=code, shop_id=shop_id).first()
    if existing:
        return jsonify({"error": f"Coupon code '{code}' already exists for this shop"}), 400

    c = Coupon(
        code=code.upper(),
        discount_percentage=float(discount_percentage),
        max_discount=float(data.get('max_discount', 1000.0)),
        min_purchase=float(data.get('min_purchase', 0.0)),
        is_active=bool(data.get('is_active', True)),
        shop_id=shop_id
    )
    db.session.add(c)
    db.session.commit()

    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Created discount coupon '{c.code}'")
    return jsonify(c.serialize()), 201

@admin_bp.route('/coupons/<int:coupon_id>', methods=['PUT', 'DELETE'])
@role_required(['admin'])
def modify_coupon(coupon_id):
    shop_id = request.user['shop_id']
    c = Coupon.query.filter_by(id=coupon_id, shop_id=shop_id).first()
    if not c:
        return jsonify({"error": "Coupon not found"}), 404

    if request.method == 'DELETE':
        code = c.code
        db.session.delete(c)
        db.session.commit()
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Deleted coupon '{code}'")
        return jsonify({"message": "Coupon deleted successfully"}), 200

    data = request.get_json() or {}
    if 'code' in data:
        c.code = data['code'].upper()
    if 'discount_percentage' in data:
        c.discount_percentage = float(data['discount_percentage'])
    if 'max_discount' in data:
        c.max_discount = float(data['max_discount'])
    if 'min_purchase' in data:
        c.min_purchase = float(data['min_purchase'])
    if 'is_active' in data:
        c.is_active = bool(data['is_active'])

    db.session.commit()
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Updated coupon code '{c.code}' settings")
    return jsonify(c.serialize()), 200

# GST TAXATION REPORTS
@admin_bp.route('/gst-report', methods=['GET'])
@role_required(['admin'])
def gst_report():
    shop_id = request.user['shop_id']
    shop = Shop.query.get(shop_id)
    
    date_val = request.args.get('date') # YYYY-MM-DD
    month_val = request.args.get('month') # 1-12
    year_val = request.args.get('year') # YYYY
    
    # Calculate tax aggregates from successful sales
    orders = Order.query.filter_by(shop_id=shop_id).filter(Order.status != 'Returned').all()
    
    filtered_orders = []
    for o in orders:
        if not o.created_at:
            continue
        # Apply date filter (YYYY-MM-DD)
        if date_val and o.created_at.strftime('%Y-%m-%d') != date_val:
            continue
        # Apply month filter (1-12)
        if month_val and o.created_at.month != int(month_val):
            continue
        # Apply year filter (YYYY)
        if year_val and o.created_at.year != int(year_val):
            continue
        filtered_orders.append(o)
        
    total_sales_value = sum([o.final_amount for o in filtered_orders])
    total_gst_amount = sum([o.gst_amount for o in filtered_orders])
    
    net_sales = total_sales_value - total_gst_amount
    gst_rate = getattr(shop, 'gst_percentage', 18.0)
    
    reporting_period = "All Time"
    months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    
    if date_val:
        reporting_period = f"Date: {date_val}"
    elif month_val and year_val:
        m_idx = int(month_val)
        m_name = months[m_idx] if 0 < m_idx < 13 else f"Month {month_val}"
        reporting_period = f"{m_name} {year_val}"
    elif month_val:
        m_idx = int(month_val)
        m_name = months[m_idx] if 0 < m_idx < 13 else f"Month {month_val}"
        reporting_period = f"Month: {m_name}"
    elif year_val:
        reporting_period = f"Year: {year_val}"
        
    return jsonify({
        "shop_id": shop_id,
        "reporting_period": reporting_period,
        "net_sales": round(net_sales, 2),
        "gst_rate_applied": f"{gst_rate}% Configured GST",
        "total_gst_collected": round(total_gst_amount, 2),
        "gross_revenue": round(total_sales_value, 2),
        "total_orders_count": len(filtered_orders),
        "orders": [o.serialize() for o in filtered_orders]
    }), 200

@admin_bp.route('/gst-report/export', methods=['GET'])
@role_required(['admin'])
def export_gst_report():
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    shop_id = request.user['shop_id']
    shop = Shop.query.get(shop_id)

    date_val = request.args.get('date') # YYYY-MM-DD
    month_val = request.args.get('month') # 1-12
    year_val = request.args.get('year') # YYYY

    # Calculate tax aggregates from successful sales
    orders = Order.query.filter_by(shop_id=shop_id).filter(Order.status != 'Returned').all()

    filtered_orders = []
    for o in orders:
        if not o.created_at:
            continue
        # Apply date filter (YYYY-MM-DD)
        if date_val and o.created_at.strftime('%Y-%m-%d') != date_val:
            continue
        # Apply month filter (1-12)
        if month_val and o.created_at.month != int(month_val):
            continue
        # Apply year filter (YYYY)
        if year_val and o.created_at.year != int(year_val):
            continue
        filtered_orders.append(o)

    reporting_period = "All Time"
    months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    if date_val:
        reporting_period = f"Date: {date_val}"
    elif month_val and year_val:
        m_idx = int(month_val)
        m_name = months[m_idx] if 0 < m_idx < 13 else f"Month {month_val}"
        reporting_period = f"{m_name} {year_val}"
    elif month_val:
        m_idx = int(month_val)
        m_name = months[m_idx] if 0 < m_idx < 13 else f"Month {month_val}"
        reporting_period = f"Month: {m_name}"
    elif year_val:
        reporting_period = f"Year: {year_val}"

    wb = Workbook()
    ws = wb.active
    ws.title = "GST Report"

    # Explicitly enable grid lines
    ws.views.sheetView[0].showGridLines = True

    # Typography & styles
    font_title = Font(name='Segoe UI', size=16, bold=True, color='2B0B57')
    font_bold = Font(name='Segoe UI', size=11, bold=True)
    font_header = Font(name='Segoe UI', size=11, bold=True, color='FFFFFF')
    font_regular = Font(name='Segoe UI', size=11)

    fill_header = PatternFill(start_color='2B0B57', end_color='2B0B57', fill_type='solid') # Deep purple
    fill_zebra = PatternFill(start_color='F5EEF9', end_color='F5EEF9', fill_type='solid') # Zebra striping purple tint

    align_center = Alignment(horizontal='center', vertical='center')
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    border_thin_side = Side(border_style="thin", color="DDDDDD")
    border_thin = Border(left=border_thin_side, right=border_thin_side, top=border_thin_side, bottom=border_thin_side)

    border_double_bottom = Side(border_style="double", color="2B0B57")
    border_thin_top = Side(border_style="thin", color="2B0B57")
    border_total = Border(top=border_thin_top, bottom=border_double_bottom)

    # Title Banner Row
    ws.merge_cells('A1:H1')
    ws['A1'] = "NOBARAA FASHION - GST TAX ACCOUNTING REPORT"
    ws['A1'].font = font_title
    ws['A1'].alignment = Alignment(horizontal='left', vertical='center')
    ws.row_dimensions[1].height = 40

    # Information row
    ws['A2'] = "Shop Name:"
    ws['A2'].font = font_bold
    ws['B2'] = shop.name if shop else "Nobaraa Fashion"
    ws['B2'].font = font_regular

    ws['D2'] = "Reporting Period:"
    ws['D2'].font = font_bold
    ws['E2'] = reporting_period
    ws['E2'].font = font_regular

    ws['G2'] = "GST Rate:"
    ws['G2'].font = font_bold
    ws['H2'] = f"{getattr(shop, 'gst_percentage', 18.0)}% Configured"
    ws['H2'].font = font_regular

    ws.row_dimensions[2].height = 20
    ws.row_dimensions[3].height = 15 # blank space

    # Headers definition
    headers = [
        "Order ID",
        "Date & Time",
        "Customer",
        "Tax Type",
        "Gross Amount (INR)",
        "Net Sales (INR)",
        "GST Collected (INR)",
        "Status"
    ]

    header_row = 4
    for col_idx, text in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col_idx, value=text)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center if col_idx not in [3, 5, 6, 7] else (align_left if col_idx == 3 else align_right)
        cell.border = border_thin

    ws.row_dimensions[header_row].height = 28

    # Populate Data
    current_row = 5
    total_gross = 0.0
    total_net = 0.0
    total_gst = 0.0

    for o in filtered_orders:
        order_gross = o.final_amount
        order_gst = o.gst_amount
        order_net = order_gross - order_gst

        total_gross += order_gross
        total_net += order_net
        total_gst += order_gst

        created_time = o.created_at.strftime('%Y-%m-%d %I:%M:%S %p') if o.created_at else 'N/A'

        row_data = [
            f"#{o.id}",
            created_time,
            o.user.name if o.user else 'Unknown User',
            "Inclusive" if o.gst_inclusive else "Exclusive",
            order_gross,
            order_net,
            order_gst,
            o.status
        ]

        row_fill = fill_zebra if current_row % 2 == 1 else None

        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=val)
            cell.font = font_regular
            if row_fill:
                cell.fill = row_fill
            cell.border = border_thin

            if col_idx in [1, 4, 8]:
                cell.alignment = align_center
            elif col_idx in [2, 3]:
                cell.alignment = align_left
            else:
                cell.alignment = align_right

            if col_idx in [5, 6, 7]:
                cell.number_format = '₹#,##0.00'

        ws.row_dimensions[current_row].height = 22
        current_row += 1

    # Add Totals Row
    ws.cell(row=current_row, column=1, value="Total Summary").font = font_bold
    ws.cell(row=current_row, column=1).alignment = align_left
    ws.cell(row=current_row, column=1).border = border_total

    for col_idx in range(2, 9):
        ws.cell(row=current_row, column=col_idx).border = border_total

    cell_tot_gross = ws.cell(row=current_row, column=5, value=total_gross)
    cell_tot_gross.font = font_bold
    cell_tot_gross.alignment = align_right
    cell_tot_gross.number_format = '₹#,##0.00'

    cell_tot_net = ws.cell(row=current_row, column=6, value=total_net)
    cell_tot_net.font = font_bold
    cell_tot_net.alignment = align_right
    cell_tot_net.number_format = '₹#,##0.00'

    cell_tot_gst = ws.cell(row=current_row, column=7, value=total_gst)
    cell_tot_gst.font = font_bold
    cell_tot_gst.alignment = align_right
    cell_tot_gst.number_format = '₹#,##0.00'

    ws.row_dimensions[current_row].height = 26

    # Adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.row == 1:
                continue
            val_str = str(cell.value or '')
            if cell.number_format and '₹' in cell.number_format and isinstance(cell.value, (int, float)):
                val_str = f"Rs. {cell.value:,.2f}"
            max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename_period = reporting_period.replace(' ', '_').replace(':', '')
    filename = f"GST_Tax_Report_{filename_period}.xlsx"

    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

# IN-APP NOTIFICATION BROADCASTS
@admin_bp.route('/notifications', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_notifications():
    shop_id = request.user['shop_id']

    if request.method == 'GET':
        notifications = Notification.query.filter_by(shop_id=shop_id, recipient_type='admin').order_by(Notification.created_at.desc()).all()
        return jsonify([n.serialize() for n in notifications]), 200

    data = request.get_json() or {}
    title = data.get('title')
    message = data.get('message')

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    # Broadcast notification to all Users
    notif = Notification(
        recipient_type='user',
        recipient_id=None, # None indicates broadcast
        title=title,
        message=message,
        shop_id=shop_id
    )
    db.session.add(notif)
    db.session.commit()

    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Broadcasted notification alert: '{title}'")
    return jsonify(notif.serialize()), 201

# SUPPORT TICKETS HELP CENTER MANAGEMENT
@admin_bp.route('/help-tickets', methods=['GET', 'PUT'])
@role_required(['admin'])
def manage_help_tickets():
    from models import HelpTicket
    shop_id = request.user['shop_id']

    if request.method == 'GET':
        tickets = HelpTicket.query.filter_by(shop_id=shop_id).order_by(HelpTicket.created_at.desc()).all()
        return jsonify([t.serialize() for t in tickets]), 200

    # PUT request - reply to a ticket
    data = request.get_json() or {}
    ticket_id = data.get('ticket_id')
    reply = data.get('reply')

    if not ticket_id or not reply:
        return jsonify({"error": "Ticket ID and reply content are required"}), 400

    ticket = HelpTicket.query.filter_by(id=ticket_id, shop_id=shop_id).first()
    if not ticket:
        return jsonify({"error": "Help ticket not found"}), 404

    ticket.reply = reply
    ticket.status = 'Resolved'
    db.session.commit()

    # Notify user of reply
    notif = Notification(
        recipient_type='user',
        recipient_id=ticket.user_id,
        title="Help Ticket Replied!",
        message=f"Admin replied to your ticket '{ticket.subject}': {reply[:40]}...",
        shop_id=shop_id
    )
    db.session.add(notif)
    db.session.commit()

    log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Resolved help ticket #{ticket.id} ('{ticket.subject}')")
    return jsonify(ticket.serialize()), 200

# MOCK FAST2SMS AND WHATSAPP CAMPAIGNS LOGGING
@admin_bp.route('/sms-whatsapp-logs', methods=['GET', 'POST'])
@role_required(['admin'])
def manage_messaging():
    shop_id = request.user['shop_id']
    
    if request.method == 'GET':
        # Let's read system logs related to sms / messaging
        logs = SystemLog.query.filter_by(shop_id=shop_id).filter(SystemLog.action.like('%[Message]%')).order_by(SystemLog.created_at.desc()).all()
        
        # Return a list of mock SMS/WhatsApp campaigns
        res = []
        for log in logs:
            parts = log.action.split('|')
            platform = "Fast2SMS" if "SMS" in log.action else "WhatsApp Gateway"
            res.append({
                "id": log.id,
                "timestamp": log.created_at.isoformat(),
                "platform": platform,
                "recipient": parts[1] if len(parts) > 1 else "All Customers",
                "message": parts[2] if len(parts) > 2 else parts[0],
                "status": "Delivered successfully (100% Rate)"
            })
        return jsonify(res), 200

    # POST - send SMS / WhatsApp campaign
    data = request.get_json() or {}
    platform = data.get('platform') # SMS, WhatsApp
    recipient = data.get('recipient', 'All Customers')
    message = data.get('message')

    if not platform or not message:
        return jsonify({"error": "Platform and message content are required"}), 400

    action_str = f"[Message] | {recipient} | {message}"
    log_admin_action(request.user['user_id'], request.user['username'], shop_id, action_str)

    return jsonify({
        "status": "Success",
        "message": f"{platform} campaign successfully dispatched through API key. 100% delivery rate.",
        "details": {
            "platform": platform,
            "recipient": recipient,
            "char_count": len(message),
            "cost_per_message": "0.00" if platform == "WhatsApp" else "0.20 Rupees"
        }
    }), 200

@admin_bp.route('/logs', methods=['GET'])
@role_required(['admin'])
def get_store_logs():
    shop_id = request.user['shop_id']
    logs = SystemLog.query.filter_by(shop_id=shop_id).filter(SystemLog.actor_type != 'super_admin').order_by(SystemLog.created_at.desc()).all()
    return jsonify([log.serialize() for log in logs]), 200

# CUSTOMIZATION ORDER MANAGEMENT
@admin_bp.route('/customizations', methods=['GET'])
@role_required(['admin'])
def list_customizations():
    shop_id = request.user['shop_id']
    custs = CustomizationOrder.query.filter_by(shop_id=shop_id).order_by(CustomizationOrder.created_at.desc()).all()
    return jsonify([c.serialize() for c in custs]), 200

@admin_bp.route('/customizations/<int:cust_id>', methods=['PUT'])
@role_required(['admin'])
def update_customization_status(cust_id):
    shop_id = request.user['shop_id']
    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop_id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404
        
    data = request.get_json() or {}
    if 'status' in data:
        cust.status = data['status']
        db.session.commit()
        
        # Log action
        log_admin_action(request.user['user_id'], request.user['username'], shop_id, f"Updated status of Customization #{cust_id} to '{cust.status}'")
        
    return jsonify({"message": "Customization request updated successfully", "customization": cust.serialize()}), 200
