import urllib.request
import json

url = "https://script.google.com/macros/s/AKfycbwMnLEpGSYmdqeQTgU5s4vtVTRKhhAC594wcF-wycBuJqy4tB-XOxi6xAsP6TXPUuy4ew/exec"
data = json.dumps({
    "action": "uploadImageOnly",
    "payload": {
        "base64Image": "data:image/jpeg;base64,iVBORw0K",
        "prefix": "EXP"
    }
}).encode('utf-8')

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'text/plain')

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
