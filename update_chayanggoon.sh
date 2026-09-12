#!/bin/bash
URL="https://akubccovjhaiuzludggt.supabase.co/rest/v1"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk"

EVENT_ID="b79ced01-4cb2-489b-b69b-b55bcd36d9e9" # สัปดาห์ที่ 5
NAME="นายชยางกูร ทรัพย์วรกิจ"
ENCODED_NAME=$(echo -n "$NAME" | jq -sRr @uri)

curl -s -X PATCH "$URL/payments?event_id=eq.$EVENT_ID&student_name=eq.$ENCODED_NAME" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"paid_amount": 51}'

echo "Updated amount for $NAME"

# Verify
curl -s "$URL/payments?select=student_name,paid_amount&event_id=eq.$EVENT_ID&student_name=eq.$ENCODED_NAME" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"

# Ensure due dates are definitely Sept 10
curl -s -X PATCH "$URL/events?id=not.is.null" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"due_date": "2026-09-10T16:59:59Z"}'

echo ""
echo "Updated due dates (again)."
