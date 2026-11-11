-- ==============================================================================
-- 🚀 BEC BA 69: AUTOMATIC SYSTEM STATS DATABASE TRIGGER
-- วัตถุประสงค์: ซิงค์ยอดเงินคงเหลือ สถิติการชำระเงิน และจำนวนสลิปอัตโนมัติในระดับ Server
-- แก้ปัญหา: Race Condition 100% (เซิร์ฟเวอร์เป็นคนคำนวณเอง ไม่มีการเขียนทับจาก Client)
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางในเมนู SQL Editor บน Supabase แล้วกดปุ่ม Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ฟังก์ชันคำนวณและอัปเดตสถิติภาพรวม (Ground Truth Calculation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_system_stats()
RETURNS void AS $$
DECLARE
    v_paid_count INTEGER;
    v_pending_count INTEGER;
    v_events_count INTEGER;
    v_total_paid NUMERIC;
    v_total_income NUMERIC;
    v_total_expense NUMERIC;
    v_total_balance NUMERIC;
BEGIN
    -- คำนวณจำนวนรายการชำระแล้ว และยอดรวมเงินที่จ่ายเข้ามาจริง
    SELECT 
        COUNT(*),
        COALESCE(SUM(paid_amount), 0)
    INTO 
        v_paid_count,
        v_total_paid
    FROM public.payments
    WHERE status = 'Paid';

    -- คำนวณจำนวนสลิปที่รอการตรวจสอบ
    SELECT COUNT(*)
    INTO v_pending_count
    FROM public.payments
    WHERE status = 'Pending';

    -- คำนวณจำนวนรอบเก็บเงินทั้งหมด
    SELECT COUNT(*)
    INTO v_events_count
    FROM public.events;

    -- คำนวณยอดเงินรายรับทั้งหมด
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_income
    FROM public.incomes;

    -- คำนวณยอดเงินรายจ่ายทั้งหมด
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expense
    FROM public.expenses;

    -- คำนวณยอดเงินคงเหลือสุทธิ
    v_total_balance := v_total_paid + v_total_income - v_total_expense;

    -- บันทึกข้อมูลลงตาราง system_stats แถว 'overview'
    INSERT INTO public.system_stats (
        id,
        events_count,
        paid_count,
        pending_count,
        total_paid_payments,
        total_income,
        total_expense,
        total_balance,
        updated_at
    ) VALUES (
        'overview',
        v_events_count,
        v_paid_count,
        v_pending_count,
        v_total_paid,
        v_total_income,
        v_total_expense,
        v_total_balance,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        events_count        = EXCLUDED.events_count,
        paid_count          = EXCLUDED.paid_count,
        pending_count       = EXCLUDED.pending_count,
        total_paid_payments = EXCLUDED.total_paid_payments,
        total_income        = EXCLUDED.total_income,
        total_expense       = EXCLUDED.total_expense,
        total_balance       = EXCLUDED.total_balance,
        updated_at          = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. ฟังก์ชัน Trigger Adapter
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_sync_system_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.sync_system_stats();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. ติดตั้ง Trigger ให้กับทุกตารางที่เกี่ยวข้อง (Payments, Events, Incomes, Expenses)
-- ------------------------------------------------------------------------------

-- ตาราง Payments: ยิง Trigger เมื่อมีการส่งสลิปใหม่ / อนุมัติสลิป / ลบสลิป
DROP TRIGGER IF EXISTS trg_payments_sync_stats ON public.payments;
CREATE TRIGGER trg_payments_sync_stats
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_sync_system_stats();

-- ตาราง Events: ยิง Trigger เมื่อมีการสร้างรอบเก็บเงิน / ลบรอบ
DROP TRIGGER IF EXISTS trg_events_sync_stats ON public.events;
CREATE TRIGGER trg_events_sync_stats
AFTER INSERT OR UPDATE OR DELETE ON public.events
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_sync_system_stats();

-- ตาราง Incomes: ยิง Trigger เมื่อมีการบันทึกรายรับ / ลบรายรับ
DROP TRIGGER IF EXISTS trg_incomes_sync_stats ON public.incomes;
CREATE TRIGGER trg_incomes_sync_stats
AFTER INSERT OR UPDATE OR DELETE ON public.incomes
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_sync_system_stats();

-- ตาราง Expenses: ยิง Trigger เมื่อมีการบันทึกรายจ่าย / ลบรายจ่าย
DROP TRIGGER IF EXISTS trg_expenses_sync_stats ON public.expenses;
CREATE TRIGGER trg_expenses_sync_stats
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_sync_system_stats();

-- ------------------------------------------------------------------------------
-- 4. ยกระดับความปลอดภัย (RLS) ตาราง system_stats
-- ------------------------------------------------------------------------------
-- ลบ policy ที่เคยอนุญาตให้ผู้ใช้ทั่วไปส่งค่ามาอัปเดตสถิติเอง
DROP POLICY IF EXISTS "system_stats_update" ON public.system_stats;

-- อนุญาตให้เฉพาะ Admin เท่านั้นที่สามารถแก้ไข system_stats ได้โดยตรง (ผู้ใช้ทั่วไปอ่านได้อย่างเดียว)
DROP POLICY IF EXISTS "system_stats_read" ON public.system_stats;
CREATE POLICY "system_stats_read" ON public.system_stats
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_stats_admin_all" ON public.system_stats;
CREATE POLICY "system_stats_admin_all" ON public.system_stats
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. สั่งคำนวณและรีเฟรชข้อมูลปัจจุบันทันที
-- ------------------------------------------------------------------------------
SELECT public.sync_system_stats();
