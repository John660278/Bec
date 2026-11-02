// ==============================================================
// 🌐 DUAL ENVIRONMENT CONFIGURATION (STAGING & PRODUCTION)
// ==============================================================

// 1. ตรวจจับสภาพแวดล้อมอัตโนมัติจาก URL
// ถ้าเปิดจาก localhost, file://, หรือลิงก์กิ่งเทส (มีคำว่า test) จะสลับเป็น Test Environment
const isTestEnv = window.location.protocol === 'file:' ||
                  window.location.hostname.includes('test') || 
                  window.location.hostname.includes('localhost') || 
                  window.location.hostname.includes('127.0.0.1');

// 2. ฐานข้อมูล Production (ข้อมูลจริงของเพื่อนๆ)
const PROD_CONFIG = {
  url: 'https://akubccovjhaiuzludggt.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk'
};

// 3. ฐานข้อมูล Staging / Test (สำหรับทดสอบระบบหลังบ้าน ปลอดภัย 100%)
const TEST_CONFIG = {
  url: 'https://rhjoigavmevgqtfmoygs.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoam9pZ2F2bWV2Z3F0Zm1veWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzY4MzQsImV4cCI6MjEwOTE1MjgzNH0.MAiPSTj2Iac4J9dhAh3UE-3t_yqhu0qRFL1vbgDx9Ao'
};

// เลือก Config อัตโนมัติ (ถ้าอยู่บนโดเมน test หรือ localhost ให้ใช้ตัวเทส)
const activeConfig = isTestEnv ? TEST_CONFIG : PROD_CONFIG;

window.IS_TEST_ENV = isTestEnv;
window.SUPABASE_URL = activeConfig.url;
window.SUPABASE_KEY = activeConfig.key;
window.myAppDb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

if (isTestEnv) {
  console.log("%c🧪 [ENVIRONMENT] RUNNING IN TEST / STAGING MODE", "background: #f59e0b; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
}

