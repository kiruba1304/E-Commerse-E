import os
import sys
import uuid

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db, Shop, User

def test_registration_points():
    print("Starting registration points verification tests...")
    
    with app.app_context():
        # Let's find or create a test shop
        shop = Shop.query.filter_by(name="NobaraaFashion").first()
        if not shop:
            shop = Shop(
                name="NobaraaFashion",
                super_coin_enabled=True,
                super_coin_ratio=10,
                welcome_super_coins=50
            )
            db.session.add(shop)
            db.session.commit()
            print(f"Created NobaraaFashion shop with ID: {shop.id}")
        else:
            print(f"Found NobaraaFashion shop with ID: {shop.id}, welcome_super_coins: {shop.welcome_super_coins}")
            
        # Test client
        client = app.test_client()
        
        # Test Case 1: Custom welcome points (e.g., 85 pearls)
        shop.super_coin_enabled = True
        shop.welcome_super_coins = 85
        db.session.commit()
        
        username1 = f"testuser_{uuid.uuid4().hex[:6]}"
        email1 = f"{username1}@example.com"
        
        response = client.post('/api/user/register', json={
            'username': username1,
            'email': email1,
            'password': 'password123',
            'name': 'Test User 1',
            'shop_id': shop.id
        })
        
        assert response.status_code in (200, 201), f"Registration failed: {response.get_data(as_text=True)}"
        user1 = User.query.filter_by(username=username1).first()
        print(f"Test Case 1 (Enabled, welcome=85): Registered user got {user1.super_coins} pearls. Expected: 85. Pass: {user1.super_coins == 85}")
        
        # Test Case 2: Privilege Pearls disabled for the shop
        shop.super_coin_enabled = False
        db.session.commit()
        
        username2 = f"testuser_{uuid.uuid4().hex[:6]}"
        email2 = f"{username2}@example.com"
        
        response = client.post('/api/user/register', json={
            'username': username2,
            'email': email2,
            'password': 'password123',
            'name': 'Test User 2',
            'shop_id': shop.id
        })
        
        assert response.status_code in (200, 201), f"Registration failed: {response.get_data(as_text=True)}"
        user2 = User.query.filter_by(username=username2).first()
        print(f"Test Case 2 (Disabled, welcome=85): Registered user got {user2.super_coins} pearls. Expected: 0. Pass: {user2.super_coins == 0}")
        
        # Test Case 3: Privilege Pearls enabled, welcome_super_coins set to 0
        shop.super_coin_enabled = True
        shop.welcome_super_coins = 0
        db.session.commit()
        
        username3 = f"testuser_{uuid.uuid4().hex[:6]}"
        email3 = f"{username3}@example.com"
        
        response = client.post('/api/user/register', json={
            'username': username3,
            'email': email3,
            'password': 'password123',
            'name': 'Test User 3',
            'shop_id': shop.id
        })
        
        assert response.status_code in (200, 201), f"Registration failed: {response.get_data(as_text=True)}"
        user3 = User.query.filter_by(username=username3).first()
        print(f"Test Case 3 (Enabled, welcome=0): Registered user got {user3.super_coins} pearls. Expected: 0. Pass: {user3.super_coins == 0}")
        
        # Cleanup test users
        db.session.delete(user1)
        db.session.delete(user2)
        db.session.delete(user3)
        # Restore shop state
        shop.super_coin_enabled = True
        shop.welcome_super_coins = 50
        db.session.commit()
        print("Cleanup done. Verification tests finished.")

if __name__ == "__main__":
    test_registration_points()
