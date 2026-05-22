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

def send_shop_email(shop, template_type, recipient_email, placeholders):
    """
    Load SMTP settings and template from the shop, replace placeholders, and send via smtplib.
    """
    if not shop.smtp_host or not shop.smtp_port or not shop.smtp_user or not shop.smtp_password:
        print(f"SMTP not configured for shop {shop.name} (ID: {shop.id}). Skipping email.")
        return False

    templates = shop.email_templates
    template = templates.get(template_type)
    if not template:
        print(f"Template type '{template_type}' not found for shop {shop.name}.")
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
        return True
    except Exception as e:
        print(f"SMTP error sending email to {recipient_email} via shop {shop.name}: {e}")
        return False
