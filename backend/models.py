import os
import json
from datetime import datetime
import bcrypt
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class SuperAdmin(db.Model):
    __tablename__ = 'super_admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": "super_admin"
        }

class Shop(db.Model):
    __tablename__ = 'shops'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    logo_url = db.Column(db.Text, nullable=True)
    contact_email = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    privacy_policy = db.Column(db.Text, nullable=True)
    
    # API credentials
    sms_api_key = db.Column(db.String(255), nullable=True)
    whatsapp_api_key = db.Column(db.String(255), nullable=True)
    razorpay_key_id = db.Column(db.String(255), nullable=True)
    razorpay_key_secret = db.Column(db.String(255), nullable=True)
    
    # Super coin configuration
    super_coin_enabled = db.Column(db.Boolean, default=True)
    super_coin_ratio = db.Column(db.Integer, default=10) # 1 super coin for every 10 currency units spent
    
    saree_models_json = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    admins = db.relationship('Admin', backref='shop', lazy=True, cascade="all, delete-orphan")
    products = db.relationship('Product', backref='shop', lazy=True, cascade="all, delete-orphan")
    categories = db.relationship('Category', backref='shop', lazy=True, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='shop', lazy=True, cascade="all, delete-orphan")
    coupons = db.relationship('Coupon', backref='shop', lazy=True, cascade="all, delete-orphan")
    popup_ads = db.relationship('PopupAd', backref='shop', lazy=True, cascade="all, delete-orphan")
    help_tickets = db.relationship('HelpTicket', backref='shop', lazy=True, cascade="all, delete-orphan")
    logs = db.relationship('SystemLog', backref='shop', lazy=True, cascade="all, delete-orphan")

    @property
    def saree_models(self):
        if not self.saree_models_json:
            return [
                {
                    "id": 1,
                    "image": "/nobaraa_saree_model_1.png?v=2",
                    "name": "Royal Purple Saree",
                    "description": "Intricate gold zari borders woven on rich premium silk."
                },
                {
                    "id": 2,
                    "image": "/nobaraa_saree_model_2.png?v=2",
                    "name": "Cream & Gold Banarasi",
                    "description": "Timeless luxury heritage weave from Varanasi."
                },
                {
                    "id": 3,
                    "image": "/nobaraa_saree_model_3.png?v=2",
                    "name": "Kanjeevaram Magenta",
                    "description": "Vibrant royal pink and gold Kanjeevaram silk."
                }
            ]
        try:
            return json.loads(self.saree_models_json)
        except Exception:
            return []

    @saree_models.setter
    def saree_models(self, value):
        self.saree_models_json = json.dumps(value)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "logo_url": self.logo_url,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "privacy_policy": self.privacy_policy,
            "sms_api_key": self.sms_api_key,
            "whatsapp_api_key": self.whatsapp_api_key,
            "razorpay_key_id": self.razorpay_key_id,
            "razorpay_key_secret": self.razorpay_key_secret,
            "super_coin_enabled": self.super_coin_enabled,
            "super_coin_ratio": self.super_coin_ratio,
            "saree_models": self.saree_models,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "name": self.name,
            "shop_id": self.shop_id,
            "is_active": self.is_active,
            "role": "admin"
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    super_coins = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    orders = db.relationship('Order', backref='user', lazy=True)
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade="all, delete-orphan")
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy=True, cascade="all, delete-orphan")
    reviews = db.relationship('Review', backref='user', lazy=True)
    help_tickets = db.relationship('HelpTicket', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "name": self.name,
            "contact_phone": self.contact_phone,
            "super_coins": self.super_coins,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "role": "user"
        }

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)

    products = db.relationship('Product', backref='category', lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "image_url": self.image_url,
            "shop_id": self.shop_id
        }

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float, nullable=True) # for showing strikethrough discounts
    stock = db.Column(db.Integer, nullable=False, default=0)
    alert_threshold = db.Column(db.Integer, nullable=False, default=5)
    images_json = db.Column(db.Text, nullable=True) # JSON list of image strings (URLs or base64)
    promo_code = db.Column(db.String(50), nullable=True)
    promo_discount = db.Column(db.Float, nullable=True) # discount amount or percentage
    bulk_sale_price = db.Column(db.Float, nullable=True)  # wholesale / bulk price per unit
    min_quantity = db.Column(db.Integer, nullable=True)   # minimum units for bulk pricing
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship('Review', backref='product', lazy=True, cascade="all, delete-orphan")
    cart_items = db.relationship('CartItem', backref='product', lazy=True, cascade="all, delete-orphan")
    wishlist_items = db.relationship('WishlistItem', backref='product', lazy=True, cascade="all, delete-orphan")

    @property
    def images(self):
        if not self.images_json:
            return []
        try:
            return json.loads(self.images_json)
        except Exception:
            return []

    @images.setter
    def images(self, value):
        self.images_json = json.dumps(value)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "original_price": self.original_price if self.original_price else self.price,
            "stock": self.stock,
            "alert_threshold": self.alert_threshold,
            "images": self.images,
            "promo_code": self.promo_code,
            "promo_discount": self.promo_discount,
            "bulk_sale_price": self.bulk_sale_price,
            "min_quantity": self.min_quantity,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else "Uncategorized",
            "shop_id": self.shop_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class PopupAd(db.Model):
    __tablename__ = 'popup_ads'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    image_url = db.Column(db.Text, nullable=True)
    target_url = db.Column(db.Text, nullable=True)
    show_before_login = db.Column(db.Boolean, default=True)
    show_after_login = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "image_url": self.image_url,
            "target_url": self.target_url,
            "show_before_login": self.show_before_login,
            "show_after_login": self.show_after_login,
            "is_active": self.is_active,
            "shop_id": self.shop_id
        }

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    final_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='Pending') # Pending, Dispatched, Customer Received, Returned
    payment_method = db.Column(db.String(50), default='COD') # COD, UPI
    payment_status = db.Column(db.String(50), default='Pending') # Pending, Paid
    tracking_info = db.Column(db.String(255), nullable=True)
    shipping_address = db.Column(db.Text, nullable=False)
    billing_phone = db.Column(db.String(50), nullable=True)
    
    super_coins_earned = db.Column(db.Integer, default=0)
    super_coins_used = db.Column(db.Integer, default=0)
    gst_amount = db.Column(db.Float, default=0.0) # standard calculations
    discount_amount = db.Column(db.Float, default=0.0)
    
    # Return features
    return_request_status = db.Column(db.String(50), default='None') # None, Pending, Approved, Rejected
    return_reason = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown User",
            "shop_id": self.shop_id,
            "shop_name": self.shop.name if self.shop else "Unknown Shop",
            "total_amount": self.total_amount,
            "final_amount": self.final_amount,
            "status": self.status,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "tracking_info": self.tracking_info,
            "shipping_address": self.shipping_address,
            "billing_phone": self.billing_phone,
            "super_coins_earned": self.super_coins_earned,
            "super_coins_used": self.super_coins_used,
            "gst_amount": self.gst_amount,
            "discount_amount": self.discount_amount,
            "return_request_status": self.return_request_status,
            "return_reason": self.return_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.serialize() for item in self.items]
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    def serialize(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "price": self.price,
            "quantity": self.quantity
        }

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "product": self.product.serialize() if self.product else None,
            "quantity": self.quantity
        }

class WishlistItem(db.Model):
    __tablename__ = 'wishlist_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "product": self.product.serialize() if self.product else None
        }

class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Anonymous",
            "product_id": self.product_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Coupon(db.Model):
    __tablename__ = 'coupons'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False)
    discount_percentage = db.Column(db.Float, default=0.0) # discount percentage
    max_discount = db.Column(db.Float, default=1000.0)
    min_purchase = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "code": self.code,
            "discount_percentage": self.discount_percentage,
            "max_discount": self.max_discount,
            "min_purchase": self.min_purchase,
            "is_active": self.is_active,
            "shop_id": self.shop_id
        }

class HelpTicket(db.Model):
    __tablename__ = 'help_tickets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='Open') # Open, Resolved
    reply = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown User",
            "shop_id": self.shop_id,
            "subject": self.subject,
            "message": self.message,
            "status": self.status,
            "reply": self.reply,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    id = db.Column(db.Integer, primary_key=True)
    actor_type = db.Column(db.String(50), nullable=False) # super_admin, admin, user
    actor_id = db.Column(db.Integer, nullable=True)
    username = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(50), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=True) # None for super admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "actor_type": self.actor_type,
            "actor_id": self.actor_id,
            "username": self.username,
            "action": self.action,
            "ip_address": self.ip_address,
            "shop_id": self.shop_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    recipient_type = db.Column(db.String(50), nullable=False) # user, admin
    recipient_id = db.Column(db.Integer, nullable=True) # user_id or admin_id, or null for broadcast
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "recipient_type": self.recipient_type,
            "recipient_id": self.recipient_id,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "shop_id": self.shop_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Collection(db.Model):
    __tablename__ = 'collections'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    category_ids_json = db.Column(db.Text, nullable=True) # JSON array of category IDs
    separate_categories_mobile = db.Column(db.Boolean, default=False)

    @property
    def category_ids(self):
        if not self.category_ids_json:
            return []
        try:
            return json.loads(self.category_ids_json)
        except Exception:
            return []

    @category_ids.setter
    def category_ids(self, value):
        self.category_ids_json = json.dumps(value)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "shop_id": self.shop_id,
            "category_ids": self.category_ids,
            "separate_categories_mobile": self.separate_categories_mobile or False
        }
