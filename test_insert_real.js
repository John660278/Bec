const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://akubccovjhaiuzludggt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const data = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    title: "Test 123",
    amount: 15,
    date: "2026-09-12",
    receipt_url: "",
    created_at: new Date().toISOString()
  };
  console.log("Inserting:", data);
  const { error } = await supabase.from('expenses').insert([data]);
  console.log("Error:", error);
}
run();
