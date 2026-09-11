import re
import os

def migrate_html_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace Firebase scripts with Supabase
    content = re.sub(
        r'<script src="https://www.gstatic.com/firebasejs/9\.23\.0/.*?></script>\n?',
        '',
        content
    )
    
    # 2. Add config.js right before closing </body> or before custom scripts
    if '<script src="login.js"></script>' in content:
        content = content.replace(
            '<script src="login.js"></script>',
            '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="config.js"></script>\n<script src="login.js"></script>'
        )
    elif 'const firebaseConfig' in content:
        content = re.sub(
            r'// firebase.*?const storage = firebase\.storage\(\);',
            '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="config.js"></script>\n<script src="supabase_wrapper.js"></script>',
            content,
            flags=re.DOTALL
        )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Process files
for file in ['index.html', 'admin_dashboard.html', 'student_dashboard.html']:
    if os.path.exists(file):
        migrate_html_file(file)

print("HTML files migrated.")
