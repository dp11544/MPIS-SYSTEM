import cv2
import requests
import time

AI_URL = "https://mpis-ai-engine-production-a3a3.up.railway.app"

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Camera not working")
    exit()

print("✅ Camera started")

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Frame capture failed")
        break

    # Convert frame to JPEG
    _, buffer = cv2.imencode('.jpg', frame)

    try:
        # STEP 1: Extract embedding
        res = requests.post(
            f"{AI_URL}/extract-embedding",
            files={"image": ("frame.jpg", buffer.tobytes(), "image/jpeg")},
            timeout=15
        )

        if res.status_code != 200:
            print("No face / error:", res.text)
            continue

        embedding = res.json()["embedding"]

        # STEP 2: Recognize
        res2 = requests.post(
            f"{AI_URL}/recognize-face",
            json={"embedding": embedding},
            timeout=15
        )

        print("RESULT:", res2.json())

    except Exception as e:
        print("Error:", e)

    # Show camera
    cv2.imshow("MPIS Camera", frame)

    # ESC to exit
    if cv2.waitKey(1) & 0xFF == 27:
        break

    time.sleep(0.3)

cap.release()
cv2.destroyAllWindows()