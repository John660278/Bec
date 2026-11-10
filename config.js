// Supabase Config (BEC BA 69 Production Database)
window.SUPABASE_URL = 'https://akubccovjhaiuzludggt.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk';
window.myAppDb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// ─── MAINTENANCE MODE CONFIG ───
// ตั้งค่า enabled: true เพื่อปิดปรับปรุงระบบ, false เพื่อเปิดใช้งานปกติ
window.MAINTENANCE_CONFIG = {
    enabled: true,
    title: 'ปิดปรับปรุงชั่วคราว',
    subtitle: 'ระบบกำลังดำเนินการปรับปรุงระบบความปลอดภัย',
    reopenDate: 'วันที่ 11 พ.ย.',
    reopenTime: '11:11 น.'
};
