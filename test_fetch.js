const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMnLEpGSYmdqeQTgU5s4vtVTRKhhAC594wcF-wycBuJqy4tB-XOxi6xAsP6TXPUuy4ew/exec";

async function test() {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadSlip',
        payload: {
          eventId: 'test',
          email: 'test@nu.ac.th',
          studentId: '123',
          amount: 50,
          penalty: 0,
          base64Image: 'data:image/jpeg;base64,iVBORw0K'
        }
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 500));
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
