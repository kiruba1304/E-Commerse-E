import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app
from models import db, Shop
import shiprocket_helper

def run():
    with app.app_context():
        shop = Shop.query.first()
        if not shop:
            print("No shop found.")
            return
        try:
            balance = shiprocket_helper.get_wallet_balance(shop)
            print(f"SUCCESS: Wallet Balance is: {balance}")
        except Exception as e:
            print(f"FAILED: {e}")

if __name__ == '__main__':
    run()
