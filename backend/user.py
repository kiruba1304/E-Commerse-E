from flask import Blueprint, request, jsonify
from models import db, User, Shop, Product, Category, Order, OrderItem, CartItem, WishlistItem, Review, Coupon, HelpTicket, Notification, SystemLog
from auth_middleware import generate_token, token_required, role_required
from datetime import datetime, timezone
import json

user_bp = Blueprint('user', __name__)

def log_user_action(user_id, username, action, shop_id=None):
    try:
        log = SystemLog(
            actor_type='user',
            actor_id=user_id,
            username=username,
            action=action,
            shop_id=shop_id
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print("Log error:", e)
        db.session.rollback()

# REGISTRATION & LOGIN
@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    name = data.get('name')

    if not username or not password or not email:
        return jsonify({"error": "Username, password, and email are required"}), 400

    existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        return jsonify({"error": "Username or email already exists"}), 400

    user = User(
        username=username,
        email=email,
        name=name or username,
        contact_phone=data.get('contact_phone', ''),
        super_coins=50 # gift 50 super coins on signup!
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    log_user_action(user.id, user.username, "Registered new customer account")

    # Generate token immediately
    token = generate_token(user.id, user.username, 'user')
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": user.serialize()
    }), 201

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid user credentials"}), 401

    token = generate_token(user.id, user.username, 'user')
    
    log_user_action(user.id, user.username, "User logged in successfully")

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.serialize()
    }), 200

@user_bp.route('/logout', methods=['POST'])
@role_required(['user'])
def logout():
    log_user_action(request.user['user_id'], request.user['username'], "User logged out")
    return jsonify({"message": "Logout successful"}), 200

# PROFILE MANAGEMENT
@user_bp.route('/profile', methods=['GET', 'PUT'])
@role_required(['user'])
def manage_profile():
    user = User.query.get(request.user['user_id'])
    if not user:
        return jsonify({"error": "User profile not found"}), 404

    if request.method == 'GET':
        return jsonify(user.serialize()), 200

    data = request.get_json() or {}
    if 'name' in data:
        user.name = data['name']
    if 'contact_phone' in data:
        user.contact_phone = data['contact_phone']
    if 'email' in data:
        user.email = data['email']
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    log_user_action(user.id, user.username, "Updated profile info")
    return jsonify({"message": "Profile updated successfully", "user": user.serialize()}), 200

# PERSONALIZED DASHBOARD
@user_bp.route('/dashboard', methods=['GET'])
@role_required(['user'])
def get_dashboard():
    user_id = request.user['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Personalized Recommendations: pull 4 products
    recommendations = Product.query.limit(4).all()
    
    # Recent orders
    recent_orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).limit(3).all()
    
    # In-app notification alerts count
    unread_notifs = Notification.query.filter(
        (Notification.recipient_type == 'user') & 
        ((Notification.recipient_id == user_id) | (Notification.recipient_id == None)) &
        (Notification.is_read == False)
    ).count()

    return jsonify({
        "super_coins": user.super_coins,
        "recommendations": [p.serialize() for p in recommendations],
        "recent_orders": [o.serialize() for o in recent_orders],
        "unread_notifications_count": unread_notifs
    }), 200

# CART MANAGEMENT
@user_bp.route('/cart', methods=['GET', 'POST'])
@role_required(['user'])
def manage_cart():
    user_id = request.user['user_id']

    if request.method == 'GET':
        items = CartItem.query.filter_by(user_id=user_id).all()
        return jsonify([item.serialize() for item in items]), 200

    data = request.get_json() or {}
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))

    if not product_id:
        return jsonify({"error": "Product ID is required"}), 400

    prod = Product.query.get(product_id)
    if not prod:
        return jsonify({"error": "Product not found"}), 404

    if prod.stock < quantity:
        return jsonify({"error": f"Only {prod.stock} items remaining in stock."}), 400

    # Check if product already in cart
    item = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if item:
        item.quantity = quantity
    else:
        item = CartItem(user_id=user_id, product_id=product_id, quantity=quantity)
        db.session.add(item)

    db.session.commit()
    return jsonify(item.serialize()), 200

@user_bp.route('/cart/<int:cart_item_id>', methods=['DELETE'])
@role_required(['user'])
def delete_cart_item(cart_item_id):
    user_id = request.user['user_id']
    item = CartItem.query.filter_by(id=cart_item_id, user_id=user_id).first()
    if not item:
        return jsonify({"error": "Cart item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item removed from cart"}), 200

# WISHLIST MANAGEMENT
@user_bp.route('/wishlist', methods=['GET', 'POST'])
@role_required(['user'])
def manage_wishlist():
    user_id = request.user['user_id']

    if request.method == 'GET':
        items = WishlistItem.query.filter_by(user_id=user_id).all()
        return jsonify([item.serialize() for item in items]), 200

    data = request.get_json() or {}
    product_id = data.get('product_id')

    if not product_id:
        return jsonify({"error": "Product ID is required"}), 400

    # Prevent duplicates
    existing = WishlistItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({"message": "Product is already in wishlist", "wishlist": existing.serialize()}), 200

    item = WishlistItem(user_id=user_id, product_id=product_id)
    db.session.add(item)
    db.session.commit()
    return jsonify(item.serialize()), 201

@user_bp.route('/wishlist/<int:wishlist_item_id>', methods=['DELETE'])
@role_required(['user'])
def delete_wishlist_item(wishlist_item_id):
    user_id = request.user['user_id']
    item = WishlistItem.query.filter_by(id=wishlist_item_id, user_id=user_id).first()
    if not item:
        return jsonify({"error": "Wishlist item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item removed from wishlist"}), 200

# COUPONS ACTIVE LIST
@user_bp.route('/coupons/<int:shop_id>', methods=['GET'])
@role_required(['user'])
def list_shop_coupons(shop_id):
    coupons = Coupon.query.filter_by(shop_id=shop_id, is_active=True).all()
    return jsonify([c.serialize() for c in coupons]), 200

# CHECKOUT / PLACING AN ORDER
@user_bp.route('/orders', methods=['POST'])
@role_required(['user'])
def create_order():
    user_id = request.user['user_id']
    user = User.query.get(user_id)
    
    data = request.get_json() or {}
    shop_id = data.get('shop_id')
    shipping_address = data.get('shipping_address')
    billing_phone = data.get('billing_phone')
    payment_method = data.get('payment_method', 'COD') # COD, UPI
    coupon_code = data.get('coupon_code')
    use_super_coins = bool(data.get('use_super_coins', False))

    if not shop_id or not shipping_address:
        return jsonify({"error": "Shop ID and shipping address are required"}), 400

    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    # Get user's cart items for this shop
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    # Filter items that belong to the active shop
    shop_items = [item for item in cart_items if item.product.shop_id == shop_id]

    if not shop_items:
        return jsonify({"error": "Your cart is empty for this shop"}), 400

    # Verify stock and calculate raw totals
    total_amount = 0.0
    items_to_buy = []
    
    for ci in shop_items:
        p = ci.product
        if p.stock < ci.quantity:
            return jsonify({"error": f"Product '{p.name}' does not have enough stock. Remaining: {p.stock}"}), 400
        
        # Apply promo discount if active on the product
        item_price = p.price
        if p.promo_code and p.promo_discount > 0:
            # simple flat discount subtraction
            item_price = max(0.0, p.price - p.promo_discount)
            
        total_amount += (item_price * ci.quantity)
        items_to_buy.append((ci, p, item_price))

    # Apply Coupon discount
    discount_amount = 0.0
    if coupon_code:
        coupon = Coupon.query.filter_by(code=coupon_code.upper(), shop_id=shop_id, is_active=True).first()
        if coupon:
            if total_amount >= coupon.min_purchase:
                raw_discount = (coupon.discount_percentage / 100.0) * total_amount
                discount_amount = min(raw_discount, coupon.max_discount)
            else:
                return jsonify({"error": f"Coupon requires a minimum purchase of {coupon.min_purchase}"}), 400
        else:
            return jsonify({"error": "Invalid or inactive coupon code"}), 400

    discounted_amount = total_amount - discount_amount

    # Apply SuperCoins discount
    super_coins_used = 0
    if use_super_coins and shop.super_coin_enabled and user.super_coins > 0:
        # Let's say user can pay up to 30% of the total amount using supercoins (1 supercoin = 1 currency unit)
        max_coin_discount = discounted_amount * 0.3
        coins_to_use = min(user.super_coins, int(max_coin_discount))
        if coins_to_use > 0:
            super_coins_used = coins_to_use
            discounted_amount -= coins_to_use
            user.super_coins -= coins_to_use

    # Calculate 18% standard GST included or added
    # Let's calculate standard GST: final_amount * 0.18
    gst_amount = discounted_amount * 0.18
    final_amount = discounted_amount + gst_amount

    # Deduct stock and clear cart items
    order_items = []
    for ci, p, final_item_price in items_to_buy:
        p.stock -= ci.quantity
        order_item = OrderItem(
            product_id=p.id,
            product_name=p.name,
            price=final_item_price,
            quantity=ci.quantity
        )
        order_items.append(order_item)
        db.session.delete(ci)

    # Create Order
    order = Order(
        user_id=user_id,
        shop_id=shop_id,
        total_amount=round(total_amount, 2),
        final_amount=round(final_amount, 2),
        status='Pending',
        payment_method=payment_method,
        payment_status='Paid' if payment_method == 'UPI' else 'Pending',
        shipping_address=shipping_address,
        billing_phone=billing_phone or user.contact_phone,
        super_coins_used=super_coins_used,
        gst_amount=round(gst_amount, 2),
        discount_amount=round(discount_amount + super_coins_used, 2)
    )
    
    for item in order_items:
        order.items.append(item)

    db.session.add(order)
    db.session.commit()

    # Log purchase
    log_user_action(user_id, user.username, f"Placed order #{order.id} (Amount: {order.final_amount}, Method: {payment_method})", shop_id)
    
    # Notify shop admin of new order
    notif = Notification(
        recipient_type='admin',
        recipient_id=None,
        title="New Order Received",
        message=f"Order #{order.id} was placed by {user.name} for a total of {order.final_amount}.",
        shop_id=shop_id
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({"message": "Order placed successfully", "order": order.serialize()}), 201

# MY ORDERS & RETURN CLAUSES
@user_bp.route('/orders', methods=['GET'])
@role_required(['user'])
def get_my_orders():
    user_id = request.user['user_id']
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.serialize() for o in orders]), 200

@user_bp.route('/orders/<int:order_id>', methods=['GET'])
@role_required(['user'])
def get_order_details(order_id):
    user_id = request.user['user_id']
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.serialize()), 200

@user_bp.route('/orders/<int:order_id>/return', methods=['POST'])
@role_required(['user'])
def request_order_return(order_id):
    user_id = request.user['user_id']
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.status != 'Customer Received':
        return jsonify({"error": "Only delivered orders can be returned"}), 400

    if order.return_request_status != 'None':
        return jsonify({"error": "Return request already submitted or processed"}), 400

    data = request.get_json() or {}
    reason = data.get('reason')
    if not reason:
        return jsonify({"error": "Return reason is required"}), 400

    order.return_request_status = 'Pending'
    order.return_reason = reason
    db.session.commit()

    log_user_action(user_id, request.user['username'], f"Requested return for order #{order.id}. Reason: {reason}", order.shop_id)

    # Notify admin
    notif = Notification(
        recipient_type='admin',
        recipient_id=None,
        title="Return Request Filed",
        message=f"Customer {request.user['username']} has requested a return for order #{order.id}.",
        shop_id=order.shop_id
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({"message": "Return request submitted successfully", "order": order.serialize()}), 200

# PRODUCT REVIEWS
@user_bp.route('/reviews', methods=['POST'])
@role_required(['user'])
def submit_review():
    user_id = request.user['user_id']
    data = request.get_json() or {}
    product_id = data.get('product_id')
    rating = data.get('rating')
    comment = data.get('comment', '')

    if not product_id or not rating:
        return jsonify({"error": "Product ID and rating are required"}), 400

    # Ensure user has actually purchased the product before letting them review (quality gate)
    orders = Order.query.filter_by(user_id=user_id, status='Customer Received').all()
    purchased = False
    for o in orders:
        for item in o.items:
            if item.product_id == product_id:
                purchased = True
                break
        if purchased:
            break

    if not purchased:
         return jsonify({"error": "You can only review products that you have successfully purchased and received"}), 403

    # Check if review already exists
    existing = Review.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        existing.rating = int(rating)
        existing.comment = comment
        review = existing
    else:
        review = Review(
            user_id=user_id,
            product_id=product_id,
            rating=int(rating),
            comment=comment
        )
        db.session.add(review)

    db.session.commit()
    log_user_action(user_id, request.user['username'], f"Submitted {rating}-star review on product ID: {product_id}")
    return jsonify(review.serialize()), 200

# NOTIFICATIONS CENTER FEED
@user_bp.route('/notifications', methods=['GET'])
@role_required(['user'])
def get_notifications():
    user_id = request.user['user_id']
    # Get broadcasts (recipient_id=None) and specific notifications
    notifs = Notification.query.filter(
        (Notification.recipient_type == 'user') & 
        ((Notification.recipient_id == user_id) | (Notification.recipient_id == None))
    ).order_by(Notification.created_at.desc()).all()
    
    return jsonify([n.serialize() for n in notifs]), 200

@user_bp.route('/notifications/read', methods=['POST'])
@role_required(['user'])
def mark_notifications_read():
    user_id = request.user['user_id']
    notifs = Notification.query.filter(
        (Notification.recipient_type == 'user') & 
        ((Notification.recipient_id == user_id) | (Notification.recipient_id == None)) &
        (Notification.is_read == False)
    ).all()
    
    for n in notifs:
        n.is_read = True
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200

# HELPDESK TICKETS SUPPORT
@user_bp.route('/help-tickets', methods=['GET', 'POST'])
@role_required(['user'])
def manage_help_tickets():
    user_id = request.user['user_id']

    if request.method == 'GET':
        tickets = HelpTicket.query.filter_by(user_id=user_id).order_by(HelpTicket.created_at.desc()).all()
        return jsonify([t.serialize() for t in tickets]), 200

    data = request.get_json() or {}
    shop_id = data.get('shop_id')
    subject = data.get('subject')
    message = data.get('message')

    if not all([shop_id, subject, message]):
        return jsonify({"error": "Shop ID, subject, and message are required"}), 400

    ticket = HelpTicket(
        user_id=user_id,
        shop_id=shop_id,
        subject=subject,
        message=message
    )
    db.session.add(ticket)
    db.session.commit()

    log_user_action(user_id, request.user['username'], f"Opened support ticket '{subject}'", shop_id)
    return jsonify(ticket.serialize()), 201
