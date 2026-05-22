import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
from datetime import datetime

def replace_placeholders(text, placeholders, is_html=False):
    """
    Replace placeholders case-insensitively and whitespace-insensitively inside curly braces.
    For HTML content, placeholders are styled bold and colored with the theme color (#7a4ea5).
    """
    # Normalize keys: convert to lowercase and strip whitespace
    norm_placeholders = {str(k).strip().lower(): v for k, v in placeholders.items()}
    
    # Pattern matching { any characters except {} }
    pattern = re.compile(r'\{([^{}]+)\}')
    
    def replacer(match):
        raw = match.group(0)
        inner = match.group(1).strip().lower()
        if inner in norm_placeholders:
            val = str(norm_placeholders[inner])
            if is_html:
                return f'<strong style="color: #7a4ea5; font-weight: bold;">{val}</strong>'
            else:
                return val
        return raw
        
    return pattern.sub(replacer, text)

def wrap_in_premium_template(shop, body_html, template_type):
    # Header display:
    header_html = f'<div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eae6f0;">'
    header_html += f'<h1 style="font-family: \'Playfair Display\', \'Georgia\', serif; font-size: 24px; color: #7a4ea5; margin: 0; font-weight: bold; letter-spacing: 0.5px;">{shop.name}</h1>'
    header_html += f'</div>'

    # Footer display:
    footer_html = f'<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eae6f0; text-align: center; font-family: \'Inter\', \'Helvetica Neue\', Arial, sans-serif; font-size: 12px; color: #8c8594; line-height: 1.5;">'
    if shop.address:
        footer_html += f'<p style="margin: 0 0 6px 0;">{shop.address}</p>'
    footer_html += f'<p style="margin: 0;">&copy; {datetime.now().year} {shop.name}. All rights reserved.</p>'
    footer_html += f'<p style="margin: 4px 0 0 0; font-size: 11px; color: #b4aebc;">This is an automated transactional email from {shop.name}.</p>'
    footer_html += f'</div>'

    # Container layout:
    html_layout = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{shop.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6fa; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f6fa; padding: 40px 10px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e2ed; box-shadow: 0 4px 12px rgba(122, 78, 165, 0.03); overflow: hidden; border-top: 5px solid #7a4ea5;">
                    <tr>
                        <td style="padding: 40px 30px;">
                            {header_html}
                            <div style="font-size: 15px; line-height: 1.6; color: #4a4550; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: left;">
                                {body_html}
                            </div>
                            {footer_html}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
    return html_layout

def log_smtp_action(shop, template_type, recipient_email, success, error_msg=None, sender_info=None):
    try:
        from models import db, SystemLog, User
        from flask import request, has_request_context

        actor_type = 'system'
        actor_id = None
        username = 'system'

        if sender_info:
            actor_type = sender_info.get('actor_type', 'system')
            actor_id = sender_info.get('actor_id')
            username = sender_info.get('username', 'system')
        elif has_request_context() and hasattr(request, 'user') and request.user:
            actor_type = request.user.get('role', 'system')
            actor_id = request.user.get('user_id')
            username = request.user.get('username', 'system')
        else:
            # Fallback based on template_type
            if template_type in ['otp', 'forgot_password']:
                actor_type = 'visitor'
                username = recipient_email
            elif template_type == 'purchase':
                actor_type = 'user'
                # Attempt to find user
                usr = User.query.filter_by(email=recipient_email).first()
                if usr:
                    actor_id = usr.id
                    username = usr.username
                else:
                    username = recipient_email

        status_str = "SUCCESS" if success else "FAILED"
        err_suffix = f" (Error: {error_msg})" if error_msg else ""
        action_msg = f"[SMTP] {status_str} | Type: {template_type} | To: {recipient_email}{err_suffix}"

        log = SystemLog(
            actor_type=actor_type,
            actor_id=actor_id,
            username=username,
            action=action_msg,
            shop_id=shop.id
        )
        db.session.add(log)
        db.session.commit()
        print(f"Logged SMTP action: {action_msg}")
    except Exception as log_err:
        print(f"Failed to log SMTP action: {log_err}")

def send_shop_email(shop, template_type, recipient_email, placeholders, sender_info=None):
    """
    Load SMTP settings and template from the shop, replace placeholders, and send via smtplib.
    """
    if not shop.smtp_host or not shop.smtp_port or not shop.smtp_user or not shop.smtp_password:
        msg = f"SMTP not configured for shop {shop.name} (ID: {shop.id}). Skipping email."
        print(msg)
        log_smtp_action(shop, template_type, recipient_email, False, "SMTP settings not configured", sender_info)
        return False

    templates = shop.email_templates
    template = templates.get(template_type)
    if not template:
        msg = f"Template type '{template_type}' not found for shop {shop.name}."
        print(msg)
        log_smtp_action(shop, template_type, recipient_email, False, msg, sender_info)
        return False

    subject_tmpl = template.get("subject", "")
    body_tmpl = template.get("body", "")

    # Always provide default placeholders
    placeholders = {**placeholders, "shop_name": shop.name}

    subject = replace_placeholders(subject_tmpl, placeholders, is_html=False)
    body_plain = replace_placeholders(body_tmpl, placeholders, is_html=False)
    body_html = replace_placeholders(body_tmpl, placeholders, is_html=True)

    msg = MIMEMultipart('alternative')
    # Format: From: "Sender Name" <email>
    from_name = shop.smtp_sender_name or shop.name
    msg['From'] = f'"{from_name}" <{shop.smtp_user}>'
    msg['To'] = recipient_email
    msg['Subject'] = subject

    # Support HTML if body_tmpl contains basic HTML indicators
    html_indicators = ["<html", "<body>", "<div>", "<p>", "<br>", "<strong>", "<table>"]
    is_html = any(indicator in body_tmpl.lower() for indicator in html_indicators)
    is_full_html = "html" in body_tmpl.lower() and ("body" in body_tmpl.lower() or "head" in body_tmpl.lower())

    if is_full_html:
        html_body = body_html
    else:
        # Fallback to plain text, but also add HTML linebreaks as alternative for spacing
        formatted_body = body_html if is_html else body_html.replace(chr(10), '<br>')
        html_body = wrap_in_premium_template(shop, formatted_body, template_type)

    msg.attach(MIMEText(body_plain, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        port = int(shop.smtp_port)
        if shop.smtp_use_tls:
            server = smtplib.SMTP(shop.smtp_host, port, timeout=10)
            server.starttls()
        else:
            if port == 465:
                server = smtplib.SMTP_SSL(shop.smtp_host, port, timeout=10)
            else:
                server = smtplib.SMTP(shop.smtp_host, port, timeout=10)
            
        server.login(shop.smtp_user, shop.smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Email type '{template_type}' sent to {recipient_email} via shop {shop.name} SMTP.")
        log_smtp_action(shop, template_type, recipient_email, True, sender_info=sender_info)
        return True
    except Exception as e:
        err_msg = str(e)
        print(f"SMTP error sending email to {recipient_email} via shop {shop.name}: {err_msg}")
        log_smtp_action(shop, template_type, recipient_email, False, err_msg, sender_info)
        return False
