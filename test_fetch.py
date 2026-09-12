import urllib.request
import json

url = "https://script.google.com/macros/s/AKfycbwMnLEpGSYmdqeQTgU5s4vtVTRKhhAC594wcF-wycBuJqy4tB-XOxi6xAsP6TXPUuy4ew/exec"
data = json.dumps({
    "action": "uploadSlip",
    "payload": {
        "eventId": "test",
        "email": "test@nu.ac.th",
        "studentId": "123",
        "amount": 50,
        "penalty": 0,
        "base64Image": "data:image/jpeg;base64,iVBORw0K"
    }
}).encode('utf-8')

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'text/plain') # GAS needs text/plain for CORS

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Response:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
