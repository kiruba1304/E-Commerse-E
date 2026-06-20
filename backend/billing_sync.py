import uuid
from flask import Blueprint, jsonify, request
from models import db, Shop, Product, Category, Order, OrderItem, User, CustomizationOrder
from datetime import datetime, timedelta

billing_sync_bp = Blueprint('billing_sync_bp', __name__)

BILLING_ONLINE_WINDOW_SECONDS = 75

def get_shop_by_api_key(api_key):
    if not api_key:
        return None
    cleaned_key = str(api_key).strip()
    return Shop.query.filter(db.func.lower(Shop.billing_api_key) == cleaned_key.lower()).first()

def serialize_billing_status(shop):
    last_seen = shop.last_billing_heartbeat_at
    is_online = bool(last_seen and (datetime.now() - last_seen) <= timedelta(seconds=BILLING_ONLINE_WINDOW_SECONDS))
    return {
        "is_online": is_online,
        "last_seen_at": last_seen.isoformat() if last_seen else None,
        "offline_after_seconds": BILLING_ONLINE_WINDOW_SECONDS,
    }

@billing_sync_bp.route('/validate', methods=['POST'])
def validate_api_key():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"success": False, "error": "Invalid API key"}), 401
    return jsonify({
        "success": True,
        "shop_name": shop.name,
        "shop_id": shop.id,
        "billing_status": serialize_billing_status(shop)
    }), 200

@billing_sync_bp.route('/heartbeat', methods=['POST'])
def billing_heartbeat():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401

    shop.last_billing_heartbeat_at = datetime.now()

    try:
        db.session.commit()
        return jsonify({"success": True, "billing_status": serialize_billing_status(shop)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@billing_sync_bp.route('/status', methods=['GET', 'POST'])
def billing_status():
    data = request.get_json(silent=True) or {}
    api_key = request.args.get('api_key') or data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401

    return jsonify({
        "success": True,
        "shop_id": shop.id,
        "shop_name": shop.name,
        "billing_status": serialize_billing_status(shop)
    }), 200

@billing_sync_bp.route('/products', methods=['POST'])
def sync_products():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    incoming_products = data.get('products', [])
    incoming_deleted_products = data.get('deleted_products', [])
    
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    # Process incoming deleted products from POS
    for dp_in in incoming_deleted_products:
        barcode = dp_in.get('barcode', '').strip()
        sku_code = dp_in.get('skuCode', '').strip() or dp_in.get('sku_code', '').strip()
        
        product = None
        if barcode:
            product = Product.query.filter_by(shop_id=shop.id, barcode=barcode).first()
        if not product and sku_code:
            product = Product.query.filter_by(shop_id=shop.id, sku_code=sku_code).first()
            
        if product:
            has_order_refs = OrderItem.query.filter_by(product_id=product.id).first() is not None or \
                             CustomizationOrder.query.filter_by(product_id=product.id).first() is not None
            try:
                if has_order_refs:
                    product.is_deleted = True
                    product.category_id = None
                else:
                    db.session.delete(product)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"Error processing POS product sync deletion: {e}")

    # Get or create default category for POS imports
    category = Category.query.filter_by(shop_id=shop.id, name="POS Imported").first()
    if not category:
        category = Category(name="POS Imported", shop_id=shop.id)
        db.session.add(category)
        db.session.commit()
    
    # Match and update/create products
    for p_in in incoming_products:
        barcode = p_in.get('barcode', '').strip()
        sku_code = p_in.get('skuCode', '').strip() or p_in.get('sku_code', '').strip()
        name = p_in.get('name', 'POS Product')
        price = float(p_in.get('sellingPrice') or 0.0)
        cost_price = float(p_in.get('costPrice') or 0.0)
        stock = int(p_in.get('count') or 0)
        hsn_code = p_in.get('hsnCode', '').strip() or p_in.get('hsc_code', '').strip()
        category_name = p_in.get('categoryName', '').strip()
        
        # Get target category id
        target_category_id = category.id
        if category_name:
            p_category = Category.query.filter_by(shop_id=shop.id, name=category_name).first()
            if not p_category:
                p_category = Category(name=category_name, shop_id=shop.id)
                db.session.add(p_category)
                db.session.commit()
            target_category_id = p_category.id
        
        # Match product on barcode or sku_code
        product = None
        if barcode:
            product = Product.query.filter_by(shop_id=shop.id, barcode=barcode).first()
        if not product and sku_code:
            product = Product.query.filter_by(shop_id=shop.id, sku_code=sku_code).first()
            
        if product:
            # Parse desktop product updatedAt timestamp to compare with web's updated_at
            desktop_updated_at_str = p_in.get('updatedAt') or p_in.get('updated_at')
            desktop_updated_at = None
            if desktop_updated_at_str:
                try:
                    # Clean and parse UTC format e.g. "2026-06-18T10:00:00.000Z"
                    if desktop_updated_at_str.endswith('Z'):
                        # Convert to timezone-aware UTC datetime, then convert to local system time, and strip tzinfo
                        dt_utc = datetime.fromisoformat(desktop_updated_at_str.replace('Z', '+00:00'))
                        dt_local = dt_utc.astimezone()
                        desktop_updated_at = dt_local.replace(tzinfo=None)
                    else:
                        clean_dt = desktop_updated_at_str.split('.')[0]
                        desktop_updated_at = datetime.fromisoformat(clean_dt)
                except Exception as e:
                    print(f"Failed to parse desktop updatedAt '{desktop_updated_at_str}': {e}")
                    pass
            
            web_updated_at = product.updated_at or product.created_at or datetime.min
            # Only update online details if desktop timestamp is newer than web timestamp + 5 seconds buffer
            # (or if no desktop timestamp is provided, to ensure backward compatibility)
            is_desktop_newer = not desktop_updated_at or (desktop_updated_at > web_updated_at + timedelta(seconds=5))

            if is_desktop_newer:
                # Update matching product details
                product.name = name
                product.price = price
                product.original_price = cost_price if cost_price > 0 else price
                product.stock = stock
                product.category_id = target_category_id
                if hsn_code:
                    product.hsc_code = hsn_code
                if barcode and not product.barcode:
                    product.barcode = barcode
                if sku_code and not product.sku_code:
                    product.sku_code = sku_code
                # If POS sends an update for a soft-deleted product, restore it
                if product.is_deleted:
                    product.is_deleted = False
        else:
            # Create new product
            product = Product(
                name=name,
                price=price,
                original_price=cost_price if cost_price > 0 else price,
                stock=stock,
                barcode=barcode,
                sku_code=sku_code or f"SKU-{uuid.uuid4().hex[:8].upper()}",
                hsc_code=hsn_code,
                category_id=target_category_id,
                shop_id=shop.id,
                description="Imported from POS Billing desktop app"
            )
            db.session.add(product)
            
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to merge products: {str(e)}"}), 500
        
    # Return all products currently stored on website
    web_products = Product.query.filter_by(shop_id=shop.id, is_deleted=False).all()
    deleted_products = Product.query.filter_by(shop_id=shop.id, is_deleted=True).all()
    return jsonify({
        "products": [p.serialize() for p in web_products],
        "deleted_products": [{"barcode": dp.barcode, "sku_code": dp.sku_code} for dp in deleted_products]
    }), 200

@billing_sync_bp.route('/orders/pull', methods=['POST'])
def pull_orders():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    # Fetch all shop orders that are not synced yet
    orders = Order.query.filter_by(shop_id=shop.id, is_synced=False).all()
    
    # Build complete customer object mapping alongside order fields
    order_list = []
    for order in orders:
        # For COD orders, only pull once accepted (i.e. not Pending and not Rejected)
        if order.payment_method == 'COD' and order.status in ['Pending', 'Rejected']:
            continue

        # For UPI orders, only pull once paid
        if order.payment_method == 'UPI' and order.payment_status != 'Paid':
            continue
            
        user = order.user
        serialized = order.serialize()
        serialized['customer'] = {
            "name": user.name if user else "Online Customer",
            "phone": order.billing_phone or (user.contact_phone if order.user else ""),
            "email": user.email if user else "",
            "shipping_address": order.shipping_address
        }
        order_list.append(serialized)
        
    return jsonify({"orders": order_list}), 200

@billing_sync_bp.route('/orders/mark-synced', methods=['POST'])
def mark_orders_synced():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    order_ids = data.get('order_ids', [])
    
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    for order_id in order_ids:
        order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
        if order:
            order.is_synced = True
            
    try:
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@billing_sync_bp.route('/bills', methods=['POST'])
def sync_pos_bills():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    pos_bills = data.get('bills', [])
    
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    # Get or create a default POS walk-in customer user
    default_user = User.query.filter_by(username="walk_in_customer").first()
    if not default_user:
        default_user = User(
            username="walk_in_customer",
            email="walkin@customer.com",
            name="Walk-in Customer",
            password_hash="pbkdf2:sha256:260000$walkinposplaceholderhash"
        )
        db.session.add(default_user)
        db.session.commit()
        
    synced_count = 0
    for bill in pos_bills:
        bill_no = bill.get('billNumber')
        if not bill_no:
            continue
            
        # Check if this is an e-commerce order bill synced back
        if bill_no.startswith('EC-CUST-'):
            continue
            
        # Check if this bill was already synced as an Order
        existing = Order.query.filter_by(shop_id=shop.id, tracking_info=bill_no).first()
        if existing:
            continue
            
        # Determine customer
        customer_data = bill.get('customer')
        user = None
        phone = ""
        email = ""
        name = "Walk-in Customer"
        
        if customer_data:
            phone = customer_data.get('phone', '').strip()
            email = customer_data.get('email', '').strip()
            name = customer_data.get('name', 'POS Customer')
            
        if phone or email:
            # Look up customer
            query = User.query
            if phone:
                query = query.filter(User.contact_phone == phone)
            elif email:
                query = query.filter(User.email == email)
            user = query.first()
            
            if not user:
                # Create user
                try:
                    user = User(
                        username=f"pos_{phone or uuid.uuid4().hex[:8]}",
                        email=email or f"pos_{phone or uuid.uuid4().hex[:8]}@pos.com",
                        name=name,
                        contact_phone=phone,
                        password_hash=f"pbkdf2:sha256:260000$dummy{uuid.uuid4().hex[:8]}"
                    )
                    db.session.add(user)
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                    user = default_user
        else:
            user = default_user
            
        # Parse date
        created_at_str = bill.get('createdAt')
        try:
            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00')) if created_at_str else datetime.now()
        except Exception:
            created_at = datetime.now()
            
        # Create website Order matching POS Bill
        order = Order(
            user_id=user.id,
            shop_id=shop.id,
            total_amount=float(bill.get('totalAmount') or 0.0),
            final_amount=float(bill.get('finalAmount') or 0.0),
            status='Customer Received', # already completed
            payment_method=bill.get('paymentMethod', 'cash').upper(),
            payment_status='Paid',
            tracking_info=bill_no, # store POS bill number to match and prevent duplicate
            shipping_address=bill.get('customer', {}).get('address') or 'POS Local Store Sale',
            billing_phone=phone,
            gst_amount=float(bill.get('totalGst') or 0.0),
            gst_inclusive=bool(bill.get('gstInclusive', False)),
            discount_amount=float(bill.get('totalDiscount') or 0.0),
            is_synced=True, # synced from POS source
            delivered_at=created_at,
            created_at=created_at
        )
        db.session.add(order)
        db.session.flush() # get order.id
        
        # Create order items
        for item in bill.get('items', []):
            product_id = item.get('productId')
            unit_price = float(item.get('unitPrice') or 0.0)
            quantity = int(item.get('quantity') or 1)
            product_name = item.get('product', {}).get('name', 'Product')
            
            # Lookup actual web product to link if barcode matches
            web_prod = None
            barcode = item.get('product', {}).get('barcode')
            if barcode:
                web_prod = Product.query.filter_by(shop_id=shop.id, barcode=barcode).first()
                
            order_item = OrderItem(
                order_id=order.id,
                product_id=web_prod.id if web_prod else product_id or 1,
                product_name=product_name,
                price=unit_price,
                quantity=quantity
            )
            db.session.add(order_item)
            
            # Deduct website stock if the product exists
            if web_prod:
                web_prod.stock = max(0, web_prod.stock - quantity)
                
        synced_count += 1
        
    try:
        db.session.commit()
        return jsonify({"success": True, "synced_count": synced_count}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save POS bills: {str(e)}"}), 500

@billing_sync_bp.route('/orders/list', methods=['POST'])
def list_orders():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    orders = Order.query.filter_by(shop_id=shop.id).order_by(Order.created_at.desc()).all()
    return jsonify({
        "success": True,
        "orders": [o.serialize() for o in orders]
    }), 200

@billing_sync_bp.route('/orders/<int:order_id>/status', methods=['POST'])
def update_order_status(order_id):
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "Status is required"}), 400
        
    if new_status == 'Customer Received' and order.status != 'Customer Received':
        order.delivered_at = datetime.now()
        
    order.status = new_status
    if new_status == 'Rejected':
        order.is_synced = True
    if new_status == 'Dispatched':
        order.tracking_info = data.get('tracking_info', order.tracking_info)
        order.shipping_label_url = data.get('shipping_label_url', order.shipping_label_url)
        
    db.session.commit()
    
    # Send FCM notification
    try:
        from fcm_helper import send_order_status_notification
        send_order_status_notification(order, new_status)
    except Exception as e:
        print("FCM status notification error:", e)

    return jsonify({
        "success": True,
        "message": f"Order status updated to '{new_status}' successfully",
        "order": order.serialize()
    }), 200

@billing_sync_bp.route('/orders/<int:order_id>/shipping-serviceability', methods=['GET', 'POST'])
def get_order_shipping_serviceability(order_id):
    import re
    import shiprocket_helper

    data = request.get_json(silent=True) or {}
    api_key = request.args.get('api_key') or data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401

    order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    weight_kg = request.args.get('weight_kg', type=float) or float(data.get('weight_kg', 0.5))
    
    # Extract pincode from order's shipping address
    delivery_pincode = "400001"
    if order.shipping_address:
        pin_match = re.search(r'\b\d{6}\b', order.shipping_address)
        if pin_match:
            delivery_pincode = pin_match.group(0)

    is_cod = (order.payment_method == "COD")
    declared_value = order.final_amount or 0.0

    # Calculate RTO Risk prediction
    rto_risk_info = None
    if shop.shiprocket_email and shop.shiprocket_password:
        try:
            # Build order items details
            items_list = []
            for item in order.items:
                items_list.append({
                    "name": item.product_name,
                    "sku": item.product.sku_code if (item.product and item.product.sku_code) else f"SKU-{item.product_id}",
                    "units": item.quantity
                })
            if not items_list:
                items_list.append({
                    "name": "General Order Item",
                    "sku": f"GEN-SKU-{order.id}",
                    "units": 1
                })
                
            rto_res = shiprocket_helper.check_rto_prediction(
                shop=shop,
                phone=order.billing_phone or (order.user.contact_phone if order.user else "9999999999"),
                email=order.user.email if order.user else None,
                amount=declared_value,
                payment_method=order.payment_method or "COD",
                pincode=delivery_pincode,
                items=items_list
            )
            if rto_res:
                rto_risk_info = {
                    "source": "shiprocket_sense",
                    "score": rto_res.get('rto_score'),
                    "risk": rto_res.get('rto_risk') or rto_res.get('risk_level') or rto_res.get('risk')
                }
        except Exception as e:
            print(f"Error checking Shiprocket Sense RTO for sync order: {e}")

    if not rto_risk_info:
        # Fallback to local heuristic
        addr_len = len(order.shipping_address or "")
        if not is_cod:
            risk = "Low Risk"
            score = 0.05
        else:
            if addr_len < 25:
                risk = "High Risk"
                score = 0.85
            elif declared_value > 3000:
                risk = "Moderate Risk"
                score = 0.55
            else:
                risk = "Low Risk"
                score = 0.25
        
        rto_risk_info = {
            "source": "local_heuristic",
            "score": score,
            "risk": risk
        }

    try:
        couriers = shiprocket_helper.check_serviceability(
            shop=shop,
            delivery_postcode=delivery_pincode,
            weight_kg=weight_kg,
            is_cod=is_cod,
            declared_value=declared_value
        )
        return jsonify({
            "success": True,
            "available_couriers": couriers,
            "order_rto_risk": rto_risk_info
        }), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 400

@billing_sync_bp.route('/orders/<int:order_id>/book-shipping', methods=['POST'])
def book_order_shipping(order_id):
    import requests
    import secrets
    from datetime import datetime
    import shiprocket_helper
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    weight_kg = float(data.get('weight_kg', 0.5))
    declared_value = float(data.get('declared_value', order.final_amount))
    carrier = data.get('carrier', 'DTDC')
    
    if carrier == 'Shiprocket':
        try:
            sr_order_id = order.shiprocket_order_id
            sr_shipment_id = order.shiprocket_shipment_id
            
            # If not created on Shiprocket yet, create it
            if not sr_order_id or not sr_shipment_id:
                # 1. Build order items details
                items_list = []
                for item in order.items:
                    items_list.append({
                        "name": item.product_name,
                        "sku": item.product.sku_code if (item.product and item.product.sku_code) else f"SKU-{item.product_id}",
                        "units": item.quantity,
                        "price": item.price,
                        "product_id": item.product_id
                    })
                if not items_list:
                    items_list.append({
                        "name": "General Order Item",
                        "sku": f"GEN-SKU-{order.id}",
                        "units": 1,
                        "price": order.final_amount,
                        "product_id": 0
                    })
                    
                # 2. Call Shiprocket Create Order
                res_dict = shiprocket_helper.create_shiprocket_order(
                    shop=shop,
                    order_id_str=f"EC-{order.online_order_number or order.id}-{secrets.token_hex(2).upper()}",
                    order_date=order.created_at or datetime.now(),
                    customer_name=order.user.name or order.user.username if order.user else "Customer",
                    customer_email=order.user.email if order.user else f"cust_{order.id}@example.com",
                    customer_phone=order.billing_phone or (order.user.contact_phone if order.user else "9999999999"),
                    shipping_address=order.shipping_address,
                    items=items_list,
                    weight_kg=weight_kg,
                    declared_value=declared_value,
                    payment_method=order.payment_method
                )
                
                sr_order_id = res_dict.get('shiprocket_order_id')
                sr_shipment_id = res_dict.get('shiprocket_shipment_id')
                
                order.shiprocket_order_id = sr_order_id
                order.shiprocket_shipment_id = sr_shipment_id
                db.session.commit() # Save Shiprocket IDs immediately
                
            # 3. Assign AWB (do not catch exception here so failure propagates back to desktop)
            courier_id = data.get('courier_id')
            awb_res = shiprocket_helper.assign_awb(shop, sr_shipment_id, courier_id)
            awb_code = awb_res.get('awb_code')
            courier_name = awb_res.get('courier_name')
            
            # 4. Try to generate label
            label_url = None
            if awb_code:
                try:
                    label_url = shiprocket_helper.generate_label(shop, sr_shipment_id)
                except Exception as lbl_err:
                    print(f"Shiprocket label generation failed: {lbl_err}")
                    
            order.status = 'Dispatched'
            if awb_code:
                if courier_name:
                    order.tracking_info = f"Shiprocket (via {courier_name}) AWB: {awb_code}"
                else:
                    order.tracking_info = f"Shiprocket AWB: {awb_code}"
            else:
                order.tracking_info = f"Shiprocket Order ID: {sr_order_id}"
                
            if label_url:
                order.shipping_label_url = label_url
            else:
                host = request.host_url
                if not host.endswith('/'):
                    host += '/'
                order.shipping_label_url = f"{host}api/admin/orders/{order.id}/shipping-label"
                
            db.session.commit()
            
            # Send FCM notification
            try:
                from fcm_helper import send_order_status_notification
                send_order_status_notification(order, 'Dispatched')
            except Exception as e:
                print("FCM status notification error:", e)
                
            return jsonify({
                "success": True,
                "message": "Shiprocket shipment booked successfully from POS",
                "order": order.serialize()
            }), 200
            
        except Exception as err:
            return jsonify({"error": str(err)}), 400

    # Fallback to DTDC
    client_code = shop.dtdc_client_code
    api_key_dtdc = shop.dtdc_api_key
    api_url = shop.dtdc_api_url or "https://api.dtdc.com/v1/shipments"
    
    awb_number = None
    label_url = None
    
    if client_code and api_key_dtdc and client_code != "YOUR_DTDC_CLIENT_CODE" and not api_url.startswith("http://dummy"):
        try:
            payload = {
                "client_code": client_code,
                "consignee": {
                    "name": order.user.name or order.user.username if order.user else "Customer",
                    "phone": order.billing_phone or (order.user.contact_phone if order.user else ""),
                    "address": order.shipping_address,
                    "pincode": data.get('consignee_pincode', '')
                },
                "shipper": {
                    "name": shop.name,
                    "phone": shop.contact_phone or "",
                    "address": shop.address or ""
                },
                "package": {
                    "weight_kg": weight_kg,
                    "declared_value": declared_value,
                    "payment_mode": "Prepaid" if order.payment_method == "UPI" else "COD"
                }
            }
            headers = {
                "X-DTDC-API-KEY": api_key_dtdc,
                "Content-Type": "application/json"
            }
            res = requests.post(api_url, json=payload, headers=headers, timeout=10)
            res_json = res.json()
            if res.status_code in [200, 201] and res_json.get('status') == 'success':
                awb_number = res_json.get('awb_number')
                label_url = res_json.get('label_url')
            else:
                print(f"DTDC Live API Error: {res.text}")
        except Exception as e:
            print(f"DTDC Booking Exception: {e}")
            
    if not awb_number:
        awb_number = f"D{secrets.token_hex(4).upper()}"
        host = request.host_url
        if not host.endswith('/'):
            host += '/'
        label_url = f"{host}api/admin/orders/{order.id}/shipping-label"
        
    order.status = 'Dispatched'
    order.tracking_info = f"DTDC AWB: {awb_number}"
    order.shipping_label_url = label_url
    db.session.commit()
    
    # Send FCM notification
    try:
        from fcm_helper import send_order_status_notification
        send_order_status_notification(order, 'Dispatched')
    except Exception as e:
        print("FCM status notification error:", e)
    
    return jsonify({
        "success": True,
        "message": "DTDC shipment booked successfully from POS",
        "order": order.serialize()
    }), 200

@billing_sync_bp.route('/orders/<int:order_id>/return', methods=['POST'])
def resolve_order_return(order_id):
    from models import Notification
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    decision = data.get('decision') # 'Approved' or 'Rejected'
    if decision not in ['Approved', 'Rejected']:
        return jsonify({"error": "Invalid decision"}), 400
        
    order.return_request_status = decision
    if decision == 'Approved':
        order.status = 'Returned'
        # Restore stock
        for item in order.items:
            product = Product.query.get(item.product_id)
            if product:
                product.stock += item.quantity
                
    # Notify User
    notif = Notification(
        recipient_type='user',
        recipient_id=order.user_id,
        title=f"Return Request {decision}",
        message=f"Your return request for order #{order.id} was {decision.lower()}.",
        shop_id=shop.id
    )
    db.session.add(notif)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Return request {decision.lower()} successfully from POS",
        "order": order.serialize()
    }), 200

@billing_sync_bp.route('/customizations/list', methods=['POST'])
def list_customizations():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    custs = CustomizationOrder.query.filter_by(shop_id=shop.id).order_by(CustomizationOrder.created_at.desc()).all()
    return jsonify({
        "success": True,
        "customizations": [c.serialize() for c in custs]
    }), 200

@billing_sync_bp.route('/customizations/<int:cust_id>/status', methods=['POST'])
def update_customization_status(cust_id):
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop.id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404
        
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "Status is required"}), 400
        
    cust.status = new_status
    if new_status == 'Dispatched':
        cust.tracking_info = data.get('tracking_info', cust.tracking_info)
        cust.shipping_label_url = data.get('shipping_label_url', cust.shipping_label_url)
        
    db.session.commit()
    
    # Send FCM notification
    try:
        from fcm_helper import send_customization_status_notification
        send_customization_status_notification(cust, 'status')
    except Exception as e:
        print("FCM customization status notification error:", e)
        
    return jsonify({
        "success": True,
        "message": f"Customization order status updated to '{new_status}' successfully",
        "customization": cust.serialize()
    }), 200

@billing_sync_bp.route('/customizations/<int:cust_id>/quote', methods=['POST'])
def update_customization_quote(cust_id):
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop.id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404
        
    quoted_price = data.get('quoted_price')
    if quoted_price is None:
        return jsonify({"error": "quoted_price is required"}), 400
        
    cust.quoted_price = float(quoted_price)
    cust.quote_status = 'Quoted'
    db.session.commit()
    
    # Send FCM notification
    try:
        from fcm_helper import send_customization_status_notification
        send_customization_status_notification(cust, 'quote')
    except Exception as e:
        print("FCM customization quote notification error:", e)
        
    return jsonify({
        "success": True,
        "message": f"Customization order quote set to ₹{cust.quoted_price} successfully",
        "customization": cust.serialize()
    }), 200


@billing_sync_bp.route('/customizations/<int:cust_id>/shipping-serviceability', methods=['GET', 'POST'])
def get_customization_shipping_serviceability(cust_id):
    import re
    import shiprocket_helper

    data = request.get_json(silent=True) or {}
    api_key = request.args.get('api_key') or data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401

    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop.id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404

    weight_kg = request.args.get('weight_kg', type=float) or float(data.get('weight_kg', 0.5))
    
    consignee_address = cust.shipping_address or (cust.user.addresses[0].get('address') if cust.user and cust.user.addresses else "N/A")

    # Extract pincode from customization's shipping address
    delivery_pincode = "400001"
    if consignee_address:
        pin_match = re.search(r'\b\d{6}\b', consignee_address)
        if pin_match:
            delivery_pincode = pin_match.group(0)

    is_cod = (cust.payment_method or "COD") == "COD"
    prod_price = cust.product.price if cust.product else 1000.0
    declared_value = float(cust.quoted_price if cust.quoted_price is not None else (prod_price * cust.quantity))

    # Calculate RTO Risk prediction
    rto_risk_info = None
    if shop.shiprocket_email and shop.shiprocket_password:
        try:
            items_list = [{
                "name": cust.product.name if cust.product else "Bespoke Item",
                "sku": cust.product.sku_code if (cust.product and cust.product.sku_code) else f"SKU-{cust.product_id}",
                "units": cust.quantity or 1
            }]
                
            rto_res = shiprocket_helper.check_rto_prediction(
                shop=shop,
                phone=cust.billing_phone or (cust.user.contact_phone if cust.user else "9999999999"),
                email=cust.user.email if cust.user else None,
                amount=declared_value,
                payment_method="COD" if is_cod else "Prepaid",
                pincode=delivery_pincode,
                items=items_list
            )
            if rto_res:
                rto_risk_info = {
                    "source": "shiprocket_sense",
                    "score": rto_res.get('rto_score'),
                    "risk": rto_res.get('rto_risk') or rto_res.get('risk_level') or rto_res.get('risk')
                }
        except Exception as e:
            print(f"Error checking Shiprocket Sense RTO for sync customization: {e}")

    if not rto_risk_info:
        # Fallback to local heuristic
        addr_len = len(consignee_address or "")
        if not is_cod:
            risk = "Low Risk"
            score = 0.05
        else:
            if addr_len < 25:
                risk = "High Risk"
                score = 0.85
            elif declared_value > 3000:
                risk = "Moderate Risk"
                score = 0.55
            else:
                risk = "Low Risk"
                score = 0.25
        
        rto_risk_info = {
            "source": "local_heuristic",
            "score": score,
            "risk": risk
        }

    try:
        couriers = shiprocket_helper.check_serviceability(
            shop=shop,
            delivery_postcode=delivery_pincode,
            weight_kg=weight_kg,
            is_cod=is_cod,
            declared_value=declared_value
        )
        return jsonify({
            "success": True,
            "available_couriers": couriers,
            "order_rto_risk": rto_risk_info
        }), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 400


@billing_sync_bp.route('/shipping-wallet-balance', methods=['GET', 'POST'])
def get_sync_shipping_wallet_balance():
    import shiprocket_helper

    data = request.get_json(silent=True) or {}
    api_key = request.args.get('api_key') or data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401

    try:
        balance = shiprocket_helper.get_wallet_balance(shop)
        return jsonify({
            "success": True,
            "balance": balance
        }), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 400


@billing_sync_bp.route('/customizations/<int:cust_id>/book-shipping', methods=['POST'])
def book_customization_shipping(cust_id):
    import requests
    import secrets
    from datetime import datetime
    import shiprocket_helper
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop.id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404
        
    weight_kg = float(data.get('weight_kg', 0.5))
    prod_price = cust.product.price if cust.product else 1000.0
    declared_value = float(data.get('declared_value', prod_price * cust.quantity))
    carrier = data.get('carrier', 'DTDC')
    
    consignee_address = cust.shipping_address or (cust.user.addresses[0].get('address') if cust.user and cust.user.addresses else "N/A")
    
    if carrier == 'Shiprocket':
        try:
            sr_order_id = cust.shiprocket_order_id
            sr_shipment_id = cust.shiprocket_shipment_id
            
            # If not created on Shiprocket yet, create it
            if not sr_order_id or not sr_shipment_id:
                # 1. Build order items details
                items_list = [{
                    "name": f"Customized {cust.product.name}" if cust.product else "Customized Product",
                    "sku": cust.product.sku_code if (cust.product and cust.product.sku_code) else f"CUST-SKU-{cust.product_id}",
                    "units": cust.quantity or 1,
                    "price": cust.quoted_price if cust.quoted_price is not None else prod_price,
                    "product_id": cust.product_id
                }]
                
                # 2. Call Shiprocket Create Order
                res_dict = shiprocket_helper.create_shiprocket_order(
                    shop=shop,
                    order_id_str=f"CUST-{cust.id}-{secrets.token_hex(2).upper()}",
                    order_date=cust.created_at or datetime.now(),
                    customer_name=cust.user.name or cust.user.username if cust.user else "Customer",
                    customer_email=cust.user.email if cust.user else f"cust_custom_{cust.id}@example.com",
                    customer_phone=cust.billing_phone or (cust.user.contact_phone if cust.user else "9999999999"),
                    shipping_address=consignee_address,
                    items=items_list,
                    weight_kg=weight_kg,
                    declared_value=declared_value,
                    payment_method=cust.payment_method or "COD"
                )
                
                sr_order_id = res_dict.get('shiprocket_order_id')
                sr_shipment_id = res_dict.get('shiprocket_shipment_id')
                
                cust.shiprocket_order_id = sr_order_id
                cust.shiprocket_shipment_id = sr_shipment_id
                db.session.commit() # Save Shiprocket IDs immediately
                
            # 3. Assign AWB (do not catch exception here so failure propagates back to desktop)
            courier_id = data.get('courier_id')
            awb_res = shiprocket_helper.assign_awb(shop, sr_shipment_id, courier_id)
            awb_code = awb_res.get('awb_code')
            courier_name = awb_res.get('courier_name')
            
            # 4. Try to generate label
            label_url = None
            if awb_code:
                try:
                    label_url = shiprocket_helper.generate_label(shop, sr_shipment_id)
                except Exception as lbl_err:
                    print(f"Shiprocket label generation failed: {lbl_err}")
                    
            cust.status = 'Dispatched'
            if awb_code:
                if courier_name:
                    cust.tracking_info = f"Shiprocket (via {courier_name}) AWB: {awb_code}"
                else:
                    cust.tracking_info = f"Shiprocket AWB: {awb_code}"
            else:
                cust.tracking_info = f"Shiprocket Order ID: {sr_order_id}"
                
            if label_url:
                cust.shipping_label_url = label_url
            else:
                host = request.host_url
                if not host.endswith('/'):
                    host += '/'
                cust.shipping_label_url = f"{host}api/admin/customizations/{cust.id}/shipping-label"
                
            db.session.commit()
            
            # Send FCM notification
            try:
                from fcm_helper import send_customization_status_notification
                send_customization_status_notification(cust, 'status')
            except Exception as e:
                print("FCM customization status notification error:", e)
                
            return jsonify({
                "success": True,
                "message": "Shiprocket shipment booked successfully for customization from POS",
                "customization": cust.serialize()
            }), 200
            
        except Exception as err:
            return jsonify({"error": str(err)}), 400

    # Fallback to DTDC
    client_code = shop.dtdc_client_code
    api_key_dtdc = shop.dtdc_api_key
    api_url = shop.dtdc_api_url or "https://api.dtdc.com/v1/shipments"
    
    awb_number = None
    label_url = None
    
    consignee_address = cust.shipping_address or (cust.user.addresses[0].get('address') if cust.user and cust.user.addresses else "N/A")
    
    if client_code and api_key_dtdc and client_code != "YOUR_DTDC_CLIENT_CODE" and not api_url.startswith("http://dummy"):
        try:
            payload = {
                "client_code": client_code,
                "consignee": {
                    "name": cust.user.name or cust.user.username if cust.user else "Customer",
                    "phone": cust.billing_phone or (cust.user.contact_phone if cust.user else ""),
                    "address": consignee_address,
                    "pincode": data.get('consignee_pincode', '')
                },
                "shipper": {
                    "name": shop.name,
                    "phone": shop.contact_phone or "",
                    "address": shop.address or ""
                },
                "package": {
                    "weight_kg": weight_kg,
                    "declared_value": declared_value,
                    "payment_mode": "Prepaid"
                }
            }
            headers = {
                "X-DTDC-API-KEY": api_key_dtdc,
                "Content-Type": "application/json"
            }
            res = requests.post(api_url, json=payload, headers=headers, timeout=10)
            res_json = res.json()
            if res.status_code in [200, 201] and res_json.get('status') == 'success':
                awb_number = res_json.get('awb_number')
                label_url = res_json.get('label_url')
            else:
                print(f"DTDC Customization Live API Error: {res.text}")
        except Exception as e:
            print(f"DTDC Customization Booking Exception: {e}")
            
    if not awb_number:
        awb_number = f"D{secrets.token_hex(4).upper()}"
        host = request.host_url
        if not host.endswith('/'):
            host += '/'
        label_url = f"{host}api/admin/customizations/{cust.id}/shipping-label"
        
    cust.status = 'Dispatched'
    cust.tracking_info = f"DTDC AWB: {awb_number}"
    cust.shipping_label_url = label_url
    db.session.commit()
    
    # Send FCM notification
    try:
        from fcm_helper import send_customization_status_notification
        send_customization_status_notification(cust, 'status')
    except Exception as e:
        print("FCM customization status notification error:", e)
        
    return jsonify({
        "success": True,
        "message": "DTDC shipment booked successfully for customization from POS",
        "customization": cust.serialize()
    }), 200


@billing_sync_bp.route('/categories', methods=['POST'])
def sync_categories():
    data = request.get_json() or {}
    api_key = data.get('api_key')
    incoming_categories = data.get('categories', [])
    
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    for c_in in incoming_categories:
        name = c_in.get('name', '').strip()
        if not name:
            continue
        description = c_in.get('description', '')
        
        # Match category by name
        category = Category.query.filter_by(shop_id=shop.id, name=name).first()
        if category:
            if description and not category.description:
                category.description = description
        else:
            category = Category(
                name=name,
                description=description,
                shop_id=shop.id
            )
            db.session.add(category)
            
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to sync categories: {str(e)}"}), 500
        
    web_categories = Category.query.filter_by(shop_id=shop.id).all()
    return jsonify({
        "categories": [c.serialize() for c in web_categories]
    }), 200


@billing_sync_bp.route('/orders/<int:order_id>/schedule-pickup', methods=['POST'])
def schedule_order_pickup(order_id):
    import shiprocket_helper
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    if not order.shiprocket_shipment_id:
        return jsonify({"error": "Order is not associated with a Shiprocket shipment."}), 400
        
    try:
        pickup_res = shiprocket_helper.request_pickup(shop, order.shiprocket_shipment_id)
        
        pickup_info = f" | Pickup ID: {pickup_res.get('pickup_id')} (Date: {pickup_res.get('pickup_scheduled_date')})"
        if order.tracking_info and pickup_info not in order.tracking_info:
            order.tracking_info += pickup_info
            db.session.commit()
            
        return jsonify({
            "success": True,
            "message": "Shiprocket pickup scheduled successfully",
            "pickup_id": pickup_res.get('pickup_id'),
            "pickup_scheduled_date": pickup_res.get('pickup_scheduled_date'),
            "pickup_token_number": pickup_res.get('pickup_token_number')
        }), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 400


@billing_sync_bp.route('/orders/<int:order_id>/cancel-shipping', methods=['POST'])
def cancel_order_shipping(order_id):
    import shiprocket_helper
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    order = Order.query.filter_by(id=order_id, shop_id=shop.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    # If it is a Shiprocket order, call Shiprocket API to cancel
    if order.shiprocket_order_id:
        try:
            shiprocket_helper.cancel_order(shop, order.shiprocket_order_id)
        except Exception as err:
            print(f"Shiprocket Cancel Sync Order Warning: {err}")
            
    # Reset tracking and booking fields
    order.shiprocket_order_id = None
    order.shiprocket_shipment_id = None
    order.tracking_info = None
    order.shipping_label_url = None
    order.status = 'Accepted'
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Shipment cancelled and booking options reset successfully",
        "order": order.serialize()
    }), 200


@billing_sync_bp.route('/customizations/<int:cust_id>/schedule-pickup', methods=['POST'])
def schedule_customization_pickup(cust_id):
    import shiprocket_helper
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop.id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404
        
    if not cust.shiprocket_shipment_id:
        return jsonify({"error": "Customization order is not associated with a Shiprocket shipment."}), 400
        
    try:
        pickup_res = shiprocket_helper.request_pickup(shop, cust.shiprocket_shipment_id)
        
        pickup_info = f" | Pickup ID: {pickup_res.get('pickup_id')} (Date: {pickup_res.get('pickup_scheduled_date')})"
        if cust.tracking_info and pickup_info not in cust.tracking_info:
            cust.tracking_info += pickup_info
            db.session.commit()
            
        return jsonify({
            "success": True,
            "message": "Shiprocket pickup scheduled successfully for customization",
            "pickup_id": pickup_res.get('pickup_id'),
            "pickup_scheduled_date": pickup_res.get('pickup_scheduled_date'),
            "pickup_token_number": pickup_res.get('pickup_token_number')
        }), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 400


@billing_sync_bp.route('/customizations/<int:cust_id>/cancel-shipping', methods=['POST'])
def cancel_customization_shipping(cust_id):
    import shiprocket_helper
    
    data = request.get_json() or {}
    api_key = data.get('api_key')
    shop = get_shop_by_api_key(api_key)
    if not shop:
        return jsonify({"error": "Invalid API key"}), 401
        
    cust = CustomizationOrder.query.filter_by(id=cust_id, shop_id=shop.id).first()
    if not cust:
        return jsonify({"error": "Customization request not found"}), 404
        
    # If it is a Shiprocket order, call Shiprocket API to cancel
    if cust.shiprocket_order_id:
        try:
            shiprocket_helper.cancel_order(shop, cust.shiprocket_order_id)
        except Exception as err:
            print(f"Shiprocket Cancel Sync Customization Warning: {err}")
            
    # Reset tracking and booking fields
    cust.shiprocket_order_id = None
    cust.shiprocket_shipment_id = None
    cust.tracking_info = None
    cust.shipping_label_url = None
    cust.status = 'Pending'
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Customization shipment cancelled and booking options reset successfully",
        "customization": cust.serialize()
    }), 200

