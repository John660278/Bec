-- ==============================================================================
-- 🚀 ปลดล็อกฐานข้อมูลเซิร์ฟจริง (akubccovjhaiuzludggt)
-- รันโค้ดชุดนี้ใน Supabase SQL Editor ของโปรเจกต์จริง (akubccovjhaiuzludggt)
-- ==============================================================================

-- 1. ปลดล็อก RLS ทุกตาราง เพื่อให้หน้าเว็บอ่านข้อมูลยอดเงินจริงและรอบค้างชำระได้ทันที
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_matrix DISABLE ROW LEVEL SECURITY;

-- 2. เพิ่มคอลัมน์ระบบธีม และคอลัมน์สถิติแบบ IF NOT EXISTS (ปลอดภัย 100% ไม่ลบข้อมูล)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'black';
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_income NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_expense NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_paid_payments NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS pending_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS unpaid_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS paid_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS events_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. แสดงผลตรวจสอบยอดและข้อมูลทั้งหมด
SELECT 'system_stats' AS table_name, count(*) AS count FROM public.system_stats
UNION ALL
SELECT 'users', count(*) FROM public.users
UNION ALL
SELECT 'events', count(*) FROM public.events
UNION ALL
SELECT 'payments', count(*) FROM public.payments
UNION ALL
SELECT 'expenses', count(*) FROM public.expenses
UNION ALL
SELECT 'incomes', count(*) FROM public.incomes;
