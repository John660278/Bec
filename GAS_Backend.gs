/**
 * Student Branch Automated Financial System - Backend API
 * 
 * วิธีติดตั้ง:
 * 1. นำโค้ดนี้ไปวางใน Google Apps Script
 * 2. กรอก SPREADSHEET_ID และ FOLDER_ID ของคุณ
 * 3. เลือกฟังก์ชัน `setupDatabase` แล้วกด "Run" เพื่อสร้างตารางอัตโนมัติ
 * 4. กด Deploy -> New Deployment -> Type: Web App -> Execute as: Me -> Who has access: Anyone
 */

const SPREADSHEET_ID = '144X6SSyt7IqxQ3EZlJ2N7jfSs7jjd_6Cc8GP5hBbGXg'; // เปลี่ยนเป็น ID ของ Google Sheets
const FOLDER_ID = '1W_38Yt9YCe5ZQfUZQv46FHbT1AzrT-ii'; // เปลี่ยนเป็น ID ของ Folder ใน Google Drive (สำหรับเก็บสลิป)

// ==========================================
// 1. DATABASE SETUP
// ==========================================
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const schema = {
    'Users': ['Email', 'Student_ID', 'Name', 'Role'],
    'Payment_Events': ['Event_ID', 'Title', 'Base_Amount', 'Due_Date', 'Created_At'],
    'User_Payments': ['Payment_ID', 'Event_ID', 'User_Email', 'Paid_Amount', 'Penalty_Fee', 'Status', 'Slip_Url', 'Paid_At'],
    'Expenses': ['Expense_ID', 'Title', 'Amount', 'Date', 'Receipt_Url', 'Added_By'],
    'Incomes': ['Income_ID', 'Source', 'Amount', 'Date', 'Added_By'],
    'Student_Matrix': ['Student_ID', 'Name', 'Email']
  };

  for (const [sheetName, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // Set headers if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  }
}

// ==========================================
// 2. HTTP ENDPOINTS (doGet / doPost)
// ==========================================

// จัดการ GET Requests
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'checkUser') {
      return respond(checkUser(e.parameter.email));
    }
    if (action === 'getStudentPayments') {
      return respond(getStudentPayments(e.parameter.email));
    }
    if (action === 'getAdminDashboard') {
      return respond(getAdminDashboard());
    }
    
    return respond({ success: false, message: 'Invalid action' });
  } catch (error) {
    return respond({ success: false, message: error.message });
  }
}

// จัดการ POST Requests (ใช้สำหรับ Upload รูป หรือส่งข้อมูลซับซ้อน)
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return respond({ success: false, message: 'Invalid JSON data' });
  }

  const action = data.action;

  try {
    if (action === 'createEvent') {
      return respond(createEvent(data.payload));
    }
    if (action === 'uploadSlip') {
      return respond(uploadSlip(data.payload));
    }
    if (action === 'approvePayment') {
      return respond(approvePayment(data.payload));
    }
    
    return respond({ success: false, message: 'Invalid action' });
  } catch (error) {
    return respond({ success: false, message: error.message });
  }
}

// Helper ส่งข้อมูลกลับเป็น JSON + CORS
function respond(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. BUSINESS LOGIC FUNCTIONS
// ==========================================

// 3.1 ตรวจสอบผู้ใช้และ Role
function checkUser(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return { 
        success: true, 
        user: { email: data[i][0], studentId: data[i][1], name: data[i][2], role: data[i][3] } 
      };
    }
  }
  return { success: false, message: 'User not found' };
}

// 3.2 สร้างรอบเก็บเงินใหม่ + Auto Matrix Injector
function createEvent(payload) {
  const { title, baseAmount, dueDate } = payload;
  const eventId = 'EVT_' + new Date().getTime();
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // บันทึกลง Payment_Events
  const eventsSheet = ss.getSheetByName('Payment_Events');
  eventsSheet.appendRow([eventId, title, baseAmount, dueDate, new Date()]);
  
  // Auto Matrix Injector: แทรกคอลัมน์ใหม่ใน Student_Matrix
  const matrixSheet = ss.getSheetByName('Student_Matrix');
  const lastCol = matrixSheet.getLastColumn();
  matrixSheet.getRange(1, lastCol + 1).setValue(title); // ตั้งชื่อคอลัมน์ใหม่ด้วย Title ของ Event
  
  return { success: true, eventId: eventId };
}

// 3.3 อัปโหลดสลิป
function uploadSlip(payload) {
  const { eventId, email, studentId, base64Image, amount, penalty } = payload;
  
  // แปลง Base64 เป็น File
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const contentType = base64Image.substring(5, base64Image.indexOf(';'));
  const base64Data = base64Image.split(',')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `${studentId}_${eventId}.jpg`);
  const file = folder.createFile(blob);
  
  // ตั้งค่าให้รูปดูได้ Public
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = file.getUrl();
  
  // บันทึกลง User_Payments
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const paymentsSheet = ss.getSheetByName('User_Payments');
  const paymentId = 'PAY_' + new Date().getTime();
  
  paymentsSheet.appendRow([
    paymentId, eventId, email, amount, penalty, 'Pending', fileUrl, new Date()
  ]);
  
  return { success: true, paymentId: paymentId, slipUrl: fileUrl };
}

// 3.4 ดึงข้อมูลการชำระเงินของนิสิต (รวมคำนวณค่าปรับ)
function getStudentPayments(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const eventsData = ss.getSheetByName('Payment_Events').getDataRange().getValues();
  const paymentsData = ss.getSheetByName('User_Payments').getDataRange().getValues();
  
  // หา Payments ของคนนี้
  const userPayments = {};
  for (let i = 1; i < paymentsData.length; i++) {
    if (paymentsData[i][2] === email) {
      userPayments[paymentsData[i][1]] = { // key = eventId
        status: paymentsData[i][5],
        slipUrl: paymentsData[i][6]
      };
    }
  }
  
  const pendingEvents = [];
  const currentDate = new Date();
  
  // เช็คแต่ละ Event
  for (let i = 1; i < eventsData.length; i++) {
    const eventId = eventsData[i][0];
    const title = eventsData[i][1];
    const baseAmount = Number(eventsData[i][2]);
    const dueDate = new Date(eventsData[i][3]);
    
    let status = 'Unpaid';
    if (userPayments[eventId]) {
      status = userPayments[eventId].status;
    }
    
    // คำนวณค่าปรับเลท (1 บาท ต่อ 7 วัน)
    let penalty = 0;
    if (status === 'Unpaid' && currentDate > dueDate) {
      const diffTime = Math.abs(currentDate - dueDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      penalty = Math.floor(diffDays / 7) * 1; 
    }
    
    pendingEvents.push({
      eventId,
      title,
      baseAmount,
      dueDate: dueDate.toISOString(),
      status,
      penalty,
      totalAmount: baseAmount + penalty
    });
  }
  
  return { success: true, events: pendingEvents };
}

// 3.5 อนุมัติสลิปและอัปเดต Matrix
function approvePayment(payload) {
  const { paymentId, eventTitle, email, totalAmount } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. อัปเดตสถานะใน User_Payments
  const paymentsSheet = ss.getSheetByName('User_Payments');
  const pData = paymentsSheet.getDataRange().getValues();
  for (let i = 1; i < pData.length; i++) {
    if (pData[i][0] === paymentId) {
      paymentsSheet.getRange(i + 1, 6).setValue('Paid');
      break;
    }
  }
  
  // 2. อัปเดตยอดเงินใน Student_Matrix
  const matrixSheet = ss.getSheetByName('Student_Matrix');
  const mData = matrixSheet.getDataRange().getValues();
  const headers = mData[0];
  
  // หาคอลัมน์ของ Event
  let eventColIndex = headers.indexOf(eventTitle);
  if (eventColIndex !== -1) {
    // หาแถวของ Email
    for (let i = 1; i < mData.length; i++) {
      if (mData[i][2] === email) { // คอลัมน์ที่ 3 (index 2) คือ Email
        matrixSheet.getRange(i + 1, eventColIndex + 1).setValue(totalAmount);
        break;
      }
    }
  }
  
  return { success: true };
}
