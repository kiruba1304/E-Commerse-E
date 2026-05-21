import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timezone, timedelta

JWT_SECRET = "secure-ecommerce-platform-secret-key-102938"

def generate_token(user_id, username, role, shop_id=None):
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "shop_id": shop_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token):
    try:
        # If token is a byte or starts with 'Bearer ', extract it
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return {"error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        
        decoded = decode_token(token)
        if "error" in decoded:
            return jsonify({"error": decoded["error"]}), 401
            
        # Attach user data to request context
        request.user = decoded
        return f(*args, **kwargs)
    return decorated

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = request.headers.get("Authorization")
            if not token:
                return jsonify({"error": "Token is missing"}), 401
            
            decoded = decode_token(token)
            if "error" in decoded:
                return jsonify({"error": decoded["error"]}), 401
                
            if decoded.get("role") not in allowed_roles:
                return jsonify({"error": f"Unauthorized access. Requires role: {', '.join(allowed_roles)}"}), 403
                
            request.user = decoded
            return f(*args, **kwargs)
        return decorated
    return decorator
