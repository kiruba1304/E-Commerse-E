with open('admin.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '@admin_bp.route' in line or 'def ' in line:
        if 'product' in line.lower() or 'delete' in line.lower():
            print(f"Line {i+1}: {line.strip()}")
