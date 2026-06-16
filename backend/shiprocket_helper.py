import re
import requests
from datetime import datetime, timedelta
from models import db

SHIPROCKET_API_URL = "https://apiv2.shiprocket.in/v1/external"

def parse_shipping_address(address_str):
    """
    Heuristic parser to extract city, state, pincode, and country from a raw address string.
    Works best for typical Indian addresses.
    """
    pincode = "400001"
    city = "Mumbai"
    state = "Maharashtra"
    country = "India"
    
    if not address_str:
        return city, state, pincode, country
        
    # 1. Extract 6-digit pincode
    pin_match = re.search(r'\b\d{6}\b', address_str)
    if pin_match:
        pincode = pin_match.group(0)
        # Remove pincode from string to clean up city/state extraction
        address_str = address_str.replace(pincode, "")
        
    # List of Indian states/UTs for matching
    states_list = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Puducherry", "Jammu and Kashmir", "Ladakh"
    ]
    
    # 2. Extract State
    found_state = None
    for st in states_list:
        if re.search(r'\b' + re.escape(st) + r'\b', address_str, re.IGNORECASE):
            found_state = st
            address_str = re.sub(r'\b' + re.escape(st) + r'\b', "", address_str, flags=re.IGNORECASE)
            break
            
    if found_state:
        state = found_state
        
    # 3. Clean address and extract City
    # Strip ending and beginning punctuation/whitespace
    cleaned_addr = re.sub(r'[\s,\-]+$', '', address_str).strip()
    cleaned_addr = re.sub(r'^[\s,\-]+', '', cleaned_addr).strip()
    
    parts = [p.strip() for p in cleaned_addr.split(',') if p.strip()]
    if parts:
        # The last remaining comma-separated token is typically the city
        city = parts[-1]
        
    return city, state, pincode, country

def get_token(shop):
    """
    Retrieves a cached JWT token or authenticates with Shiprocket to retrieve a new one.
    Updates the database with the new token and expiry if authentication succeeds.
    """
    if not shop.shiprocket_email or not shop.shiprocket_password:
        raise Exception("Shiprocket credentials are not configured for this shop.")
        
    # If cached token exists and is valid (with 30 minutes buffer), return it
    if shop.shiprocket_token and shop.shiprocket_token_expiry:
        if shop.shiprocket_token_expiry > datetime.now() + timedelta(minutes=30):
            return shop.shiprocket_token
            
    # Authenticate
    try:
        payload = {
            "email": shop.shiprocket_email.strip(),
            "password": shop.shiprocket_password.strip()
        }
        res = requests.post(f"{SHIPROCKET_API_URL}/auth/login", json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        res_json = res.json()
        if res.status_code == 200 and 'token' in res_json:
            token = res_json['token']
            # Cache the token. Shiprocket tokens expire in 24 hours. We store expiry as 23 hours from now.
            shop.shiprocket_token = token
            shop.shiprocket_token_expiry = datetime.now() + timedelta(hours=23)
            db.session.commit()
            return token
        else:
            error_msg = res_json.get('message', res.text)
            raise Exception(f"Shiprocket Login Error: {error_msg}")
    except Exception as e:
        raise Exception(f"Shiprocket Connection Failed: {str(e)}")

def create_shiprocket_order(shop, order_id_str, order_date, customer_name, customer_email, customer_phone, shipping_address, items, weight_kg, declared_value, payment_method):
    """
    Registers an adhoc order on Shiprocket.
    """
    token = get_token(shop)
    
    # Parse address parts
    city, state, pincode, country = parse_shipping_address(shipping_address)
    
    # Split name to first and last name
    name_parts = customer_name.strip().split(' ', 1)
    first_name = name_parts[0] if name_parts else "Customer"
    last_name = name_parts[1] if len(name_parts) > 1 else "."
    
    # Normalize phone (remove +91, non-digits, keep last 10 digits)
    phone_clean = re.sub(r'\D', '', customer_phone)
    if len(phone_clean) > 10:
        phone_clean = phone_clean[-10:]
    elif not phone_clean:
        phone_clean = "9999999999"  # fallback
        
    # Build order items list
    order_items = []
    for item in items:
        order_items.append({
            "name": item.get("name", "Product Item"),
            "sku": item.get("sku", f"SKU-{item.get('product_id', '0')}")[:50],
            "units": int(item.get("units", 1)),
            "selling_price": float(item.get("price", 0.0)),
            "discount": 0
        })
        
    # Build payload
    payload = {
        "order_id": order_id_str,
        "order_date": order_date.strftime('%Y-%m-%d %H:%M'),
        "pickup_location": shop.shiprocket_pickup_location or "Primary",
        "billing_customer_name": first_name,
        "billing_last_name": last_name,
        "billing_address": shipping_address[:100],  # Shiprocket address limit is usually 100 per line
        "billing_city": city,
        "billing_pincode": pincode,
        "billing_state": state,
        "billing_country": country,
        "billing_email": customer_email or f"customer_{order_id_str}@example.com",
        "billing_phone": phone_clean,
        "shipping_is_billing": True,
        "order_items": order_items,
        "payment_method": "Prepaid" if payment_method.upper() != "COD" else "COD",
        "sub_total": float(declared_value),
        "length": 10,
        "breadth": 10,
        "height": 10,
        "weight": float(weight_kg)
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    res = requests.post(f"{SHIPROCKET_API_URL}/orders/create/adhoc", json=payload, headers=headers, timeout=12)
    res_json = res.json()
    
    if res.status_code in [200, 201] and 'order_id' in res_json:
        return {
            "success": True,
            "shiprocket_order_id": str(res_json['order_id']),
            "shiprocket_shipment_id": str(res_json['shipment_id']),
            "awb_code": res_json.get('awb_code') or None
        }
    else:
        # Check for validation messages
        error_msg = res_json.get('message', '')
        if 'errors' in res_json:
            error_msg += f" Details: {res_json['errors']}"
        if not error_msg:
            error_msg = res.text
        raise Exception(f"Shiprocket Order Creation Failed: {error_msg}")

def get_pickup_pincode(shop):
    """
    Fetches pickup locations from Shiprocket to find the postcode of the shop's pickup location.
    Falls back to parsing the shop's address if not found or if the API call fails.
    """
    try:
        token = get_token(shop)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        res = requests.get(f"{SHIPROCKET_API_URL}/settings/company/pickup", headers=headers, timeout=10)
        if res.status_code == 200:
            res_json = res.json()
            shipping_addresses = res_json.get('data', {}).get('shipping_address', [])
            target = (shop.shiprocket_pickup_location or "Primary").strip().lower()
            
            # 1. Match by nickname
            for addr in shipping_addresses:
                loc_name = str(addr.get('pickup_location', '')).strip().lower()
                if loc_name == target:
                    pincode = addr.get('pin_code')
                    if pincode:
                        return str(pincode)
            
            # 2. Match by default address if nickname not found
            for addr in shipping_addresses:
                if addr.get('is_default') == 1:
                    pincode = addr.get('pin_code')
                    if pincode:
                        return str(pincode)
                        
            # 3. Take first if any exists
            if shipping_addresses:
                pincode = shipping_addresses[0].get('pin_code')
                if pincode:
                    return str(pincode)
    except Exception as e:
        print(f"Failed to fetch pickup locations from Shiprocket: {e}")
        
    # Heuristic fallback to parse pincode from shop.address
    if shop.address:
        pin_match = re.search(r'\b\d{6}\b', shop.address)
        if pin_match:
            return pin_match.group(0)
            
    return "400001" # absolute default fallback

def check_serviceability(shop, delivery_postcode, weight_kg, is_cod, declared_value):
    """
    Queries Shiprocket Courier Serviceability API to get rates and ETD for available couriers.
    """
    token = get_token(shop)
    pickup_pincode = get_pickup_pincode(shop)
    
    params = {
        "pickup_postcode": pickup_pincode,
        "delivery_postcode": str(delivery_postcode),
        "weight": float(weight_kg),
        "cod": 1 if is_cod else 0,
        "declared_value": float(declared_value)
    }
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    res = requests.get(f"{SHIPROCKET_API_URL}/courier/serviceability/", params=params, headers=headers, timeout=12)
    res_json = res.json()
    
    if res.status_code == 200:
        data = res_json.get('data', {})
        available_couriers = data.get('available_courier_companies', [])
        return available_couriers
    else:
        error_msg = res_json.get('message', 'Serviceability check failed.')
        if 'errors' in res_json:
            error_msg += f" Details: {res_json['errors']}"
        raise Exception(f"Shiprocket Serviceability Error: {error_msg}")

def assign_awb(shop, shipment_id, courier_id=None):
    """
    Requests Shiprocket to assign the cheapest/default or specific courier AWB to the shipment.
    """
    token = get_token(shop)
    
    payload = {
        "shipment_id": int(shipment_id)
    }
    if courier_id is not None:
        payload["courier_id"] = int(courier_id)
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    res = requests.post(f"{SHIPROCKET_API_URL}/courier/assign/awb", json=payload, headers=headers, timeout=12)
    res_json = res.json()
    
    if res.status_code == 200 and res_json.get('awb_assign_status') == 1:
        data = res_json.get('response', {}).get('data', {})
        return {
            "success": True,
            "awb_code": data.get('awb_code'),
            "courier_name": data.get('courier_name'),
            "routing_code": data.get('routing_code')
        }
    else:
        error_msg = res_json.get('message', 'AWB assignment failed.')
        if 'errors' in res_json:
            error_msg += f" Details: {res_json['errors']}"
        raise Exception(f"Shiprocket AWB Assignment Failed: {error_msg}")

def generate_label(shop, shipment_id):
    """
    Requests Shiprocket to generate a PDF label URL.
    """
    token = get_token(shop)
    
    payload = {
        "shipment_id": [int(shipment_id)]
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    res = requests.post(f"{SHIPROCKET_API_URL}/courier/generate/label", json=payload, headers=headers, timeout=12)
    res_json = res.json()
    
    if res.status_code == 200 and res_json.get('label_created') == 1:
        return res_json.get('label_url')
    else:
        # Return none instead of throwing exception, as user can print from dashboard
        print(f"Shiprocket label generation warning: {res_json.get('message', res.text)}")
        return None

def get_wallet_balance(shop):
    """
    Fetches the company's wallet balance from Shiprocket.
    """
    token = get_token(shop)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    # 1. Try the confirmed working external API endpoint
    # URL: https://apiv2.shiprocket.in/v1/external/account/details/wallet-balance
    try:
        res = requests.get(f"{SHIPROCKET_API_URL}/account/details/wallet-balance", headers=headers, timeout=10)
        if res.status_code == 200:
            res_json = res.json()
            data = res_json.get('data', {})
            balance = data.get('balance_amount')
            if balance is not None:
                return float(balance)
    except Exception as e:
        print(f"Failed to fetch from external/account/details/wallet-balance: {e}")

    # 2. Try the settings/company/wallet API which is the official external API endpoint
    try:
        res = requests.get(f"{SHIPROCKET_API_URL}/settings/company/wallet", headers=headers, timeout=10)
        if res.status_code == 200:
            res_json = res.json()
            data = res_json.get('data', {})
            if 'wallet_balance' in data:
                return float(data.get('wallet_balance', 0.0))
    except Exception as e:
        print(f"Failed to fetch from settings/company/wallet: {e}")
        
    # 3. Fallback to profile API if all else fails
    try:
        res = requests.get(f"{SHIPROCKET_API_URL}/settings/company/profile", headers=headers, timeout=10)
        if res.status_code == 200:
            res_json = res.json()
            balance = res_json.get('data', {}).get('wallet_balance')
            if balance is not None:
                return float(balance)
    except Exception as e:
        print(f"Failed to fetch from company profile: {e}")

    raise Exception("Could not fetch wallet balance from Shiprocket.")

def get_tracking_by_awb(shop, awb_code):
    """
    Queries Shiprocket Courier Tracking API to get real-time tracking details and delivery agent details.
    """
    token = get_token(shop)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    url = f"{SHIPROCKET_API_URL}/courier/track/awb/{awb_code.strip()}"
    try:
        res = requests.get(url, headers=headers, timeout=12)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Failed to fetch tracking for AWB {awb_code}: {e}")
    return None

