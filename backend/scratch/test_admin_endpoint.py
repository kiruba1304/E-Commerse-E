import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app
from models import db, Admin

def test_endpoint():
    with app.app_context():
        # Get first admin
        admin = Admin.query.first()
        if not admin:
            print("No admin found in database.")
            return
        
        # We need their username, but passwords are hashed. Let's see if we can find their username.
        print(f"Found admin username: {admin.username}")
        
        # Instead of guessing the password, we can generate a token using our backend's token generator helper!
        from auth_middleware import generate_token
        token = generate_token(admin.id, admin.username, 'admin', admin.shop_id)
        print(f"Generated token: {token[:20]}...")
        
        # Now make the request to localhost:5500 (the running backend port)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        url = "http://127.0.0.1:5500/api/admin/customizations"
        try:
            res = requests.get(url, headers=headers)
            print(f"Status Code: {res.status_code}")
            print(f"Response: {res.text[:1000]}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == '__main__':
    test_endpoint()
