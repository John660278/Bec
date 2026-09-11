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
        const sheetData = await verifyEmailWithGoogleSheets(userEmail);

        if (sheetData && sheetData.success) {
            sessionStorage.setItem('loggedInUser', JSON.stringify({
                email: userEmail,
                name: userName,
                picture: userPicture,
                role: sheetData.user.role,
                studentId: sheetData.user.studentId
            }));

            // Role-based Routing
            if (sheetData.user.role === 'Admin') { 
                window.location.href = 'admin_dashboard.html';
            } else {
                window.location.href = 'student_dashboard.html';
            }
        } else {
            showError(`Error: ไม่พบ Email (${userEmail}) ในระบบ หรือ ${sheetData?.message}`);
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล:", error);
        showError("ระบบขัดข้อง ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้");
    }
}

/**
 * เชื่อมต่อและตรวจสอบ Email กับ Google Sheets ผ่าน Google Apps Script
 */
async function verifyEmailWithGoogleSheets(email) {
    console.log("กำลังส่ง API ไปเช็ค Email ใน Google Sheets:", email);
    
    // =================================================================
    // URL ของ Web App ที่ได้จาก Google Apps Script
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMnLEpGSYmdqeQTgU5s4vtVTRKhhAC594wcF-wycBuJqy4tB-XOxi6xAsP6TXPUuy4ew/exec"; 
    // =================================================================

    // --- โค้ดสำหรับยิง API ของจริง ---
    try {
        // อัปเดตให้รองรับ ?action=checkUser
        const response = await fetch(`${SCRIPT_URL}?action=checkUser&email=${email}`);
        const result = await response.json();
        
        return result;
    } catch (error) {
        console.error("Fetch API Error:", error);
        throw error;
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
