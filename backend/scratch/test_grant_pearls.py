import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import db, Admin, User

def test_grant():
    with app.app_context():
        admin = Admin.query.first()
        if not admin:
            print("No admin found in database.")
            return
            
        user = User.query.first()
        if not user:
            print("No customer/user found in database to grant pearls to.")
            return
            
        print(f"Using Admin: {admin.username} (shop_id: {admin.shop_id})")
        print(f"Targeting User: {user.username} (id: {user.id})")
        
        from auth_middleware import generate_token
        token = generate_token(admin.id, admin.username, 'admin', admin.shop_id)
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test GET customers first
        url_get = "http://127.0.0.1:5500/api/admin/customers"
        try:
            res_get = requests.get(url_get, headers=headers)
            print(f"GET Customers Status: {res_get.status_code}")
            print(f"GET Customers Response: {res_get.text[:200]}")
        except Exception as e:
            print(f"GET Customers failed: {e}")

        url = f"http://127.0.0.1:5500/api/admin/customers/{user.id}/grant-pearls"
        data = {
            "amount": 50,
            "reason": "Test loyalty points reward"
        }
        
        try:
            res = requests.post(url, headers=headers, json=data)
            print(f"Status Code: {res.status_code}")
            print(f"Response: {res.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == '__main__':
    test_grant()
