import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app
from models import db, User

with app.app_context():
    users = User.query.all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"User ID: {u.id}, Username: {u.username}, Name: {u.name}, FCM Token: {u.fcm_token}")
