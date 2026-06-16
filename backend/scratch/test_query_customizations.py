import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app
from models import db, CustomizationOrder

def run():
    with app.app_context():
        try:
            custs = CustomizationOrder.query.all()
            print(f"Total customization orders: {len(custs)}")
            for idx, c in enumerate(custs):
                try:
                    serialized = c.serialize()
                    print(f"[{idx}] ID {c.id}: serialized successfully: {serialized}")
                except Exception as e:
                    print(f"[{idx}] ID {c.id}: serialization failed! Error: {e}")
        except Exception as e:
            print(f"Failed to query database: {e}")

if __name__ == '__main__':
    run()
