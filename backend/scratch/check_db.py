import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db, Shop

with app.app_context():
    shops = Shop.query.all()
    print("EXISTING SHOPS:")
    for s in shops:
        print(f"Shop ID: {s.id}, Name: {s.name}, super_coin_enabled: {s.super_coin_enabled}, super_coin_ratio: {s.super_coin_ratio}, welcome_super_coins: {s.welcome_super_coins}")
