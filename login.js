// รอให้โหลด DOM เสร็จแล้วค่อยผูก Event
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('firebaseGoogleLoginBtn');
    if(loginBtn) {
        loginBtn.addEventListener('click', handleFirebaseLogin);
    }
});

async function handleFirebaseLogin() {
    const loadingHint = document.getElementById('loadingHint');
    if (loadingHint) loadingHint.style.display = 'flex';
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // บังคับให้ผู้ใช้เลือกบัญชีใหม่ทุกครั้ง (แก้ปัญหาคนอื่นล็อกอินค้างไว้)
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        console.log("ล็อกอินด้วย Email:", user.email);

        // นำ Email ไปเช็คกับระบบเดิม (Google Sheets) ว่าเป็น Admin หรือ Student
        const sheetData = await verifyEmailWithFirebase(user.email);

        if (sheetData && sheetData.success) {
            sessionStorage.setItem('loggedInUser', JSON.stringify({
                email: user.email,
                name: user.displayName,
                picture: user.photoURL,
                role: sheetData.user.role,
                studentId: sheetData.user.studentId
            }));

            // พาไปยังหน้า Dashboard
            if (sheetData.user.role === 'Admin') { 
                window.location.href = 'admin_dashboard.html';
            } else {
                window.location.href = 'student_dashboard.html';
            }
        } else {
            // ถ้าไม่เจอใน Sheet ให้ล็อคเอาท์ออกจาก Firebase ด้วย
            await firebase.auth().signOut();
            showError(`Error: ไม่พบ Email (${user.email}) ในระบบ`);
            if (loadingHint) loadingHint.style.display = 'none';
        }
    } catch (error) {
        console.error("Firebase Login Error:", error);
        showError("เกิดข้อผิดพลาดในการล็อกอิน: " + error.message);
        if (loadingHint) loadingHint.style.display = 'none';
    }
}

/**
 * ฟังก์ชันตรวจสอบ User จาก Firestore
 */
async function verifyEmailWithFirebase(email) {
  try {
    // ดึงข้อมูล User จาก Firebase แทน Google Sheet
    const userDoc = await db.collection('users').where('email', '==', email).limit(1).get();
    
    if (!userDoc.empty) {
      const data = userDoc.docs[0].data();
      return { success: true, user: data };
    } else {
      return { success: false, message: 'ไม่มีอีเมลนี้ในระบบ' };
    }
  } catch (error) {
    console.error("Error checking user:", error);
    return { success: false, message: error.message };
  }
}

/**
 * ฟังก์ชันสำหรับแสดงข้อความ Error
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
