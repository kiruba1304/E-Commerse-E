import sys
import os
import requests
import json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app
from models import db, Order, CustomizationOrder, User, Shop, Product

def setup_mock_data():
    with app.app_context():
        # Ensure we have at least one user, shop, and product to create orders
        user = User.query.first()
        shop = Shop.query.first()
        product = Product.query.first()
        
        if not user or not shop or not product:
            print("Required database entities (User, Shop, Product) are missing.")
            return None
        
        # 1. Create standard order for delivery test
        order1 = Order(
            user_id=user.id,
            shop_id=shop.id,
            total_amount=500.0,
            final_amount=500.0,
            payment_method='COD',
            payment_status='Pending',
            status='Dispatched',
            shipping_address='123 Test St, Test City, 110001',
            billing_phone='9999999999',
            shiprocket_order_id='SR_MOCK_ORD_101',
            shiprocket_shipment_id='SR_MOCK_SHIP_101',
            tracking_info='Shiprocket AWB: SR_AWB_101'
        )
        db.session.add(order1)
        
        # 2. Create standard order for RTO test
        order2 = Order(
            user_id=user.id,
            shop_id=shop.id,
            total_amount=300.0,
            final_amount=300.0,
            payment_method='Prepaid',
            payment_status='Paid',
            status='Dispatched',
            shipping_address='456 Return Rd, Return City, 220002',
            billing_phone='9999999999',
            shiprocket_order_id='SR_MOCK_ORD_102',
            shiprocket_shipment_id='SR_MOCK_SHIP_102',
            tracking_info='Shiprocket AWB: SR_AWB_102'
        )
        db.session.add(order2)
        
        # 3. Create customization order for delivery test
        cust_order = CustomizationOrder(
            user_id=user.id,
            shop_id=shop.id,
            product_id=product.id,
            quantity=1,
            payment_method='COD',
            payment_status='Pending',
            status='Dispatched',
            shipping_address='789 Custom Lane, Custom City, 330003',
            billing_phone='9999999999',
            shiprocket_order_id='SR_MOCK_CUST_ORD_201',
            shiprocket_shipment_id='SR_MOCK_CUST_SHIP_201',
            tracking_info='Shiprocket AWB: SR_AWB_201'
        )
        db.session.add(cust_order)
        
        db.session.commit()
        
        print("Mock orders created successfully:")
        print(f" - Standard Order 1 (Delivered test): ID {order1.id}, Shipment ID {order1.shiprocket_shipment_id}")
        print(f" - Standard Order 2 (RTO test): ID {order2.id}, Shipment ID {order2.shiprocket_shipment_id}")
        print(f" - Customization Order (Delivered test): ID {cust_order.id}, Shipment ID {cust_order.shiprocket_shipment_id}")
        
        return order1.id, order2.id, cust_order.id

def test_webhook_requests():
    ids = setup_mock_data()
    if not ids:
        return
        
    ord1_id, ord2_id, cust_id = ids
    
    url = "http://127.0.0.1:5500/api/webhooks/shipping-status"
    headers = {"Content-Type": "application/json"}
    
    # Payload 1: Deliver standard order 1
    payload1 = {
        "awb": "SR_AWB_101",
        "shipment_id": "SR_MOCK_SHIP_101",
        "order_id": "SR_MOCK_ORD_101",
        "status": "delivered",
        "status_code": 7
    }
    
    # Payload 2: Deliver customization order
    payload2 = {
        "awb": "SR_AWB_201",
        "shipment_id": "SR_MOCK_CUST_SHIP_201",
        "order_id": "SR_MOCK_CUST_ORD_201",
        "status": "delivered",
        "status_code": 7
    }
    
    # Payload 3: Return standard order 2 (RTO)
    payload3 = {
        "awb": "SR_AWB_102",
        "shipment_id": "SR_MOCK_SHIP_102",
        "order_id": "SR_MOCK_ORD_102",
        "status": "rto delivered",
        "status_code": 17
    }
    
    print("\nSending Webhook Payloads...")
    
    # Send request 1
    r1 = requests.post(url, json=payload1, headers=headers)
    print(f"Payload 1 (Delivered Standard) -> Status: {r1.status_code}, Response: {r1.json()}")
    
    # Send request 2
    r2 = requests.post(url, json=payload2, headers=headers)
    print(f"Payload 2 (Delivered Customization) -> Status: {r2.status_code}, Response: {r2.json()}")
    
    # Send request 3
    r3 = requests.post(url, json=payload3, headers=headers)
    print(f"Payload 3 (Returned RTO Standard) -> Status: {r3.status_code}, Response: {r3.json()}")
    
    # Verify in DB
    print("\nVerifying database updates...")
    with app.app_context():
        db_ord1 = Order.query.get(ord1_id)
        db_ord2 = Order.query.get(ord2_id)
        db_cust = CustomizationOrder.query.get(cust_id)
        
        print(f"Standard Order 1 Status: {db_ord1.status} (Expected: Customer Received)")
        print(f"Standard Order 1 Payment Status: {db_ord1.payment_status} (Expected: Paid)")
        print(f"Standard Order 1 SuperCoins Earned: {db_ord1.super_coins_earned}")
        
        print(f"Standard Order 2 Status: {db_ord2.status} (Expected: Returned)")
        
        print(f"Customization Order Status: {db_cust.status} (Expected: Completed)")
        print(f"Customization Order Payment Status: {db_cust.payment_status} (Expected: Paid)")
        
        # Cleanup
        db.session.delete(db_ord1)
        db.session.delete(db_ord2)
        db.session.delete(db_cust)
        db.session.commit()
        print("\nMock data cleaned up from database.")

if __name__ == '__main__':
    test_webhook_requests()
