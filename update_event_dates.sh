#!/bin/bash
URL="https://akubccovjhaiuzludggt.supabase.co/rest/v1"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk"

# Fetch all events
EVENTS=$(curl -s "$URL/events?select=id,title" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")

# Extract IDs
ID1=$(echo $EVENTS | jq -r '.[] | select(.title == "สัปดาห์ที่ 1") | .id')
ID2=$(echo $EVENTS | jq -r '.[] | select(.title == "สัปดาห์ที่ 2") | .id')
ID3=$(echo $EVENTS | jq -r '.[] | select(.title == "สัปดาห์ที่ 3") | .id')
ID4=$(echo $EVENTS | jq -r '.[] | select(.title == "สัปดาห์ที่ 4") | .id')
ID5=$(echo $EVENTS | jq -r '.[] | select(.title == "สัปดาห์ที่ 5") | .id')

echo "Week 1 ID: $ID1"
echo "Week 4 ID: $ID4"

# Patch them with new created_at
if [ ! -z "$ID1" ] && [ "$ID1" != "null" ]; then
  curl -s -X PATCH "$URL/events?id=eq.$ID1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"created_at": "2026-07-15T05:00:00Z"}'
fi

if [ ! -z "$ID2" ] && [ "$ID2" != "null" ]; then
  curl -s -X PATCH "$URL/events?id=eq.$ID2" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"created_at": "2026-07-20T05:00:00Z"}'
fi

if [ ! -z "$ID3" ] && [ "$ID3" != "null" ]; then
  curl -s -X PATCH "$URL/events?id=eq.$ID3" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"created_at": "2026-07-29T05:00:00Z"}'
fi

if [ ! -z "$ID4" ] && [ "$ID4" != "null" ]; then
  curl -s -X PATCH "$URL/events?id=eq.$ID4" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"created_at": "2026-08-04T05:00:00Z"}'
fi

if [ ! -z "$ID5" ] && [ "$ID5" != "null" ]; then
  curl -s -X PATCH "$URL/events?id=eq.$ID5" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"created_at": "2026-08-12T05:00:00Z"}'
fi

echo "Done updating event dates."
