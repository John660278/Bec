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

        if (sheetData && sheetData.isFound) {
            sessionStorage.setItem('loggedInUser', JSON.stringify({
                email: userEmail,
                name: userName,
                picture: userPicture,
                ...sheetData.extraData 
            }));

            window.location.href = 'dashboard.html';
        } else {
            showError(`Error: ไม่พบ Email (${userEmail}) ในระบบ กรุณาติดต่อผู้ดูแลระบบ`);
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
    // 🔴 งานของคุณ: นำ URL ของ Web App ที่ได้จาก Google Apps Script มาวางตรงนี้
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUUKEYNzF0tcylkI1Xo6h8n5BFcdZzqSB4OxwnLZeKKSvhamgOCifc7mj5W7GhN9jb4A/exec"; 
    // =================================================================

    // ถ้ายังไม่ได้ใส่ URL ขอให้ใช้ Mock เดิมไปก่อนเพื่อป้องกันเว็บพัง
    if (SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
        console.warn("⚠️ ยังไม่ได้ใส่ URL ของ Google Apps Script ระบบกำลังใช้ข้อมูลจำลอง");
        return new Promise((resolve) => {
            setTimeout(() => {
                const allowedEmails = ['admin@example.com', 'test@example.com'];
                if (allowedEmails.includes(email) || email.endsWith('@gmail.com')) {
                    resolve({ isFound: true, extraData: { role: 'User' } });
                } else {
                    resolve({ isFound: false });
                }
            }, 800);
        });
    }

    // --- โค้ดสำหรับยิง API ของจริง ---
    try {
        const response = await fetch(`${SCRIPT_URL}?email=${email}`);
        const result = await response.json();
        
        // result จาก Google Apps Script จะหน้าตาเหมือนกับ { isFound: true, extraData: {...} }
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
