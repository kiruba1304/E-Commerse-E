import os
import sys
import time
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db, Shop, User, Admin, HelpTicket, Notification, SystemLog
from auth_middleware import generate_token

def test_async_ticket_reply():
    print("Testing async ticket reply thread connection fix...")
    
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

        # Find or create a test customer
        user = User.query.filter_by(email="customer_test@example.com").first()
        if not user:
            user = User(
                name="Test Customer",
                email="customer_test@example.com",
                username="customer_test",
                contact_phone="9876543210",
                password_hash="pbkdf2:sha256:..."
            )
            db.session.add(user)
            db.session.commit()

        user.fcm_token = "mock_fcm_token_123"
        db.session.commit()

        # Find or create a test Admin
        admin = Admin.query.filter_by(shop_id=shop.id).first()
        if not admin:
            admin = Admin.query.first()
        if not admin:
            admin = Admin(
                username="test_admin",
                password_hash="pbkdf2:sha256:...",
                role="admin",
                shop_id=shop.id
            )
            db.session.add(admin)
            db.session.commit()

        # Generate Bearer Token for Admin
        token = generate_token(admin.id, admin.username, 'admin', admin.shop_id)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Create an open Help Ticket
        ticket = HelpTicket(
            user_id=user.id,
            shop_id=shop.id,
            subject="Async session test query",
            message="Hi admin, is this thread safe?",
            status="Open"
        )
        db.session.add(ticket)
        db.session.commit()
        ticket_id = ticket.id

        client = app.test_client()

        # Mock SMTP and FCM
        with patch('smtplib.SMTP') as mock_smtp, \
             patch('fcm_helper.send_fcm_notification') as mock_send_fcm:
            
            mock_smtp_inst = MagicMock()
            mock_smtp.return_value = mock_smtp_inst

            print("Sending PUT request to reply to help ticket...")
            response = client.put('/api/admin/help-tickets', headers=headers, json={
                "ticket_id": ticket_id,
                "reply": "Yes, now it queries Shop inside the app context correctly."
            })
            
            assert response.status_code == 200, f"PUT request failed: {response.get_data(as_text=True)}"
            print("PUT request finished with 200 OK.")

            # Wait to ensure async thread finishes execution without raising Session error
            print("Waiting for background thread...")
            time.sleep(3)
            db.session.commit()

            # Verify SMTP system log was written (which proves the thread completed and didn't crash)
            logs = SystemLog.query.filter(
                SystemLog.shop_id == shop.id,
                SystemLog.action.like('%ticket_reply%')
            ).order_by(SystemLog.id.desc()).all()
            
            assert len(logs) > 0, "No SMTP system log was generated."
            latest_log = logs[0]
            print(f"SMTP Log Status: {latest_log.action}")
            assert "SUCCESS" in latest_log.action, "Expected SMTP SUCCESS log"

        # Cleanup
        db.session.delete(HelpTicket.query.get(ticket_id))
        db.session.delete(latest_log)
        
        # Restore original SMTP settings
        shop.smtp_host = orig_smtp_host
        shop.smtp_port = orig_smtp_port
        shop.smtp_user = orig_smtp_user
        shop.smtp_password = orig_smtp_password
        db.session.commit()
        
        print("Test passed successfully! No SQLAlchemy session detached errors occurred.")

if __name__ == "__main__":
    test_async_ticket_reply()
