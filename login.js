/**
 * ฟังก์ชันนี้จะถูกเรียกอัตโนมัติเมื่อผู้ใช้ Login ผ่าน Supabase Auth สำเร็จ
 */
async function handleSupabaseSession(session) {
    document.querySelector('.google-btn-wrapper').style.display = 'none';
    const loadingHint = document.getElementById('loadingHint');
    if(loadingHint) {
        loadingHint.innerHTML = '<div class="spinner"></div><span>กำลังตรวจสอบข้อมูล...</span>';
        loadingHint.style.display = 'flex';
    }
    document.getElementById('errorMessage').style.display = 'none';

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
            document.querySelector('.google-btn-wrapper').style.display = 'flex';
            if(loadingHint) loadingHint.style.display = 'none';
            return;
        }
        if (!data) {
            showError(`ไม่อนุญาตให้เข้าถึง: ไม่พบอีเมล ${userEmail} ในระบบ`);
            document.querySelector('.google-btn-wrapper').style.display = 'flex';
            if(loadingHint) loadingHint.style.display = 'none';
            // Sign out completely so they can try again with a different account
            await window.myAppDb.auth.signOut();
            return;
        }

        // บันทึกข้อมูลลงเครื่องแล้วพาไปหน้า Dashboard ทันที
        sessionStorage.setItem('loggedInUser', JSON.stringify({
            email: userEmail,
            name: data.name || userName,
            picture: userPicture,
            role: data.role,
            studentId: data.student_id
        }));

        if (data.role === 'Admin') { 
            window.location.replace('admin_dashboard.html');
        } else {
            window.location.replace('student_dashboard.html');
        }

    } catch (error) {
        console.error("เกิดข้อผิดพลาด:", error);
        showError("การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง");
        document.querySelector('.google-btn-wrapper').style.display = 'flex';
        if(loadingHint) loadingHint.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
