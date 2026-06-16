import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import app
    print(" Flask App URL Map:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint} -> {rule.rule} [{', '.join(rule.methods)}]")
except Exception as e:
    import traceback
    traceback.print_exc()
