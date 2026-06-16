import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app
from models import db, User

with app.app_context():
    num_updated = User.query.update({User.fcm_token: None})
    db.session.commit()
    print(f"Cleared FCM tokens for {num_updated} users in the database.")
