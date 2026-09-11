/**
 * ฟังก์ชันนี้จะถูกเรียกอัตโนมัติเมื่อผู้ใช้ Login ผ่าน Google สำเร็จ
 * @param {Object} response - ข้อมูลที่ได้กลับมาจาก Google (มี JWT Token)
 */
async function handleCredentialResponse(response) {
    const userData = decodeJwtResponse(response.credential);
    const userEmail = userData.email;
    const userName = userData.name;
    const userPicture = userData.picture;

    console.log("ล็อกอินด้วย Email:", userEmail);

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', userEmail)
            .single();

        if (error || !data) {
            showError(`Error: ไม่พบ Email (${userEmail}) ในระบบ กรุณาติดต่อแอดมิน`);
            return;
        }

        sessionStorage.setItem('loggedInUser', JSON.stringify({
            email: userEmail,
            name: userName,
            picture: userPicture,
            role: data.role,
            studentId: data.student_id
        }));

        // Role-based Routing
        if (data.role === 'Admin') { 
            window.location.href = 'admin_dashboard.html';
        } else {
            window.location.href = 'student_dashboard.html';
        }

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล:", error);
        showError("ระบบขัดข้อง ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้");
    }
}

/**
 * ฟังก์ชันตัวช่วยสำหรับถอดรหัส JWT (JSON Web Token)
 */
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

/**
 * ฟังก์ชันสำหรับแสดงข้อความ Error
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
