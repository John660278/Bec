-- ==============================================================================
-- 🚀 BEC BA 69: คำสั่งอัปเกรดฐานข้อมูลสำหรับเซิร์ฟเวอร์หลัก (rhjoigavmevgqtfmoygs)
-- นำโค้ดนี้ไปวางและกด Run ใน Supabase SQL Editor ได้ทันที (ปลอดภัย 100% ไม่ลบข้อมูลเดิม)
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ theme สำหรับบันทึกธีมประจำตัวที่นิสิตเลือก
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'black';

-- 2. เพิ่มคอลัมน์สถิติภาพรวมในตาราง system_stats
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_income NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_expense NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_paid_payments NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS pending_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS unpaid_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS paid_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS events_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. ซิงค์ยอดนับสถานะจริงจากตาราง payments และ events เข้าสู่ system_stats
UPDATE public.system_stats
SET 
  paid_count = (SELECT count(*) FROM public.payments WHERE status = 'Paid'),
  pending_count = (SELECT count(*) FROM public.payments WHERE status = 'Pending'),
  unpaid_count = (SELECT count(*) FROM public.payments WHERE status = 'Unpaid'),
  events_count = (SELECT count(*) FROM public.events)
WHERE id = 'overview';
