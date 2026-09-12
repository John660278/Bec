#!/bin/bash
URL="https://akubccovjhaiuzludggt.supabase.co/rest/v1"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk"

EVENT_ID="b79ced01-4cb2-489b-b69b-b55bcd36d9e9" # สัปดาห์ที่ 5

# Using exact names URL encoded
# นายพงศกร ศรีอรุณนิรันดร์
curl -s -X PATCH "$URL/payments?event_id=eq.$EVENT_ID&student_name=eq.%E0%B8%99%E0%B8%B2%E0%B8%A2%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B8%81%E0%B8%A3%20%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%93%E0%B8%99%E0%B8%B4%E0%B8%A3%E0%B8%B1%E0%B8%99%E0%B8%94%E0%B8%A3%E0%B9%8C" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"paid_amount": 51}'

# นางสาวพิมลพรรณ แก้วชัง
curl -s -X PATCH "$URL/payments?event_id=eq.$EVENT_ID&student_name=eq.%E0%B8%99%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%B2%E0%B8%A7%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%A5%E0%B8%9E%E0%B8%A3%E0%B8%A3%E0%B8%93%20%E0%B9%81%E0%B8%81%E0%B9%89%E0%B8%A7%E0%B8%8A%E0%B8%B1%E0%B8%87" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"paid_amount": 51}'

# นายสิปปวิชญ์ ชูอิฐ
curl -s -X PATCH "$URL/payments?event_id=eq.$EVENT_ID&student_name=eq.%E0%B8%99%E0%B8%B2%E0%B8%A2%E0%B8%AA%E0%B8%B4%E0%B8%9B%E0%B8%9B%E0%B8%A7%E0%B8%B4%E0%B8%8A%E0%B8%8D%E0%B9%8C%20%E0%B8%8A%E0%B8%B9%E0%B8%AD%E0%B8%B4%E0%B8%90" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"paid_amount": 51}'

# Verify
curl -s "$URL/payments?select=student_name,paid_amount&event_id=eq.$EVENT_ID" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | jq '.[] | select(.student_name | contains("พงศกร") or contains("พิมลพรรณ") or contains("สิปปวิชญ์"))'

# Update system_stats
STATS=$(curl -s "$URL/system_stats?select=total_paid_payments,total_balance&id=eq.overview" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
PAID=$(echo $STATS | jq '.[0].total_paid_payments')
BAL=$(echo $STATS | jq '.[0].total_balance')

NEW_PAID=$(awk "BEGIN {print $PAID + 3}")
NEW_BAL=$(awk "BEGIN {print $BAL + 3}")

curl -s -X PATCH "$URL/system_stats?id=eq.overview" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"total_paid_payments": '$NEW_PAID', "total_balance": '$NEW_BAL'}'

echo "Updated stats: $NEW_PAID, $NEW_BAL"

# Update ALL events due_date (add id=not.is.null to satisfy where clause)
curl -s -X PATCH "$URL/events?id=not.is.null" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"due_date": "2026-09-10T16:59:59Z"}'

echo "Updated due dates."

