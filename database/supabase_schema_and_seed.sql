-- ==============================================================================
-- 🚀 BEC BA 69: SUPABASE PRODUCTION DATABASE INITIALIZATION & SCHEMA
-- ==============================================================================
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางในเมนู SQL Editor ใน Dashboard ของ Supabase แล้วกด RUN
-- ==============================================================================

-- 1. สร้างตาราง USERS (ข้อมูลนิสิตและผู้ดูแลระบบ + คอลัมน์ theme สำหรับบันทึกธีมที่เลือก)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Student',
    student_id TEXT DEFAULT '',
    theme TEXT DEFAULT 'black',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- อัปเกรดคอลัมน์ของ users อัตโนมัติ (กรณีตารางมีอยู่เดิม)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Student';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'black';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- รับประกันว่า email มี Unique Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
    ) THEN
        BEGIN
            ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- 2. สร้างตาราง EVENTS (รอบการเรียกเก็บเงินของสาขา)
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    base_amount NUMERIC NOT NULL DEFAULT 0,
    due_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS base_amount NUMERIC DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS due_date TEXT DEFAULT '';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. สร้างตาราง PAYMENTS (รายการชำระเงินและสลิปของนิสิต)
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    event_title TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_id TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    penalty NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    slip_url TEXT DEFAULT '',
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS event_id TEXT DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS event_title TEXT DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_email TEXT DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_id TEXT DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS penalty NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS slip_url TEXT DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. สร้างตาราง INCOMES (รายรับกองทุนสาขา)
CREATE TABLE IF NOT EXISTS public.incomes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    receipt_url TEXT DEFAULT '',
    timestamp TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '';
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS timestamp TEXT DEFAULT '';
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. สร้างตาราง EXPENSES (รายจ่ายกองทุนสาขา)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    receipt_url TEXT DEFAULT '',
    timestamp TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT '';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS timestamp TEXT DEFAULT '';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 6. สร้างตาราง SYSTEM_STATS (ยอดเงินสรุปกองทุนและสถิติภาพรวม)
CREATE TABLE IF NOT EXISTS public.system_stats (
    id TEXT PRIMARY KEY DEFAULT 'overview',
    total_income NUMERIC DEFAULT 0,
    total_expense NUMERIC DEFAULT 0,
    total_balance NUMERIC DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    unpaid_count INTEGER DEFAULT 0,
    paid_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- อัปเกรดคอลัมน์ของ system_stats อัตโนมัติ (กรณีตารางมีอยู่เดิมแต่ยังไม่มี unpaid_count หรือคอลัมน์อื่นๆ)
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_income NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_expense NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS total_paid_payments NUMERIC DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS pending_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS unpaid_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS paid_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS events_count INTEGER DEFAULT 0;
ALTER TABLE public.system_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. สร้างตาราง STUDENT_MATRIX (ตารางสรุปสถานะการชำระทุกรอบของนิสิตทุกคน)
CREATE TABLE IF NOT EXISTS public.student_matrix (
    id TEXT PRIMARY KEY DEFAULT 'current',
    matrix JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_matrix ADD COLUMN IF NOT EXISTS matrix JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_matrix ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 🔐 ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_matrix ENABLE ROW LEVEL SECURITY;

-- ลบนโยบายเดิมหากมี เพื่อป้องกันนโยบายซ้ำซ้อน
DROP POLICY IF EXISTS "Public access for users" ON public.users;
DROP POLICY IF EXISTS "Public access for events" ON public.events;
DROP POLICY IF EXISTS "Public access for payments" ON public.payments;
DROP POLICY IF EXISTS "Public access for incomes" ON public.incomes;
DROP POLICY IF EXISTS "Public access for expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public access for system_stats" ON public.system_stats;
DROP POLICY IF EXISTS "Public access for student_matrix" ON public.student_matrix;

-- อนุญาตให้เว็บแอป (ทั้ง anon และ authenticated) อ่านและเขียนข้อมูลได้
CREATE POLICY "Public access for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for incomes" ON public.incomes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for system_stats" ON public.system_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for student_matrix" ON public.student_matrix FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 📦 STORAGE BUCKET: slips (สำหรับเก็บภาพสลิปและใบเสร็จ)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- นโยบาย Storage ให้ทุกคนดูสลิปและอัปโหลดได้
DROP POLICY IF EXISTS "Public read slips" ON storage.objects;
DROP POLICY IF EXISTS "Public upload slips" ON storage.objects;
DROP POLICY IF EXISTS "Public update slips" ON storage.objects;
DROP POLICY IF EXISTS "Public delete slips" ON storage.objects;

CREATE POLICY "Public read slips" ON storage.objects FOR SELECT USING (bucket_id = 'slips');
CREATE POLICY "Public upload slips" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'slips');
CREATE POLICY "Public update slips" ON storage.objects FOR UPDATE USING (bucket_id = 'slips');
CREATE POLICY "Public delete slips" ON storage.objects FOR DELETE USING (bucket_id = 'slips');

-- ==============================================================================
-- 📊 SEED ข้อมูลเริ่มต้น (INITIAL DATA)
-- ==============================================================================
INSERT INTO public.system_stats (id, total_income, total_expense, total_balance, pending_count, unpaid_count, paid_count, events_count)
VALUES ('overview', 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_matrix (id, matrix)
VALUES ('current', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- บัญชีผู้ดูแลระบบ (Admin)
INSERT INTO public.users (email, name, role, student_id, theme)
VALUES ('admin@nu.ac.th', 'แอดมินระบบ BEC BA 69', 'Admin', '00000000', 'black')
ON CONFLICT (email) DO UPDATE 
SET role = 'Admin', name = EXCLUDED.name;

-- รายชื่อนิสิตทั้ง 103 คน (BEC BA 69)
INSERT INTO public.users (email, name, role, student_id, theme)
VALUES
('kamonthipy69@nu.ac.th', 'นางสาวกมลทิพย์ ยะพลหา', 'Student', '69343832', 'black'),
('kamonratsr69@nu.ac.th', 'นางสาวกมลรัตน์ สียะ', 'Student', '69343849', 'black'),
('koranichm69@nu.ac.th', 'นางสาวกรณิศ เหมือนจันทร์', 'Student', '69343856', 'black'),
('kanyaphatfu69@nu.ac.th', 'นางสาวกัญญาภัทร เฟื่องฟู', 'Student', '69343863', 'black'),
('kantichat69@nu.ac.th', 'นางสาวกันธิชา เที่ยงตรง', 'Student', '69343870', 'black'),
('kansireek69@nu.ac.th', 'นางสาวกานต์สิรี คำจำปา', 'Student', '69343887', 'black'),
('kukiadk69@nu.ac.th', 'นายกู้เกียรติ กันต์นิกูล', 'Student', '69343894', 'black'),
('kwanruethait69@nu.ac.th', 'นางสาวขวัญฤทัย ฑีฆาวงค์', 'Student', '69343900', 'black'),
('jiradaj69@nu.ac.th', 'นางสาวจิรดา เจริญสุข', 'Student', '69343931', 'black'),
('jirawadeet69@nu.ac.th', 'นางสาวจิราวดี โตบึงกอก', 'Student', '69343948', 'black'),
('jenniferv69@nu.ac.th', 'นางสาวเจนนิเฟอร์ แฟนเดนเบิร์ก', 'Student', '69343955', 'black'),
('chanapas69@nu.ac.th', 'นางสาวชนาภา ศรีสวัสดิ์', 'Student', '69343962', 'black'),
('chanidapas69@nu.ac.th', 'นางสาวชนิดาภา สุ่มประดิษฐ', 'Student', '69343979', 'black'),
('chayapolp69@nu.ac.th', 'นายชยพล พรหมจำรัส', 'Student', '69343986', 'black'),
('chayangkoons69@nu.ac.th', 'นายชยางกูร ทรัพย์วรกิจ', 'Student', '69343993', 'black'),
('chonthichav69@nu.ac.th', 'นางสาวชลธิชา วรยศ', 'Student', '69344013', 'black'),
('chonladaw69@nu.ac.th', 'นางสาวชลลดา วงหาร', 'Student', '69344020', 'black'),
('chawanlaks69@nu.ac.th', 'นางสาวชวัลลักษณ์ ศรีคง', 'Student', '69344037', 'black'),
('yanisak69@nu.ac.th', 'นางสาวญาณิศา กีรติสิทธิกุล', 'Student', '69344051', 'black'),
('thitiphatc69@nu.ac.th', 'นายฐิติภัทร ชัยอาวุธ', 'Student', '69344068', 'black'),
('npatsorns69@nu.ac.th', 'นางสาวณภัทสรณ์ ศรแก้ว', 'Student', '69344075', 'black'),
('natthakank69@nu.ac.th', 'นางสาวณัฏฐกันย์ ก้อนพรหม', 'Student', '69344082', 'black'),
('natthawand69@nu.ac.th', 'นางสาวณัฏฐวรรณ ดวงยี่หวา', 'Student', '69344099', 'black'),
('natchanans69@nu.ac.th', 'นางสาวณัฐชนันท์ สวัสดี', 'Student', '69344105', 'black'),
('natchadan69@nu.ac.th', 'นางสาวณัฐชาดา งิ้วงาม', 'Student', '69344112', 'black'),
('natnichao69@nu.ac.th', 'นางสาวณัฐณิชา อ่อนมี', 'Student', '69344129', 'black'),
('nattharinp69@nu.ac.th', 'นางสาวณัฐรินทร์ ภูมิศรีจันทร์', 'Student', '69344143', 'black'),
('nuttarutk69@nu.ac.th', 'นายณัฐรุทธิ์ โกศลดิลกกุล', 'Student', '69344150', 'black'),
('donlayab69@nu.ac.th', 'นางสาวดลยา บัณฑูร', 'Student', '69344167', 'black'),
('donrayas69@nu.ac.th', 'นางสาวดลยา สุชัยสง', 'Student', '69344174', 'black'),
('duangnapas69@nu.ac.th', 'นางสาวดวงนภา แสงหิรัญ', 'Student', '69344181', 'black'),
('daraphonc69@nu.ac.th', 'นางสาวดาราพร ชูเกิด', 'Student', '69344198', 'black'),
('tippayapornk69@nu.ac.th', 'นางสาวทิพยาภรณ์ ก้อนพันธ์', 'Student', '69344204', 'black'),
('tanakritt69@nu.ac.th', 'นายธนกฤต ทองช้าง', 'Student', '69344211', 'black'),
('thanathorns69@nu.ac.th', 'นางสาวธนธรณ์ สมฝั้น', 'Student', '69344235', 'black'),
('thanaphum69@nu.ac.th', 'นายธนภูมิ ม่วงทอง', 'Student', '69344242', 'black'),
('tanawatj69@nu.ac.th', 'นายธนวัฒน์ จันสี', 'Student', '69344259', 'black'),
('thanatchat69@nu.ac.th', 'นางสาวธนัชชา เตรียมพล', 'Student', '69344266', 'black'),
('thamonwansu69@nu.ac.th', 'นางสาวธมนวรรณ สุขโต', 'Student', '69344273', 'black'),
('thamonwans69@nu.ac.th', 'นางสาวธมลวรรณ ศรีคำดี', 'Student', '69344280', 'black'),
('thanyalakw69@nu.ac.th', 'นางสาวธัญลักษณ์ เวียนเทียน', 'Student', '69344297', 'black'),
('thansineet69@nu.ac.th', 'นางสาวธัญสินี ธุระกิจ', 'Student', '69344303', 'black'),
('thanchanokm69@nu.ac.th', 'นางสาวธันย์ชนก มีอ่อน', 'Student', '69344310', 'black'),
('nonthisab69@nu.ac.th', 'นางสาวนนทิสา เบ้าคำ', 'Student', '69344327', 'black'),
('naphatchanank69@nu.ac.th', 'นางสาวนพัชนันต์ คำช้าง', 'Student', '69344334', 'black'),
('naphatkamonk69@nu.ac.th', 'นางสาวนภัสกมล คำสวนจิก', 'Student', '69344341', 'black'),
('naparatt69@nu.ac.th', 'นางสาวนภารัตน์ ทิพย์แสง', 'Student', '69344358', 'black'),
('nichapake69@nu.ac.th', 'นางสาวนิชาภา เกษสาคร', 'Student', '69344372', 'black'),
('pakonp69@nu.ac.th', 'นายปกรณ์ ผลาหาญ', 'Student', '69344389', 'black'),
('patiponk69@nu.ac.th', 'นายปฏิพล คำโอด', 'Student', '69344396', 'black'),
('paphawarinkae69@nu.ac.th', 'นางสาวปภาวรินท์ แก้วช้าง', 'Student', '69344402', 'black'),
('poramesuanp69@nu.ac.th', 'นายปรเมศวร พันธุมาศ', 'Student', '69344419', 'black'),
('parinp69@nu.ac.th', 'นายปรินทร์ ปิ่นทอง', 'Student', '69344426', 'black'),
('panvirinn69@nu.ac.th', 'นายปานวิริณทร์ นพใปล่', 'Student', '69344433', 'black'),
('palitap69@nu.ac.th', 'นางสาวปาลิตา ภัทรพันธุ์พงศ์', 'Student', '69344440', 'black'),
('piyanank69@nu.ac.th', 'นางสาวปิยนันท์ กาวินันท์', 'Student', '69344457', 'black'),
('poonyaweec69@nu.ac.th', 'นายปุณยวีร์ ชูแสง', 'Student', '69344471', 'black'),
('phongsakorns69@nu.ac.th', 'นายพงศกร ศรีอรุณนิรันดร์', 'Student', '69344488', 'black'),
('pongpatp69@nu.ac.th', 'นายพงศ์พัฒน์ ไพโรจน์', 'Student', '69344495', 'black'),
('phanats69@nu.ac.th', 'นายพนัตถ์ สิงห์คำ', 'Student', '69344501', 'black'),
('panidan69@nu.ac.th', 'นางสาวพนิดา นิลรัตน์', 'Student', '69344518', 'black'),
('phatcharidam69@nu.ac.th', 'นางสาวพัชริดา มะลิสุวรรณ', 'Student', '69344525', 'black'),
('patcharidad69@nu.ac.th', 'นางสาวพัชริดา ดีนุช', 'Student', '69344532', 'black'),
('pimchanokm69@nu.ac.th', 'นางสาวพิมพ์ชนก มณีนิล', 'Student', '69344556', 'black'),
('pimonpank69@nu.ac.th', 'นางสาวพิมลพรรณ แก้วชัง', 'Student', '69344563', 'black'),
('phirawatc69@nu.ac.th', 'นายพีรวัฒน์ ชำนาญหมอ', 'Student', '69344570', 'black'),
('phakkhaphonl69@nu.ac.th', 'นางสาวภัคพร หลักบึง', 'Student', '69344587', 'black'),
('phakphumc69@nu.ac.th', 'นายภาคภูมิ จันกรม', 'Student', '69344600', 'black'),
('muthital69@nu.ac.th', 'นางสาวมุทิตา เล้าแสงสุข', 'Student', '69344631', 'black'),
('rutchadaruky69@nu.ac.th', 'นางสาวรัชดาลักษณ์ เย็นขัน', 'Student', '69344648', 'black'),
('ramilp69@nu.ac.th', 'นายรามิล ปะกินำหัง', 'Student', '69344655', 'black'),
('rinladeek69@nu.ac.th', 'นางสาวรินลดี กันยาประสิทธิ์', 'Student', '69344679', 'black'),
('watsamonm69@nu.ac.th', 'นางสาววรรษมน มนธรรม', 'Student', '69344693', 'black'),
('waraporns69@nu.ac.th', 'นางสาววราภรณ์ แสงพันตา', 'Student', '69344709', 'black'),
('walailakk69@nu.ac.th', 'นางสาววไลลักษณ์ คำวงษ์', 'Student', '69344716', 'black'),
('watcharaphongp69@nu.ac.th', 'นายวัชรพงษ์ พูลเพิ่ม', 'Student', '69344723', 'black'),
('witchayadap69@nu.ac.th', 'นางสาววิชญาดา เพ็งเพชร', 'Student', '69344747', 'black'),
('wutthichokj69@nu.ac.th', 'นายวุฒิโชติ จักร์ตา', 'Student', '69344754', 'black'),
('sawitrak69@nu.ac.th', 'นางสาวศวิตา แก้วขจัด', 'Student', '69344761', 'black'),
('siradah69@nu.ac.th', 'นางสาวศิรดา หิริโอ', 'Student', '69344778', 'black'),
('sirikranc69@nu.ac.th', 'นางสาวศิริกาญจน์ ชูเมือง', 'Student', '69344785', 'black'),
('siwakornth69@nu.ac.th', 'นายศิวกร ทองชั่ง', 'Student', '69344792', 'black'),
('suphanatd69@nu.ac.th', 'นายศุภณัฐ ด้วงฟู', 'Student', '69344808', 'black'),
('suphakank69@nu.ac.th', 'นางสาวศุภากานต์ แก้วฉอ้อน', 'Student', '69344815', 'black'),
('stephanem69@nu.ac.th', 'นายสเตฟาน โมแร็ง', 'Student', '69344822', 'black'),
('sitthichaic69@nu.ac.th', 'นายสิทธิชัย ชีรัมย์', 'Student', '69344839', 'black'),
('sippawitc69@nu.ac.th', 'นายสิปปวิชญ์ ชูอิฐ', 'Student', '69344846', 'black'),
('sirikanyac69@nu.ac.th', 'นางสาวสิริกัญญา ชำนาญรักษา', 'Student', '69344853', 'black'),
('sukritp69@nu.ac.th', 'นายสุกฤษฎิ์ เภาตุ่น', 'Student', '69344860', 'black'),
('ahatairats69@nu.ac.th', 'นางสาวหทัยรัตน์ สุต๊ะเขตต์', 'Student', '69344877', 'black'),
('a-thips69@nu.ac.th', 'นายอธิป โสภาศรี', 'Student', '69344884', 'black'),
('anuchap69@nu.ac.th', 'นายอนุชา ไพสนธิ์', 'Student', '69344891', 'black'),
('anuphongs69@nu.ac.th', 'นายอนุพงศ์ แซ่ว่าง', 'Student', '69344907', 'black'),
('aphiwatsi69@nu.ac.th', 'นายอภิวัฒน์ เซียวทรงสุข', 'Student', '69344914', 'black'),
('amonwanp69@nu.ac.th', 'นางสาวอมลวรรณ พันทะสา', 'Student', '69344921', 'black'),
('ayothayas69@nu.ac.th', 'นายอโยธยา สุทธิภักดี', 'Student', '69344938', 'black'),
('arisakh69@nu.ac.th', 'นางสาวอริษา ขุนทอง', 'Student', '69344952', 'black'),
('aoihormk69@nu.ac.th', 'นางสาวอ้อยหอม กรหนุ่ม', 'Student', '69344969', 'black'),
('angkuns69@nu.ac.th', 'นายอังกูร สวัสดิ์สุข', 'Student', '69344976', 'black'),
('apatsaras69@nu.ac.th', 'นางสาวอาภัสรา สุวัฒน์', 'Student', '69344990', 'black'),
('aekkawutp69@nu.ac.th', 'นายเอกวุฒิ โพสุวรรณ์', 'Student', '69345003', 'black'),
('aiyarinradak69@nu.ac.th', 'นางสาวไอยรินทร์รดา กสิกรรม', 'Student', '69345010', 'black'),
('airisak69@nu.ac.th', 'นางสาวไอริสา ขุนศิริ', 'Student', '69345027', 'black')
ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name, student_id = EXCLUDED.student_id;
