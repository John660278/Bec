import os

def fix_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the block where <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> is incorrectly inside <script>
    broken_str = '''<script>
  // ==========================================
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="config.js"></script>
<script src="supabase_wrapper.js"></script>
  // ==========================================
'''

    fixed_str = '''<!-- Supabase & Wrapper -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="config.js"></script>
<script src="supabase_wrapper.js"></script>
<script>
  // ==========================================
'''
    if broken_str in content:
        content = content.replace(broken_str, fixed_str)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('admin_dashboard.html')
fix_file('student_dashboard.html')
print("Fixed scripts")
