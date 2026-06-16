import requests
import logging

# Configure logger
logger = logging.getLogger(__name__)

FAST2SMS_API_URL = "https://www.fast2sms.com/dev/bulkV2"

def send_sms_via_fast2sms(api_key, numbers, message, route="q", variables_values=None, sender_id=None):
    """
    Sends an SMS using the Fast2SMS API V2.
    
    Parameters:
        api_key (str): Your Fast2SMS Authorization key.
        numbers (str): Comma-separated mobile number(s) (e.g., "9999999999,8888888888").
        message (str): The text message content (required for route 'q').
        route (str): API route to use - 'q' (Quick SMS), 'otp' (Fast2SMS OTP), or 'dlt' (DLT Template).
        variables_values (str): Pipe-separated variables for DLT or OTP route (e.g., "123456").
        sender_id (str): Registered Sender ID (required for route 'dlt').
        
    Returns:
        dict: API response dict with 'status_code' and 'response_data' / 'error'.
    """
    if not api_key:
        logger.error("Fast2SMS API Key is missing.")
        return {"success": False, "error": "Fast2SMS API Key is missing."}

    headers = {
        "authorization": api_key,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
    }

    # Build the payload based on the route
    payload = {
        "route": route,
        "numbers": numbers
    }

    if route == "q":
        payload["message"] = message
        payload["language"] = "english"
        payload["flash"] = 0
    elif route == "otp":
        if not variables_values:
            logger.error("variables_values (OTP code) is required for OTP route.")
            return {"success": False, "error": "variables_values is required for OTP route."}
        payload["variables_values"] = variables_values
    elif route == "dlt":
        if not variables_values or not sender_id or not message:
            logger.error("dlt route requires sender_id, message (template ID), and variables_values.")
            return {"success": False, "error": "DLT route requires sender_id, template ID (message), and variables_values."}
        payload["sender_id"] = sender_id
        payload["message"] = message  # In DLT route, message field expects the DLT Template ID
        payload["variables_values"] = variables_values
    else:
        logger.error(f"Invalid route specified: {route}")
        return {"success": False, "error": f"Invalid route: {route}"}

    try:
        response = requests.post(FAST2SMS_API_URL, json=payload, headers=headers, timeout=10)
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get("return") is True:
            logger.info(f"SMS successfully sent to {numbers} via Fast2SMS. Response: {response_data}")
            return {
                "success": True,
                "status_code": response.status_code,
                "response_data": response_data
            }
        else:
            error_msg = response_data.get("message", "Unknown API error")
            logger.error(f"Fast2SMS API failed: {error_msg} (Status: {response.status_code})")
            return {
                "success": False,
                "status_code": response.status_code,
                "error": error_msg,
                "response_data": response_data
            }
    except requests.exceptions.RequestException as e:
        logger.exception("HTTP Request to Fast2SMS failed due to connection error.")
        return {
            "success": False,
            "error": f"HTTP request failed: {str(e)}"
        }
    except Exception as e:
        logger.exception("An unexpected error occurred while sending SMS.")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }

def log_sms_action(shop_id, recipient_phone, success, message, platform="Fast2SMS", error_msg=None):
    """
    Utility helper to log SMS messages in the system logs (SystemLog).
    This matches the existing logging patterns used in the admin panel.
    """
    try:
        from models import db, SystemLog
        status_str = "SUCCESS" if success else "FAILED"
        err_suffix = f" (Error: {error_msg})" if error_msg else ""
        
        # Matches the format admin.py expects: [Message:Platform] | recipient | message
        action_msg = f"[Message:{platform}] | {recipient_phone} | {message}{err_suffix}"

        log = SystemLog(
            actor_type="system",
            actor_id=None,
            username="system_sms",
            action=action_msg,
            shop_id=shop_id
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_err:
        logger.error(f"Failed to log SMS action: {log_err}")

def send_order_status_sms(order, status):
    """
    Sends an SMS notification to the customer when their order status changes,
    respecting the shop's toggle switches (sms_dispatch_enabled, sms_delivery_enabled).
    Supports both standard Order and CustomizationOrder models.
    Supports both DLT Route (if configured) and Quick SMS route fallback.
    """
    import os
    try:
        from models import Shop
        shop = Shop.query.get(order.shop_id)
        if not shop:
            logger.error(f"Shop not found for order ID {order.id}")
            return False

        # Get customer phone: handles standard Order and CustomizationOrder models
        # For CustomizationOrder, phone might be in billing_phone or user.contact_phone
        phone = getattr(order, 'billing_phone', None)
        if not phone and getattr(order, 'user', None):
            phone = getattr(order.user, 'contact_phone', None)

        if not phone:
            logger.warning(f"No phone number found for order ID {order.id}")
            return False

        # Clean/sanitize phone number (strip spaces, ensure proper format for Fast2SMS)
        phone = "".join(c for c in str(phone) if c.isdigit())
        if len(phone) > 10:
            phone = phone[-10:] # get last 10 digits for India numbers if code is prepended

        api_key = shop.sms_api_key or os.getenv("FAST2SMS_API_KEY")
        if not api_key:
            logger.warning("No Fast2SMS API Key configured.")
            return False

        # Determine if custom order or standard order
        is_custom = (order.__class__.__name__ == 'CustomizationOrder')
        order_display_id = f"custom order #{order.id}" if is_custom else f"order #{order.online_order_number or order.id}"

        message_text = ""
        route = "q"
        variables_values = None
        sender_id = None

        if status == 'Dispatched':
            if not getattr(shop, 'sms_dispatch_enabled', False):
                return False
            
            # Use DLT route if both template ID and Sender ID are configured
            if getattr(shop, 'sms_dispatch_template_id', None) and getattr(shop, 'sms_sender_id', None):
                route = "dlt"
                sender_id = shop.sms_sender_id
                # Message is the DLT Template ID
                message_text = shop.sms_dispatch_template_id
                
                # Variables: 1. Order ID/Number, 2. Tracking ID
                tracking_val = getattr(order, 'tracking_info', None) or "N/A"
                # Remove delimiters if tracking_val has pipes
                tracking_val = str(tracking_val).replace('|', '')
                variables_values = f"{order_display_id}|{tracking_val}"
                
                log_msg = f"[DLT Dispatch] Template ID: {shop.sms_dispatch_template_id} | Variables: {order_display_id}, {tracking_val}"
            else:
                # Fallback to Quick SMS route
                tracking_info_str = f" Tracking info: {order.tracking_info}." if getattr(order, 'tracking_info', None) else ""
                message_text = f"Your {order_display_id} has been dispatched.{tracking_info_str} Thank you for shopping with {shop.name}!"
                log_msg = message_text
                
        elif status in ['Customer Received', 'Completed']:
            if not getattr(shop, 'sms_delivery_enabled', False):
                return False
                
            # Use DLT route if both template ID and Sender ID are configured
            if getattr(shop, 'sms_delivery_template_id', None) and getattr(shop, 'sms_sender_id', None):
                route = "dlt"
                sender_id = shop.sms_sender_id
                # Message is the DLT Template ID
                message_text = shop.sms_delivery_template_id
                
                # Variables: 1. Order ID/Number
                variables_values = order_display_id
                
                log_msg = f"[DLT Delivery] Template ID: {shop.sms_delivery_template_id} | Variables: {order_display_id}"
            else:
                # Fallback to Quick SMS route
                message_text = f"Your {order_display_id} has been successfully delivered. Thank you for shopping with {shop.name}!"
                log_msg = message_text
        else:
            # We don't have toggles/routes for other statuses
            return False

        res = send_sms_via_fast2sms(
            api_key=api_key,
            numbers=phone,
            message=message_text,
            route=route,
            variables_values=variables_values,
            sender_id=sender_id
        )

        log_sms_action(
            shop_id=shop.id,
            recipient_phone=phone,
            success=res.get("success", False),
            message=log_msg,
            error_msg=res.get("error")
        )
        return res.get("success", False)
    except Exception as e:
        logger.exception(f"Failed to send order status SMS notification: {str(e)}")
        return False
