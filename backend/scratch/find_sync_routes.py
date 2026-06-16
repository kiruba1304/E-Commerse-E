with open('billing_sync.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '@billing_sync_bp.route' in line or 'def ' in line:
        print(f"Line {i+1}: {line.strip()}")
