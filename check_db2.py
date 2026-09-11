import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URL = "https://akubccovjhaiuzludggt.supabase.co/rest/v1/users?select=email"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdWJjY292amhhaXV6bHVkZ2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDU2NDgsImV4cCI6MjEwNDY4MTY0OH0.nbGXqw-byF3NSbS_cIYHvfpSZEDZIS_JtcwzPD9yIHk"

req = urllib.request.Request(URL, headers={
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}"
})

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"Total users in DB: {len(data)}")
        emails = [x['email'] for x in data]
        print("First 10 emails in DB:", emails[:10])
        if 'waraporns69@nu.ac.th' in emails:
            print("FOUND exact match: waraporns69@nu.ac.th")
        else:
            print("NOT FOUND: waraporns69@nu.ac.th")
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
