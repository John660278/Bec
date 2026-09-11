import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk"

url = "https://akubccovjhaiuzludggt.supabase.co/rest/v1/payments"
data = [{
    "id": "PAY_123",
    "event_id": "6aa58006-4103-40b7-8582-843f72518369"
}]

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
})

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
