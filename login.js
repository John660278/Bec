/**
 * ฟังก์ชันนี้จะถูกเรียกอัตโนมัติเมื่อผู้ใช้ Login ผ่าน Google สำเร็จ
 */
async function handleCredentialResponse(response) {
    // 1. ซ่อนปุ่ม Google และโชว์หน้าโหลดให้ดู Smooth
    document.querySelector('.google-btn-wrapper').style.display = 'none';
    const loadingHint = document.getElementById('loadingHint');
    loadingHint.innerHTML = '<div class="spinner"></div><span>กำลังพาท่านเข้าสู่ระบบ...</span>';
    loadingHint.style.display = 'flex';
    document.getElementById('errorMessage').style.display = 'none';

    try {
        // 2. ถอดรหัสเอา Email
        const userData = decodeJwtResponse(response.credential);
        const userEmail = userData.email;
        const userName = userData.name;
        const userPicture = userData.picture;

        // 3. เช็คกับฐานข้อมูลว่ามี Email นี้ไหม
        const { data, error } = await window.myAppDb
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        if (error) {
            console.error("Supabase Error:", error);
            showError(`เกิดข้อผิดพลาดจากฐานข้อมูล: ${error.message || 'ไม่สามารถเข้าถึงข้อมูลได้'}`);
            document.querySelector('.google-btn-wrapper').style.display = 'flex';
            loadingHint.style.display = 'none';
            return;
        }
        if (!data) {
            showError(`ไม่อนุญาตให้เข้าถึง: ไม่พบอีเมล ${userEmail} ในระบบ`);
            document.querySelector('.google-btn-wrapper').style.display = 'flex';
            loadingHint.style.display = 'none';
            return;
        }

        // 4. บันทึกข้อมูลลงเครื่องแล้วพาไปหน้า Dashboard ทันที
        sessionStorage.setItem('loggedInUser', JSON.stringify({
            email: userEmail,
            name: userName,
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
        loadingHint.style.display = 'none';
    }
}

function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
