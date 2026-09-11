import re

def rewrite_admin():
    with open('admin_dashboard.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace Firebase SDKs with Supabase
    content = re.sub(
        r'<script src="https://www.gstatic.com/firebasejs/.*?></script>',
        '',
        content,
        flags=re.DOTALL
    )
    
    # 2. Add config.js and supabase
    content = content.replace(
        '// firebase\n',
        '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="config.js"></script>\n'
    )
    
    # Remove firebase config block
    content = re.sub(
        r'const firebaseConfig = {.*?const storage = firebase\.storage\(\);',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Replace onAuthStateChanged block
    content = re.sub(
        r'// รอให้ Firebase Auth พร้อมก่อน.*?}\);',
        'loadOverview();',
        content,
        flags=re.DOTALL
    )

    with open('admin_dashboard_supa.html', 'w', encoding='utf-8') as f:
        f.write(content)

rewrite_admin()
