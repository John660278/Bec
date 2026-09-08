const SPREADSHEET_ID = '144X6SSyt7IqxQ3EZlJ2N7jfSs7jjd_6Cc8GP5hBbGXg'; // ID ของ Google Sheets
const FOLDER_ID = '1W_38Yt9YCe5ZQfUZQv46FHbT1AzrT-ii'; // ID ของ Folder ใน Google Drive

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
    'Incomes': ['Income_ID', 'Source', 'Amount', 'Date', 'Receipt_Url', 'Added_By'],
    'Student_Matrix': ['Student_ID', 'Name', 'Email']
  };

  for (const [sheetName, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  }
}

// ==========================================
// 2. HTTP ENDPOINTS (doGet / doPost)
// ==========================================

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'checkUser') return respond(checkUser(e.parameter.email));
    if (action === 'getStudentPayments') return respond(getStudentPayments(e.parameter.email));
    if (action === 'getEvents') return respond(getEvents());
    if (action === 'getAllPayments') return respond(getAllPayments());
    if (action === 'getPublicDashboard') return respond(getPublicDashboard());
    return respond({ success: false, message: 'Invalid action' });
  } catch (error) {
    return respond({ success: false, message: error.message });
  }
}

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (error) { return respond({ success: false, message: 'Invalid JSON data' }); }
  const action = data.action;
  try {
    if (action === 'createEvent') return respond(createEvent(data.payload));
    if (action === 'uploadSlip') return respond(uploadSlip(data.payload));
    if (action === 'approvePayment') return respond(approvePayment(data.payload));
    if (action === 'addExpense') return respond(addExpense(data.payload));
    if (action === 'addIncome') return respond(addIncome(data.payload));
    return respond({ success: false, message: 'Invalid action' });
  } catch (error) {
    return respond({ success: false, message: error.message });
  }
}

function respond(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. BUSINESS LOGIC FUNCTIONS
// ==========================================

function checkUser(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = ss.getSheetByName('Users').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return { success: true, user: { email: data[i][0], studentId: data[i][1], name: data[i][2], role: data[i][3] } };
    }
  }
  return { success: false, message: 'User not found' };
}

function getEvents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = ss.getSheetByName('Payment_Events').getDataRange().getValues();
  const events = [];
  for (let i = 1; i < data.length; i++) {
    events.push({ eventId: data[i][0], title: data[i][1], baseAmount: data[i][2], dueDate: data[i][3], createdAt: data[i][4] });
  }
  return { success: true, events: events.reverse() };
}

function getAllPayments() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const pData = ss.getSheetByName('User_Payments').getDataRange().getValues();
  const eData = ss.getSheetByName('Payment_Events').getDataRange().getValues();

  // Build email → name lookup from Users sheet
  const usersData = ss.getSheetByName('Users').getDataRange().getValues();
  const emailToName = {};
  for (let i = 1; i < usersData.length; i++) {
    emailToName[usersData[i][0]] = usersData[i][2];
  }

  // Build eventId → title lookup
  const eventMap = {};
  for (let i = 1; i < eData.length; i++) {
    eventMap[eData[i][0]] = eData[i][1];
  }

  const payments = [];
  for (let i = 1; i < pData.length; i++) {
    payments.push({
      paymentId: pData[i][0],
      eventId:   pData[i][1],
      eventTitle: eventMap[pData[i][1]] || pData[i][1],
      email:      pData[i][2],
      name:       emailToName[pData[i][2]] || '-',
      paidAmount: pData[i][3],
      penalty:    pData[i][4],
      status:     pData[i][5],
      slipUrl:    pData[i][6],
      paidAt:     pData[i][7]
    });
  }
  return { success: true, payments: payments.reverse() };
}

function createEvent(payload) {
  const { title, baseAmount, dueDate } = payload;
  const eventId = 'EVT_' + new Date().getTime();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  ss.getSheetByName('Payment_Events').appendRow([eventId, title, baseAmount, dueDate, new Date()]);
  
  const matrixSheet = ss.getSheetByName('Student_Matrix');
  const lastCol = matrixSheet.getLastColumn();
  matrixSheet.getRange(1, lastCol + 1).setValue(title); 
  
  return { success: true, eventId: eventId };
}

function uploadSlip(payload) {
  const { eventId, email, studentId, base64Image, amount, penalty } = payload;
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const contentType = base64Image.substring(5, base64Image.indexOf(';'));
  const base64Data = base64Image.split(',')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `${studentId}_${eventId}.jpg`);
  const file = folder.createFile(blob);
  
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = file.getUrl();
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const paymentId = 'PAY_' + new Date().getTime();
  ss.getSheetByName('User_Payments').appendRow([paymentId, eventId, email, amount, penalty, 'Pending', fileUrl, new Date()]);
  
  return { success: true, paymentId: paymentId, slipUrl: fileUrl };
}

function getStudentPayments(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const eventsData = ss.getSheetByName('Payment_Events').getDataRange().getValues();
  const paymentsData = ss.getSheetByName('User_Payments').getDataRange().getValues();
  
  const userPayments = {};
  for (let i = 1; i < paymentsData.length; i++) {
    if (paymentsData[i][2] === email) {
      userPayments[paymentsData[i][1]] = { status: paymentsData[i][5], slipUrl: paymentsData[i][6] };
    }
  }
  
  const pendingEvents = [];
  const currentDate = new Date();
  for (let i = 1; i < eventsData.length; i++) {
    const eventId = eventsData[i][0];
    const title = eventsData[i][1];
    const baseAmount = Number(eventsData[i][2]);
    const dueDate = new Date(eventsData[i][3]);
    
    let status = 'Unpaid';
    if (userPayments[eventId]) { status = userPayments[eventId].status; }
    
    let penalty = 0;
    if (status === 'Unpaid' && currentDate > dueDate) {
      const diffDays = Math.floor(Math.abs(currentDate - dueDate) / (1000 * 60 * 60 * 24));
      penalty = Math.floor(diffDays / 7) * 1; 
    }
    
    pendingEvents.push({ eventId, title, baseAmount, dueDate: dueDate.toISOString(), status, penalty, totalAmount: baseAmount + penalty });
  }
  return { success: true, events: pendingEvents.reverse() };
}

function approvePayment(payload) {
  const { paymentId, eventTitle, email, totalAmount } = payload;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const paymentsSheet = ss.getSheetByName('User_Payments');
  const pData = paymentsSheet.getDataRange().getValues();
  for (let i = 1; i < pData.length; i++) {
    if (pData[i][0] === paymentId) {
      paymentsSheet.getRange(i + 1, 6).setValue('Paid');
      break;
    }
  }
  
  const matrixSheet = ss.getSheetByName('Student_Matrix');
  const mData = matrixSheet.getDataRange().getValues();
  const headers = mData[0];
  let eventColIndex = headers.indexOf(eventTitle);
  if (eventColIndex !== -1) {
    for (let i = 1; i < mData.length; i++) {
      if (mData[i][2] === email) { 
        matrixSheet.getRange(i + 1, eventColIndex + 1).setValue(totalAmount);
        break;
      }
    }
  }
  return { success: true };
}

function uploadFinanceImage(base64Image, prefix) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const contentType = base64Image.substring(5, base64Image.indexOf(';'));
  const base64Data = base64Image.split(',')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `${prefix}_${new Date().getTime()}.jpg`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function addExpense(payload) {
  const { title, amount, date, base64Image } = payload;
  let receiptUrl = '';
  if (base64Image) {
    receiptUrl = uploadFinanceImage(base64Image, 'EXP');
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const expenseId = 'EXP_' + new Date().getTime();
  ss.getSheetByName('Expenses').appendRow([expenseId, title, amount, date, receiptUrl, 'Admin']);
  return { success: true };
}

function addIncome(payload) {
  const { source, amount, date, base64Image } = payload;
  let receiptUrl = '';
  if (base64Image) {
    receiptUrl = uploadFinanceImage(base64Image, 'INC');
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const incomeId = 'INC_' + new Date().getTime();
  ss.getSheetByName('Incomes').appendRow([incomeId, source, amount, date, receiptUrl, 'Admin']);
  return { success: true };
}

// ----------------------------------------------------
// NEW: PUBLIC DASHBOARD ENDPOINT (For Student Transparency)
// ----------------------------------------------------
function getPublicDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Calculate Incomes
  const incomesData = ss.getSheetByName('Incomes').getDataRange().getValues();
  let totalIncome = 0;
  const incomes = [];
  for (let i = 1; i < incomesData.length; i++) {
    totalIncome += Number(incomesData[i][2]) || 0;
    // index 4 is Receipt_Url now
    incomes.push({ source: incomesData[i][1], amount: incomesData[i][2], date: incomesData[i][3], receiptUrl: incomesData[i][4] });
  }

  // 2. Calculate Expenses
  const expData = ss.getSheetByName('Expenses').getDataRange().getValues();
  let totalExpense = 0;
  const expenses = [];
  for (let i = 1; i < expData.length; i++) {
    totalExpense += Number(expData[i][2]) || 0;
    expenses.push({ title: expData[i][1], amount: expData[i][2], date: expData[i][3], receiptUrl: expData[i][4] });
  }

  // 3. Calculate Paid Payments
  const payData = ss.getSheetByName('User_Payments').getDataRange().getValues();
  let totalPayments = 0;
  for (let i = 1; i < payData.length; i++) {
    if (payData[i][5] === 'Paid') { // Status is Paid
      totalPayments += Number(payData[i][3]) || 0;
    }
  }

  // Total Balance
  const totalBalance = (totalIncome + totalPayments) - totalExpense;

  // 4. Student Matrix (Public View)
  const matrixData = ss.getSheetByName('Student_Matrix').getDataRange().getValues();
  const matrixHeaders = matrixData[0];
  const matrixRows = [];
  for (let i = 1; i < matrixData.length; i++) {
    const rowObj = {};
    for (let j = 0; j < matrixHeaders.length; j++) {
      // Hide email for privacy, only show ID and Name and their payments
      if (matrixHeaders[j] !== 'Email') {
        rowObj[matrixHeaders[j]] = matrixData[i][j];
      }
    }
    matrixRows.push(rowObj);
  }

  return {
    success: true,
    totalBalance: totalBalance,
    totalIncome: totalIncome + totalPayments, // Total money in
    totalExpense: totalExpense,
    incomes: incomes.reverse(),
    expenses: expenses.reverse(),
    matrixHeaders: matrixHeaders.filter(h => h !== 'Email'),
    matrixRows: matrixRows
  };
}
