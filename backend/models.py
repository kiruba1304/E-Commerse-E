import os
import json
from datetime import datetime
import bcrypt
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class SuperAdmin(db.Model):
    __tablename__ = 'super_admins'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    logo_url = db.Column(db.Text, nullable=True)
    contact_email = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    privacy_policy = db.Column(db.Text, nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # API credentials
    sms_api_key = db.Column(db.String(255), nullable=True)
    whatsapp_api_key = db.Column(db.String(255), nullable=True)
    razorpay_key_id = db.Column(db.String(255), nullable=True)
    razorpay_key_secret = db.Column(db.String(255), nullable=True)
    billing_api_key = db.Column(db.String(255), nullable=True)
    last_billing_heartbeat_at = db.Column(db.DateTime, nullable=True)
    
    # DTDC Credentials
    dtdc_client_code = db.Column(db.String(255), nullable=True)
    dtdc_api_key = db.Column(db.String(255), nullable=True)
    dtdc_api_url = db.Column(db.String(255), nullable=True)
    last_online_order_number = db.Column(db.Integer, default=0, nullable=False)
    
    # Super coin configuration
    super_coin_enabled = db.Column(db.Boolean, default=True)
    super_coin_ratio = db.Column(db.Integer, default=10) # 1 super coin for every 10 currency units spent
    
    gst_percentage = db.Column(db.Float, default=18.0)
    gst_inclusive = db.Column(db.Boolean, default=False)
    
    saree_models_json = db.Column(db.Text, nullable=True)
    banners_json = db.Column(db.Text, nullable=True)
    
    # SMTP details
    smtp_host = db.Column(db.String(255), nullable=True)
    smtp_port = db.Column(db.Integer, nullable=True)
    smtp_user = db.Column(db.String(255), nullable=True)
    smtp_password = db.Column(db.String(255), nullable=True)
    smtp_use_tls = db.Column(db.Boolean, default=True)
    smtp_sender_name = db.Column(db.String(255), nullable=True)
    email_templates_json = db.Column(db.Text, nullable=True)
    color_palette_json = db.Column(db.Text, nullable=True)
    customization_min_quantity = db.Column(db.Integer, default=1, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.now)

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

    @property
    def banners(self):
        if not self.banners_json:
            return [
                {
                    "id": 1,
                    "image": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
                    "title": "THE HEIRLOOM HERITAGE",
                    "subtitle": "Meticulous Handloom Artistry, Exquisite Silk Weaves & Royal Zari Borders.",
                    "actionText": "Explore Pure Silks"
                },
                {
                    "id": 2,
                    "image": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&auto=format&fit=crop&q=80",
                    "title": "FESTIVE SOIRÉE DRESSES",
                    "subtitle": "Drape Yourself in Timeless Grace with Contemporary Designer Georgettes.",
                    "actionText": "Shop Georgettes"
                },
                {
                    "id": 3,
                    "image": "https://images.unsplash.com/photo-1608748010899-18f300247112?w=1200&auto=format&fit=crop&q=80",
                    "title": "NOBARAA PRIVILEGE FEST",
                    "subtitle": "Earn SuperCoins & Redeem Up to 30% Extra Savings on Every Elegant Drape.",
                    "actionText": "View Wallet"
                }
            ]
        try:
            return json.loads(self.banners_json)
        except Exception:
            return []

    @banners.setter
    def banners(self, value):
        self.banners_json = json.dumps(value)

    @property
    def email_templates(self):
        if not self.email_templates_json:
            return {
                "otp": {
                    "subject": "Your OTP Code for {shop_name}",
                    "body": "Hello {name},\n\nYour One-Time Password (OTP) is: {otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\n{shop_name}"
                },
                "forgot_password": {
                    "subject": "Reset Password for {shop_name}",
                    "body": "Hello {name},\n\nYou requested to reset your password. Please use this temporary code to reset it: {reset_link}\n\nIf you did not request this, please ignore this mail.\n\nBest regards,\n{shop_name}"
                },
                "purchase": {
                    "subject": "Order Confirmation #{order_id} - {shop_name}",
                    "body": "Hello {name},\n\nThank you for your purchase! We have received your order #{order_id}.\n\nOrder Details:\nTotal Amount: {total_amount}\nItems: {items}\n\nWe will update you once your order is shipped.\n\nBest regards,\n{shop_name}"
                },
                "login": {
                    "subject": "New Login Alert - {shop_name}",
                    "body": "Hello {name},\n\nWe detected a new login to your {shop_name} account on {time}.\n\nIf this was you, no action is needed. Otherwise, please contact support immediately.\n\nBest regards,\n{shop_name}"
                }
            }
        try:
            return json.loads(self.email_templates_json)
        except Exception:
            return {}

    @email_templates.setter
    def email_templates(self, value):
        self.email_templates_json = json.dumps(value)

    @property
    def color_palette(self):
        if not self.color_palette_json:
            # Default premium Indian ethnic-wear color palette (names & hexes)
            return [
                {"name": "Royal Gold", "hex": "#D4AF37"},
                {"name": "Noble Lavender", "hex": "#7a4ea5"},
                {"name": "Crimson Ruby", "hex": "#E84E7E"},
                {"name": "Midnight Indigo", "hex": "#2b0b57"},
                {"name": "Forest Green", "hex": "#228B22"},
                {"name": "Turquoise Teal", "hex": "#008080"}
            ]
        try:
            return json.loads(self.color_palette_json)
        except Exception:
            return []

    @color_palette.setter
    def color_palette(self, value):
        self.color_palette_json = json.dumps(value)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "logo_url": self.logo_url,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "privacy_policy": self.privacy_policy,
            "address": self.address,
            "sms_api_key": self.sms_api_key,
            "whatsapp_api_key": self.whatsapp_api_key,
            "razorpay_key_id": self.razorpay_key_id,
            "razorpay_key_secret": self.razorpay_key_secret,
            "billing_api_key": self.billing_api_key,
            "last_billing_heartbeat_at": self.last_billing_heartbeat_at.isoformat() if self.last_billing_heartbeat_at else None,
            "dtdc_client_code": self.dtdc_client_code,
            "dtdc_api_key": self.dtdc_api_key,
            "dtdc_api_url": self.dtdc_api_url,
            "last_online_order_number": self.last_online_order_number,
            "super_coin_enabled": self.super_coin_enabled,
            "super_coin_ratio": self.super_coin_ratio,
            "gst_percentage": self.gst_percentage,
            "gst_inclusive": self.gst_inclusive,
            "saree_models": self.saree_models,
            "banners": self.banners,
            "color_palette": self.color_palette,
            "customization_min_quantity": self.customization_min_quantity if self.customization_min_quantity is not None else 1,
            "smtp_host": self.smtp_host,
            "smtp_port": self.smtp_port,
            "smtp_user": self.smtp_user,
            "smtp_password": self.smtp_password,
            "smtp_use_tls": self.smtp_use_tls if self.smtp_use_tls is not None else True,
            "smtp_sender_name": self.smtp_sender_name,
            "email_templates": self.email_templates,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Admin(db.Model):
    __tablename__ = 'admins'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    super_coins = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    addresses_json = db.Column(db.Text, nullable=True)
    last_used_address_id = db.Column(db.Integer, nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

    @property
    def addresses(self):
        if not self.addresses_json:
            return []
        try:
            return json.loads(self.addresses_json)
        except Exception:
            return []

    @addresses.setter
    def addresses(self, value):
        self.addresses_json = json.dumps(value)

    # Relationships
    orders = db.relationship('Order', backref='user', lazy=True, cascade="all, delete-orphan")
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade="all, delete-orphan")
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy=True, cascade="all, delete-orphan")
    reviews = db.relationship('Review', backref='user', lazy=True, cascade="all, delete-orphan")
    help_tickets = db.relationship('HelpTicket', backref='user', lazy=True, cascade="all, delete-orphan")

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
            "addresses": self.addresses,
            "last_used_address_id": self.last_used_address_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "role": "user"
        }

class Category(db.Model):
    __tablename__ = 'categories'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    customization_enabled = db.Column(db.Boolean, default=False)

    products = db.relationship('Product', backref='category', lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "image_url": self.image_url,
            "shop_id": self.shop_id,
            "customization_enabled": self.customization_enabled or False
        }

class Product(db.Model):
    __tablename__ = 'products'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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
    customization_enabled = db.Column(db.Boolean, default=False)
    barcode = db.Column(db.String(100), nullable=True)
    sku_code = db.Column(db.String(100), nullable=True)
    hsc_code = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

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
            "customization_enabled": self.customization_enabled or False,
            "barcode": self.barcode or "",
            "sku_code": self.sku_code or "",
            "hsc_code": self.hsc_code or "",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class PopupAd(db.Model):
    __tablename__ = 'popup_ads'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    final_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='Pending') # Pending, Accepted, Rejected, Dispatched, Customer Received, Returned
    payment_method = db.Column(db.String(50), default='COD') # COD, UPI
    payment_status = db.Column(db.String(50), default='Pending') # Pending, Paid
    tracking_info = db.Column(db.String(255), nullable=True)
    online_order_number = db.Column(db.Integer, nullable=True)
    shipping_address = db.Column(db.Text, nullable=False)
    billing_phone = db.Column(db.String(50), nullable=True)
    
    super_coins_earned = db.Column(db.Integer, default=0)
    super_coins_used = db.Column(db.Integer, default=0)
    gst_amount = db.Column(db.Float, default=0.0) # standard calculations
    gst_inclusive = db.Column(db.Boolean, default=False)
    discount_amount = db.Column(db.Float, default=0.0)
    is_synced = db.Column(db.Boolean, default=False, nullable=False)
    
    # Return features
    return_request_status = db.Column(db.String(50), default='None') # None, Pending, Approved, Rejected
    return_reason = db.Column(db.Text, nullable=True)
    return_image_url = db.Column(db.Text, nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    shipping_label_url = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)

    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

    def serialize(self):
        user = self.user
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown User",
            "shop_id": self.shop_id,
            "shop_name": self.shop.name if self.shop else "Unknown Shop",
            "online_order_number": self.online_order_number,
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
            "gst_inclusive": self.gst_inclusive,
            "discount_amount": self.discount_amount,
            "return_request_status": self.return_request_status,
            "return_reason": self.return_reason,
            "return_image_url": self.return_image_url,
            "razorpay_payment_id": self.razorpay_payment_id,
            "shipping_label_url": self.shipping_label_url,
            "is_synced": self.is_synced,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "customer": {
                "name": user.name if user else "Online Customer",
                "phone": self.billing_phone or (user.contact_phone if user else ""),
                "email": user.email if user else "",
                "shipping_address": self.shipping_address
            },
            "items": [item.serialize() for item in self.items]
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    product = db.relationship('Product', backref='order_items_rel', lazy=True)

    def serialize(self):
        product_image = None
        category_name = "Uncategorized"
        barcode = ""
        sku_code = ""
        if self.product:
            product_image = self.product.images[0] if self.product.images else None
            category_name = self.product.category.name if self.product.category else "Uncategorized"
            barcode = self.product.barcode or ""
            sku_code = self.product.sku_code or ""
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "price": self.price,
            "quantity": self.quantity,
            "product_image": product_image,
            "category_name": category_name,
            "barcode": barcode,
            "sku_code": sku_code
        }

class CartItem(db.Model):
    __tablename__ = 'cart_items'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='Open') # Open, Resolved
    reply = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    actor_type = db.Column(db.String(50), nullable=False) # super_admin, admin, user
    actor_id = db.Column(db.Integer, nullable=True)
    username = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(50), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=True) # None for super admin
    created_at = db.Column(db.DateTime, default=datetime.now)

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    recipient_type = db.Column(db.String(50), nullable=False) # user, admin
    recipient_id = db.Column(db.Integer, nullable=True) # user_id or admin_id, or null for broadcast
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    category_ids_json = db.Column(db.Text, nullable=True) # JSON array of category IDs
    separate_categories_mobile = db.Column(db.Boolean, default=False)
    show_category_banner = db.Column(db.Boolean, default=True)

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
            "separate_categories_mobile": self.separate_categories_mobile or False,
            "show_category_banner": self.show_category_banner if self.show_category_banner is not None else True
        }

class OTPVerification(db.Model):
    __tablename__ = 'otp_verifications'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    otp_code = db.Column(db.String(10), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "otp_code": self.otp_code,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_verified": self.is_verified
        }

class CustomizationOrder(db.Model):
    __tablename__ = 'customization_orders'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shops.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    selected_color_name = db.Column(db.String(100), nullable=True)
    selected_color_hex = db.Column(db.String(50), nullable=True)
    customization_notes = db.Column(db.Text, nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    status = db.Column(db.String(50), default='Pending') # Pending, In Progress, Dispatched, Completed, Rejected
    tracking_info = db.Column(db.String(255), nullable=True)
    shipping_label_url = db.Column(db.String(255), nullable=True)
    quoted_price = db.Column(db.Float, nullable=True)
    quote_status = db.Column(db.String(50), default='Pending') # Pending, Quoted, Accepted, Rejected
    shipping_address = db.Column(db.Text, nullable=True)
    billing_phone = db.Column(db.String(50), nullable=True)
    payment_method = db.Column(db.String(50), default='COD')
    payment_status = db.Column(db.String(50), default='Pending')
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship('User', backref=db.backref('customization_orders_rel', lazy=True))
    shop = db.relationship('Shop', backref=db.backref('customization_orders_rel', lazy=True))
    product = db.relationship('Product', backref=db.backref('customization_orders_rel', lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown User",
            "user_email": self.user.email if self.user else "N/A",
            "shop_id": self.shop_id,
            "shop_name": self.shop.name if self.shop else "Unknown Shop",
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Deleted Product",
            "product_image": self.product.images[0] if self.product and self.product.images else None,
            "user_phone": self.billing_phone or (self.user.contact_phone if self.user else "N/A"),
            "shipping_address": self.shipping_address or (self.user.addresses[0].get('address') if self.user and self.user.addresses else "N/A"),
            "selected_color_name": self.selected_color_name,
            "selected_color_hex": self.selected_color_hex,
            "customization_notes": self.customization_notes,
            "quantity": self.quantity if self.quantity is not None else 1,
            "status": self.status,
            "tracking_info": self.tracking_info,
            "shipping_label_url": self.shipping_label_url,
            "quoted_price": self.quoted_price,
            "quote_status": self.quote_status,
            "billing_phone": self.billing_phone,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "razorpay_payment_id": self.razorpay_payment_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
