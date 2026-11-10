-- ==============================================================================
-- 🛡️ BEC BA 69: ROW LEVEL SECURITY (RLS) POLICIES (ระดับมืออาชีพ)
-- ==============================================================================
-- วิธีใช้งาน:
-- 1. เข้าไปที่ Supabase Dashboard (https://supabase.com)
-- 2. เลือกโปรเจกต์ BEC BA 69 (akubccovjhaiuzludggt)
-- 3. ไปที่เมนู "SQL Editor" ด้านซ้ายมือ
-- 4. กด "New query" วางโค้ดทั้งหมดนี้ลงไป แล้วกดปุ่ม "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ฟังก์ชันช่วยเหลือ: ตรวจสอบสถานะ Admin อัตโนมัติจากตาราง users
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE email = (auth.jwt() ->> 'email')
          AND role = 'Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. เปิดใช้งาน ROW LEVEL SECURITY (RLS) ให้กับทุกตาราง
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_matrix ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. ล้าง Policy เดิมออกทั้งหมด เพื่อป้องกัน Policy ทับซ้อนหรือขัดแย้งกัน
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public access for users" ON public.users;
DROP POLICY IF EXISTS "Public access for events" ON public.events;
DROP POLICY IF EXISTS "Public access for payments" ON public.payments;
DROP POLICY IF EXISTS "Public access for incomes" ON public.incomes;
DROP POLICY IF EXISTS "Public access for expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public access for system_stats" ON public.system_stats;
DROP POLICY IF EXISTS "Public access for student_matrix" ON public.student_matrix;

DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;

DROP POLICY IF EXISTS "events_read" ON public.events;
DROP POLICY IF EXISTS "events_admin_all" ON public.events;

DROP POLICY IF EXISTS "payments_read" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_student" ON public.payments;
DROP POLICY IF EXISTS "payments_update_student" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;

DROP POLICY IF EXISTS "incomes_read" ON public.incomes;
DROP POLICY IF EXISTS "incomes_admin_all" ON public.incomes;

DROP POLICY IF EXISTS "expenses_read" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_all" ON public.expenses;

DROP POLICY IF EXISTS "system_stats_read" ON public.system_stats;
DROP POLICY IF EXISTS "system_stats_admin_all" ON public.system_stats;
DROP POLICY IF EXISTS "system_stats_update" ON public.system_stats;

DROP POLICY IF EXISTS "student_matrix_read" ON public.student_matrix;
DROP POLICY IF EXISTS "student_matrix_admin_all" ON public.student_matrix;

-- ------------------------------------------------------------------------------
-- 4. กำหนดนโยบายความปลอดภัยทีละตาราง (Granular Policies)
-- ------------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────
-- ตาราง: EVENTS (รอบเรียกเก็บเงิน)
-- นิสิต: อ่านได้อย่างเดียวเพื่อดูว่ามีรอบอะไรบ้าง
-- แอดมิน: เพิ่ม/แก้ไข/ลบรอบได้คนเดียว
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "events_read" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "events_admin_all" ON public.events
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- ตาราง: INCOMES (รายรับกองทุน)
-- นิสิต: อ่านได้อย่างเดียว (เพื่อความโปร่งใสทางการเงิน)
-- แอดมิน: เพิ่ม/แก้ไข/ลบรายการรับได้
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "incomes_read" ON public.incomes
    FOR SELECT USING (true);

CREATE POLICY "incomes_admin_all" ON public.incomes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- ตาราง: EXPENSES (รายจ่ายกองทุน)
-- นิสิต: อ่านได้อย่างเดียว (เพื่อความโปร่งใสทางการเงิน)
-- แอดมิน: เพิ่ม/แก้ไข/ลบรายการจ่ายได้
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "expenses_read" ON public.expenses
    FOR SELECT USING (true);

CREATE POLICY "expenses_admin_all" ON public.expenses
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- ตาราง: STUDENT_MATRIX (ตารางภาพรวมสถานะทั้งรุ่น)
-- นิสิต: อ่านได้อย่างเดียว
-- แอดมิน: อัปเดตและประมวลผลตารางเมทริกซ์ได้
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "student_matrix_read" ON public.student_matrix
    FOR SELECT USING (true);

CREATE POLICY "student_matrix_admin_all" ON public.student_matrix
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- ตาราง: SYSTEM_STATS (ยอดรวมสถิติภาพรวม)
-- นิสิต: อ่านได้ และอัปเดต pendingCount ได้ตอนส่งสลิป
-- แอดมิน: จัดการได้ทั้งหมด
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "system_stats_read" ON public.system_stats
    FOR SELECT USING (true);

CREATE POLICY "system_stats_admin_all" ON public.system_stats
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "system_stats_update" ON public.system_stats
    FOR UPDATE TO authenticated
    USING (id = 'overview')
    WITH CHECK (id = 'overview');

-- ─────────────────────────────────────────────────────────────
-- ตาราง: USERS (รายชื่อนิสิตและบทบาท)
-- นิสิต: อ่านได้ (ใช้ตอนล็อกอิน) และแก้ไขธีมของตัวเองได้เท่านั้น (ห้ามเปลี่ยน role เป็น Admin)
-- แอดมิน: จัดการได้ทั้งหมด
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "users_read" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "users_admin_all" ON public.users
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "users_self_insert" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (
        email = (auth.jwt() ->> 'email')
        AND role = 'Student'
    );

CREATE POLICY "users_self_update" ON public.users
    FOR UPDATE TO authenticated
    USING (email = (auth.jwt() ->> 'email'))
    WITH CHECK (
        email = (auth.jwt() ->> 'email')
        AND role = 'Student'
    );

-- ─────────────────────────────────────────────────────────────
-- ตาราง: PAYMENTS (สลิปและการชำระเงิน) *** สำคัญที่สุด ***
-- นิสิต:
--   - อ่านได้ (ดูกระดานสาธารณะและสถานะของตนเอง)
--   - ส่งสลิปใหม่ได้ เฉพาะอีเมลตนเอง และสถานะต้องเป็น 'Pending' เท่านั้น
--   - ห้ามกดลบข้อมูลเด็ดขาด (ป้องกันการทำลายหลักฐาน)
--   - ห้ามแก้สถานะเป็น 'Paid' เองเด็ดขาด
-- แอดมิน:
--   - อนุมัติ (เปลี่ยนเป็น Paid), ปฏิเสธ, หรือลบรายการได้
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "payments_read" ON public.payments
    FOR SELECT USING (true);

CREATE POLICY "payments_admin_all" ON public.payments
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "payments_insert_student" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        student_email = (auth.jwt() ->> 'email')
        AND status = 'Pending'
    );

CREATE POLICY "payments_update_student" ON public.payments
    FOR UPDATE TO authenticated
    USING (
        student_email = (auth.jwt() ->> 'email')
        AND status = 'Pending'
    )
    WITH CHECK (
        student_email = (auth.jwt() ->> 'email')
        AND status = 'Pending'
    );

-- ------------------------------------------------------------------------------
-- 5. จัดการความปลอดภัย STORAGE: BUCKET 'slips'
-- ------------------------------------------------------------------------------
-- อนุญาตให้อ่านสลิปได้แบบสาธารณะ
-- อัปโหลดสลิปได้เฉพาะคนล็อกอิน
-- ลบสลิปได้เฉพาะแอดมินคนเดียวเท่านั้น!
DROP POLICY IF EXISTS "Public read slips" ON storage.objects;
DROP POLICY IF EXISTS "Public upload slips" ON storage.objects;
DROP POLICY IF EXISTS "Public update slips" ON storage.objects;
DROP POLICY IF EXISTS "Public delete slips" ON storage.objects;

CREATE POLICY "Public read slips" ON storage.objects
    FOR SELECT USING (bucket_id = 'slips');

CREATE POLICY "Authenticated upload slips" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'slips');

CREATE POLICY "Admin delete slips" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'slips' AND public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. ตรวจสอบสถานะ RLS ของทุกตาราง
-- ------------------------------------------------------------------------------
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'events', 'payments', 'incomes', 'expenses', 'system_stats', 'student_matrix');
