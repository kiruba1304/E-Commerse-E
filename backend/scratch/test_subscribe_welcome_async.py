import os
import sys
import uuid
import time
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db, Shop, SystemLog

def test_subscribe_welcome_async():
    print("Testing async newsletter welcome email thread connection fix...")
    
    with app.app_context():
        # Find or create a shop
        shop = Shop.query.filter_by(name="NobaraaFashion").first()
        if not shop:
            shop = Shop.query.first()
        if not shop:
            print("No shop found to execute test.")
            return

        # Ensure shop has dummy SMTP settings to pass check
        orig_smtp_host = shop.smtp_host
        orig_smtp_port = shop.smtp_port
        orig_smtp_user = shop.smtp_user
        orig_smtp_password = shop.smtp_password

        shop.smtp_host = "smtp.mockserver.com"
        shop.smtp_port = 587
        shop.smtp_user = "nobaraa_test@example.com"
        shop.smtp_password = "mockpassword123"
        db.session.commit()

        # Generate a unique email
        test_email = f"welcome_async_test_{uuid.uuid4().hex[:6]}@example.com"
        print(f"Subscribing email: {test_email}")

        client = app.test_client()

        # Mock SMTP
        with patch('smtplib.SMTP') as mock_smtp:
            mock_smtp_inst = MagicMock()
            mock_smtp.return_value = mock_smtp_inst

            # Post subscription
            response = client.post('/api/user/subscribe', json={
                "email": test_email,
                "shop_id": shop.id
            })
            
            assert response.status_code == 201, f"Subscribe failed: {response.get_data(as_text=True)}"
            print("Subscription successful.")

            # Wait to ensure async thread finishes execution
            print("Waiting for background thread...")
            time.sleep(3)
            db.session.commit()

            # Verify SMTP system log was written (which proves the thread completed and didn't crash)
            logs = SystemLog.query.filter(
                SystemLog.shop_id == shop.id,
                SystemLog.action.like('%newsletter_welcome%')
            ).order_by(SystemLog.id.desc()).all()
            
            assert len(logs) > 0, "No welcome SMTP system log was generated."
            latest_log = logs[0]
            print(f"SMTP Log Status: {latest_log.action}")
            assert "SUCCESS" in latest_log.action, "Expected SMTP SUCCESS log"

        # Cleanup
        db.session.delete(latest_log)
        
        # Restore original SMTP settings
        shop.smtp_host = orig_smtp_host
        shop.smtp_port = orig_smtp_port
        shop.smtp_user = orig_smtp_user
        shop.smtp_password = orig_smtp_password
        db.session.commit()
        
        print("Test passed successfully! No welcome email thread session detached errors occurred.")

if __name__ == "__main__":
    test_subscribe_welcome_async()
