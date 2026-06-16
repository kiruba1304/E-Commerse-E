import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db, Shop, User
from auth_middleware import generate_token

def run_shipping_estimate_tests():
    print("Starting shipping estimate endpoint verification...")
    
    with app.app_context():
        # Find or create a test shop
        shop = Shop.query.first()
        if not shop:
            shop = Shop(
                name="Test Shop",
                super_coin_enabled=True,
                super_coin_ratio=10
            )
            db.session.add(shop)
            db.session.commit()
            print(f"Created Test Shop with ID: {shop.id}")
        else:
            print(f"Using existing Shop: {shop.name} (ID: {shop.id})")
            
        # Find or create a test user
        user = User.query.first()
        if not user:
            user = User(
                username="testclient_estimate",
                email="estimate@example.com",
                role="user"
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            print(f"Created test user: {user.username}")
        else:
            print(f"Using existing user: {user.username} (ID: {user.id})")
            
        # Generate token
        token = generate_token(user.id, user.username, 'user')
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        client = app.test_client()
        
        # Test Case 1: Missing pincode or shop_id
        response = client.post('/api/user/shipping-estimate', json={}, headers=headers)
        assert response.status_code == 400
        print("Test Case 1 (Missing params) - Status: 400. Pass: True")
        
        # Test Case 2: Invalid pincode (too short)
        response = client.post('/api/user/shipping-estimate', json={
            "shop_id": shop.id,
            "pincode": "123"
        }, headers=headers)
        assert response.status_code == 400
        print("Test Case 2 (Invalid pincode '123') - Status: 400. Pass: True")
        
        # Test Case 3: Invalid pincode (non-numeric)
        response = client.post('/api/user/shipping-estimate', json={
            "shop_id": shop.id,
            "pincode": "600abc"
        }, headers=headers)
        assert response.status_code == 400
        print("Test Case 3 (Invalid pincode '600abc') - Status: 400. Pass: True")
        
        # Test Case 4: Valid Pincode (Simulated/Fallback or Shiprocket)
        response = client.post('/api/user/shipping-estimate', json={
            "shop_id": shop.id,
            "pincode": "600001",
            "weight_kg": 0.5,
            "declared_value": 1500.0,
            "is_cod": False
        }, headers=headers)
        
        assert response.status_code == 200, f"Query failed: {response.get_data(as_text=True)}"
        data = response.get_json()
        print(f"DEBUG: Response data = {data}")
        assert data.get('success') is True
        assert 'estimated_delivery_date' in data
        print(f"Test Case 4 (Valid pincode '600001') - Provider: {data.get('provider')}, EDD: {data.get('estimated_delivery_date')}. Pass: True")
        
        # Test Case 5: Unauthorized role (guest/no token)
        response = client.post('/api/user/shipping-estimate', json={
            "shop_id": shop.id,
            "pincode": "600001"
        })
        assert response.status_code == 401
        print("Test Case 5 (No authorization token) - Status: 401. Pass: True")
        
        print("\nAll shipping estimate verification tests passed successfully!")

if __name__ == "__main__":
    run_shipping_estimate_tests()
