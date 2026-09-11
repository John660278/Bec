// รอให้โหลด DOM เสร็จแล้วค่อยผูก Event
document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('firebaseGoogleLoginBtn');
    if(loginBtn) {
        loginBtn.addEventListener('click', handleFirebaseLogin);
    }

    // ตรวจสอบผลการล็อกอินกรณีที่เบราว์เซอร์เด้งกลับมาจาก Redirect
    try {
        const result = await firebase.auth().getRedirectResult();
        if (result && result.user) {
            const loadingHint = document.getElementById('loadingHint');
            if (loadingHint) loadingHint.style.display = 'flex';
            await processLoginUser(result.user);
        }
    } catch (err) {
        console.error("Redirect login error:", err);
        showError("เข้าสู่ระบบไม่สำเร็จ: " + (err.message || 'โปรดลองใหม่อีกครั้ง'));
    }
});

async function handleFirebaseLogin() {
    const loadingHint = document.getElementById('loadingHint');
    if (loadingHint) loadingHint.style.display = 'flex';
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    try {
        console.log("กำลังเปิด Popup Login...");
        
        // Timeout สำหรับหน้าต่าง Popup กรณี Safari บล็อกแล้วค้าง
        const popupPromise = firebase.auth().signInWithPopup(provider);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("POPUP_TIMEOUT")), 15000)
        );

        const result = await Promise.race([popupPromise, timeoutPromise]);
        
        console.log("ได้ข้อมูลผู้ใช้จาก Google แล้ว กำลังเช็คฐานข้อมูล...");
        await processLoginUser(result.user);
    } catch (error) {
        console.warn("Firebase Login Error:", error);

        if (error.message === "POPUP_TIMEOUT") {
            showError("ระบบล็อกอินค้าง (Safari อาจบล็อก Popup) กำลังเปลี่ยนหน้าต่าง...");
            await firebase.auth().signInWithRedirect(provider);
            return;
        }

        // กรณีที่เบราว์เซอร์บล็อก Popup ให้สลับไปใช้ Redirect โดยอัตโนมัติ
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            try {
                showError("กำลังเปลี่ยนหน้าไปยังระบบล็อกอินของ Google...");
                await firebase.auth().signInWithRedirect(provider);
                return;
            } catch (redirErr) {
                console.error("Redirect fallback error:", redirErr);
            }
        }

        if (error.code === 'auth/popup-closed-by-user') {
            showError("คุณได้ปิดหน้าต่างล็อกอินก่อนทำรายการเสร็จสิ้น");
        } else {
            showError("เกิดข้อผิดพลาดในการล็อกอิน: " + error.message);
        }
        if (loadingHint) loadingHint.style.display = 'none';
    }
}

async function processLoginUser(user) {
    const loadingHint = document.getElementById('loadingHint');
    console.log("ล็อกอินด้วย Email:", user.email);

    // Timeout กันกรณี Firestore ค้าง
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("หมดเวลาเชื่อมต่อฐานข้อมูล (เน็ตช้าหรือโควต้าเต็ม)")), 10000));
    
    try {
        const sheetData = await Promise.race([
            verifyEmailWithFirebase(user.email),
            timeoutPromise
        ]);

        if (sheetData && sheetData.success) {
            sessionStorage.setItem('loggedInUser', JSON.stringify({
                email: user.email,
                name: user.displayName,
                picture: user.photoURL,
                role: sheetData.user.role,
                studentId: sheetData.user.studentId
            }));

            if (sheetData.user.role === 'Admin') { 
                window.location.href = 'admin_dashboard.html';
            } else {
                window.location.href = 'student_dashboard.html';
            }
        } else {
            await firebase.auth().signOut();
            showError(`Error: ไม่พบ Email (${user.email}) ในระบบ`);
            if (loadingHint) loadingHint.style.display = 'none';
        }
    } catch (err) {
        console.error("Firestore Timeout Error:", err);
        showError("เกิดข้อผิดพลาด: " + err.message);
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
