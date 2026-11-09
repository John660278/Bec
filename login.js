/**
 * ฟังก์ชันนี้จะถูกเรียกอัตโนมัติเมื่อผู้ใช้ Login ผ่าน Supabase Auth สำเร็จ
 */
async function handleSupabaseSession(session) {
    document.querySelectorAll('.google-btn-wrapper').forEach(el => el.style.display = 'none');
    const loadingHints = [
        document.getElementById('loadingHint'),
        document.getElementById('loadingHintKuromi'),
        document.getElementById('loadingHintVintage'),
        document.getElementById('loadingHintMinecraft'),
        document.getElementById('loadingHintBlack')
    ].filter(Boolean);
    loadingHints.forEach(lh => {
        lh.innerHTML = '<div class="spinner"></div><span>กำลังตรวจสอบข้อมูล...</span>';
        lh.style.display = 'flex';
    });
    ['errorMessage', 'errorMessageKuromi', 'errorMessageVintage', 'errorMessageMinecraft', 'errorMessageBlack'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    try {
        const userEmail = session.user.email;
        const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User';
        const userPicture = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';

        // เช็คกับฐานข้อมูล public.users ว่ามี Email นี้ไหม
        const { data, error } = await window.myAppDb
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        if (error) {
            console.error("Supabase Error:", error);
            showError(`เกิดข้อผิดพลาดจากฐานข้อมูล: ${error.message || 'ไม่สามารถเข้าถึงข้อมูลได้'}`);
            document.querySelectorAll('.google-btn-wrapper').forEach(el => el.style.display = 'flex');
            loadingHints.forEach(lh => lh.style.display = 'none');
            return;
        }
        if (!data) {
            showError(`ไม่อนุญาตให้เข้าถึง: ไม่พบอีเมล ${userEmail} ในระบบ`);
            document.querySelectorAll('.google-btn-wrapper').forEach(el => el.style.display = 'flex');
            loadingHints.forEach(lh => lh.style.display = 'none');
            // Sign out completely so they can try again with a different account
            await window.myAppDb.auth.signOut();
            return;
        }

        // บันทึกธีมที่ผู้ใช้เลือกไว้จากฐานข้อมูลลงเครื่อง
        const userTheme = data.theme || data.preferred_theme || 'black';
        localStorage.setItem('bec_app_theme', userTheme);

        // บันทึกข้อมูลลงเครื่องแล้วพาไปหน้า Dashboard ทันที
        sessionStorage.removeItem('bec_theme_promo_dismissed');
        sessionStorage.setItem('loggedInUser', JSON.stringify({
            email: userEmail,
            name: data.name || userName,
            picture: userPicture,
            role: data.role,
            studentId: data.student_id,
            theme: userTheme
        }));

        if (data.role === 'Admin') { 
            window.location.replace('admin_dashboard.html');
        } else {
            window.location.replace('student_dashboard.html');
        }

    } catch (error) {
        console.error("เกิดข้อผิดพลาด:", error);
        showError("การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง");
        loadingHints.forEach(lh => lh.style.display = 'none');
    }
}

function showError(message) {
    let shown = false;
    ['errorMessage', 'errorMessageKuromi', 'errorMessageVintage', 'errorMessageMinecraft', 'errorMessageBlack'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
            shown = true;
        }
    });
    if (!shown) {
        alert(message);
    }
}

/**
 * เข้าสู่ระบบตรงด้วยรหัสนิสิต 8 หลัก หรือ อีเมลมหาวิทยาลัย
 * (แก้ปัญหา Google OAuth Error 400 จากนโยบายสิทธิ์ความปลอดภัยของมหาวิทยาลัย)
 */
async function handleDirectLogin(btn) {
    const card = btn ? btn.closest('.black-card, .kuromi-card, .vintage-card, .minecraft-card') : null;
    const input = card ? card.querySelector('.direct-login-input') : document.querySelector('.direct-login-input');
    const rawVal = (input ? input.value : '').trim();
    if (!rawVal) {
        showError('กรุณากรอกรหัสนิสิต 8 หลัก หรือ อีเมลมหาวิทยาลัย');
        return;
    }

    const val = rawVal.toLowerCase();
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>กำลังตรวจสอบ...</span>';
    }

    ['errorMessage', 'errorMessageKuromi', 'errorMessageVintage', 'errorMessageMinecraft', 'errorMessageBlack'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    try {
        // บัญชีผู้ดูแลระบบ (Admin)
        const adminKeywords = ['admin', 'admin69', 'admin@nu.ac.th', '68364906', 'wanchanachaiu68@nu.ac.th'];
        if (adminKeywords.includes(val)) {
            const adminUser = {
                email: 'wanchanachaiu68@nu.ac.th',
                name: 'ผู้ดูแลระบบกองทุน (Admin)',
                role: 'Admin',
                studentId: '68364906',
                theme: localStorage.getItem('bec_app_theme') || 'black'
            };
            sessionStorage.removeItem('bec_theme_promo_dismissed');
            sessionStorage.setItem('loggedInUser', JSON.stringify(adminUser));
            window.location.replace('admin_dashboard.html');
            return;
        }

        // ค้นหาในฐานข้อมูลด้วยรหัสนิสิต หรือ อีเมล
        const isEmail = val.includes('@');
        let query = window.myAppDb.from('users').select('*');
        if (isEmail) {
            query = query.eq('email', val);
        } else {
            query = query.eq('student_id', rawVal);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.error('Supabase query error:', error);
            showError('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ' + error.message);
            return;
        }

        if (!data) {
            showError(`ไม่พบข้อมูลนิสิต "${rawVal}" ในระบบกองทุน กรุณาตรวจสอบรหัสนิสิต 8 หลัก`);
            return;
        }

        // บันทึกธีมที่เลือกไว้
        const userTheme = data.theme || data.preferred_theme || 'black';
        localStorage.setItem('bec_app_theme', userTheme);

        const sessionUser = {
            email: data.email,
            name: data.name,
            role: data.role || 'Student',
            studentId: data.student_id,
            theme: userTheme
        };

        sessionStorage.removeItem('bec_theme_promo_dismissed');
        sessionStorage.setItem('loggedInUser', JSON.stringify(sessionUser));

        if (data.role === 'Admin') {
            window.location.replace('admin_dashboard.html');
        } else {
            window.location.replace('student_dashboard.html');
        }
    } catch (err) {
        console.error('Login error:', err);
        showError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + (err.message || ''));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

/**
 * ทางลัดเข้าสู่ระบบเหรัญญิก/แอดมินโดยตรง
 */
function handleAdminQuickLogin() {
    const adminUser = {
        email: 'wanchanachaiu68@nu.ac.th',
        name: 'ผู้ดูแลระบบกองทุน (Admin)',
        role: 'Admin',
        studentId: '68364906',
        theme: localStorage.getItem('bec_app_theme') || 'black'
    };
    sessionStorage.removeItem('bec_theme_promo_dismissed');
    sessionStorage.setItem('loggedInUser', JSON.stringify(adminUser));
    window.location.replace('admin_dashboard.html');
}
