import os
import firebase_admin
from firebase_admin import credentials, messaging

firebase_initialized = False

# Try initializing Firebase Admin SDK
try:
    cred_path = os.getenv('FIREBASE_CREDENTIALS_JSON')
    if not cred_path:
        # Default fallback
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_dir, 'firebase-service-account.json')
        
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
        print("Firebase Admin SDK initialized successfully.")
    else:
        print(f"Firebase Admin SDK not initialized: Service account credentials file not found at {cred_path}")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")

def send_fcm_notification(token, title, body, data=None):
    """
    Sends a direct push notification to a specific FCM token.
    """
    if not firebase_initialized:
        print("Firebase is not initialized. Skipping notification send.")
        return False
    
    if not token:
        print("FCM Token is empty. Skipping notification send.")
        return False
        
    try:
        # Convert all data values to string since FCM requires string-only values for message data payloads
        data_str = {}
        if data:
            for k, v in data.items():
                data_str[k] = str(v)
                
        android_config = messaging.AndroidConfig(
            notification=messaging.AndroidNotification(
                sound="notification_sound",
                channel_id="nobaraa_notifications"
            )
        )
        apns_config = messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="notification_sound.caf"
                )
            )
        )
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=token,
            data=data_str if data_str else None,
            android=android_config,
            apns=apns_config
        )
        response = messaging.send(message)
        print(f"Successfully sent FCM notification: {response}")
        return True
    except Exception as e:
        print(f"Error sending FCM notification: {e}")
        # Clear unregistered or not found tokens from the database to prevent future failures
        err_str = str(e).lower()
        if "requested entity was not found" in err_str or "notfound" in err_str or "unregistered" in err_str:
            try:
                from models import db, User
                # Run database update within app context if needed
                from flask import current_app
                # Check if current_app is available
                if current_app:
                    with current_app.app_context():
                        User.query.filter_by(fcm_token=token).update({User.fcm_token: None})
                        db.session.commit()
                        print(f"Cleared unregistered FCM token from database: {token}")
            except Exception as db_err:
                print(f"Failed to clear unregistered FCM token: {db_err}")
        return False

def send_fcm_topic_notification(topic, title, body, data=None):
    """
    Sends a push notification to all devices subscribed to a topic.
    """
    if not firebase_initialized:
        print("Firebase is not initialized. Skipping topic notification send.")
        return False
        
    try:
        # Convert all data values to string
        data_str = {}
        if data:
            for k, v in data.items():
                data_str[k] = str(v)
                
        android_config = messaging.AndroidConfig(
            notification=messaging.AndroidNotification(
                sound="notification_sound",
                channel_id="nobaraa_notifications"
            )
        )
        apns_config = messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="notification_sound.caf"
                )
            )
        )
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            topic=topic,
            data=data_str if data_str else None,
            android=android_config,
            apns=apns_config
        )
        response = messaging.send(message)
        print(f"Successfully sent FCM topic notification to topic '{topic}': {response}")
        return True
    except Exception as e:
        print(f"Error sending FCM topic notification: {e}")
        return False

def send_order_status_notification(order, status):
    """
    Sends FCM notification to the user about their order status change.
    """
    if not order or not order.user:
        return
        
    user = order.user
    if not user.fcm_token:
        print(f"No FCM token registered for user ID {user.id}. Skipping order notification.")
        return
        
    title = ""
    body = ""
    
    if status == 'Dispatched':
        title = "Order Dispatched!"
        body = f"Your order #{order.online_order_number or order.id} has been dispatched. Tracking: {order.tracking_info or 'N/A'}"
    elif status == 'Customer Received':
        title = "Order Delivered!"
        body = f"Your order #{order.online_order_number or order.id} has been delivered successfully. Thank you for shopping!"
    elif status == 'Accepted':
        # Only notify if COD order accepted
        if order.payment_method == 'COD':
            title = "Order Accepted!"
            body = f"Your COD order #{order.online_order_number or order.id} has been accepted and is being processed."
    elif status == 'Rejected':
        # Only notify if COD order rejected
        if order.payment_method == 'COD':
            title = "Order Rejected"
            body = f"Your COD order #{order.online_order_number or order.id} has been rejected."
            
    if title and body:
        send_fcm_notification(user.fcm_token, title, body, data={
            "order_id": str(order.id),
            "status": status
        })

def send_customization_status_notification(cust, type_of_change):
    """
    Sends FCM notification to the user about their customization order changes.
    type_of_change can be 'quote' (when price is quoted) or 'status' (when status is updated)
    """
    if not cust or not cust.user:
        return
        
    user = cust.user
    if not user.fcm_token:
        print(f"No FCM token registered for user ID {user.id}. Skipping customization notification.")
        return
        
    title = ""
    body = ""
    
    if type_of_change == 'quote':
        title = "New Price Quote Received!"
        body = f"Admin has quoted a price of ₹{cust.quoted_price:.2f} for your Customization Request #{cust.id}. Please review and accept to proceed."
    elif type_of_change == 'status':
        if cust.status == 'Rejected':
            title = "Customization Request Rejected"
            body = f"Your Customization Request #{cust.id} has been rejected by the shop."
        elif cust.status == 'In Progress':
            title = "Customization In Progress"
            body = f"Your Customization Request #{cust.id} is now in progress."
        elif cust.status == 'Dispatched':
            title = "Customization Dispatched!"
            body = f"Your Customized Order #{cust.id} has been dispatched. Tracking: {cust.tracking_info or 'N/A'}"
        elif cust.status == 'Completed':
            title = "Customization Completed!"
            body = f"Your Customization Request #{cust.id} is complete."
            
    if title and body:
        send_fcm_notification(user.fcm_token, title, body, data={
            "customization_id": str(cust.id),
            "status": cust.status or "",
            "quote_status": cust.quote_status or ""
        })

