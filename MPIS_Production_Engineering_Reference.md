# MPIS: System Architecture & Deployment Reference

## 1. System Architecture
The Missing Person Intelligence System (MPIS) employs a strict Zero-Trust 3-tier microservice architecture:
*   **Frontend**: React (Vite) hosted on **Vercel**
*   **Backend**: Java Spring Boot hosted on **Render** (Free Tier)
*   **AI Engine**: Python Flask/InsightFace Engine (Deployable to **Railway** or Local)
*   **Database**: MongoDB Atlas Cluster

---

## 2. Complete Project Structure

```text
missing-person-intelligence-system/
│
├── mpis-frontend/                 # REACT (VERCEL)
│   ├── package.json
│   ├── vite.config.js             # Defines base paths and proxy rules
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js           # Centralized Axios config (VITE_API_URL)
│   │   ├── components/
│   │   │   └── widgets/           
│   │   │       └── AlertCard.jsx  # Glassmorphic UI elements
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx    # JWT Lifecycle management
│   │   │   └── CameraContext.jsx  # Webcam frame extraction & optimization
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LiveAlerts.jsx     # Tactical Intelligence UI
│   │   │   └── DeploymentMap.jsx  # Geospatial Tracking WebSocket map
│   │   └── services/
│   │       └── WebSocketService.js# STOMP over SockJS implementation
│
├── backend/                       # SPRING BOOT (RENDER)
│   ├── pom.xml
│   ├── Dockerfile                 # Render deployment standard
│   ├── src/main/resources/
│   │   └── application.yml        # Spring configuration & MongoDB URI
│   └── src/main/java/com/mpsystem/backend/
│       ├── config/
│       │   ├── SecurityConfig.java# CORS and JWT stateless filtering
│       │   └── WebSocketConfig.java
│       ├── controller/
│       │   ├── FaceMatchController.java # Primary AI entry point
│       │   └── RealtimeAlertController.java
│       ├── service/
│       │   ├── RealtimeAlertService.java # Deduplication & caching logic
│       │   └── ImageStorageService.java  # Fast local storage for evidence
│       └── model/
│           ├── Alert.java
│           └── Person.java
│
└── ai-engine/                     # PYTHON FLASK (RAILWAY/LOCAL)
    ├── requirements.txt
    ├── main.py                    # Gunicorn entry point
    ├── api_server.py              # Flask /api/forensic/match routes
    ├── database_loader.py         # MongoDB synchronization
    ├── embedding_engine.py        # CPU/GPU ONNX Runtime execution
    ├── face_matcher.py            # Cosine similarity logic
    └── face_preprocessor.py       # RetinaFace bounding box extraction
```

---

## 3. Environment Variables

### Frontend (`mpis-frontend/.env`)
```env
VITE_API_URL=https://mpis-backend.onrender.com/api
VITE_WS_URL=https://mpis-backend.onrender.com/ws
```

### Backend (`backend/src/main/resources/application.yml` overrides)
```env
PORT=8080
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/mpis
JWT_SECRET=YOUR_SECURE_256_BIT_SECRET
MAX_CONCURRENT_ALERTS=50
CORS_ALLOWED_ORIGINS=https://mpis-system.vercel.app
```

### AI Engine (`ai-engine/.env`)
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/mpis
AI_CONFIDENCE_THRESHOLD=0.75
AI_REVIEW_THRESHOLD=0.60
```

---

## 4. Exact Data Flow (End-to-End Inference)

The system processing loop executes in under `800ms` total round-trip:

1.  **Frontend (`CameraContext.jsx`)**: Captures webcam frame, severely scales down resolution to an 800px compressed `.jpg` Blob to bypass payload limits.
2.  **Frontend → Backend**: Performs `POST /api/forensic/match-image` with `multipart/form-data`.
3.  **Backend (`FaceMatchController.java`)**: Receives the payload and proxies it via `RestTemplate` to the localized Python API Server holding the model in RAM.
4.  **AI Engine (`api_server.py` → `face_matcher.py`)**: 
    *   Extracts face embeddings using `buffalo_s`.
    *   Compares the vector against the synced MongoDB `active_persons` cache.
    *   Finds a match at `65.2%` -> Returns `{"status": "REVIEW_MATCH"}`.
5.  **Backend (`RealtimeAlertService.java`)**: 
    *   Passes multi-frame tracking gate (`required-frames=1`).
    *   Secures Base64 evidence to File System `ImageStorageService`.
    *   Saves the `Alert` Document to MongoDB.
    *   Broadcasts payload to `/topic/alerts`.
6.  **Backend → Frontend**: STOMP WebSocket pushes the payload.
7.  **Frontend (`LiveAlerts.jsx` & `DeploymentMap.jsx`)**: Instantly overlays the red tactical UI ring and updates the Incident Feed with `<AlertCard>`.

---

## 5. Deployment & Verification Checklist

**Pre-Flight Checks:**
*   [x] **Vercel**: Ensure the Environment Variable `VITE_API_URL` uses `https` (No Mixed-Content errors).
*   [x] **Render**: Check Render Logs for `Tomcat started on port 8080`. Send a manual ping to spin up the container from hibernation.
*   [x] **Railway/Local**: Ensure the AI Engine loaded the `buffalo_s` model successfully into RAM.
*   [x] **MongoDB**: Verify IP Access allows global connections (`0.0.0.0/0`) since Render IP masks can rotate.

**Common Failure Points:**
1.  **"Network Error" in Browser Console**: Vercel strict HTTPS policy blocked an HTTP endpoint OR Render is asleep.
2.  **Failed WebSocket Connection**: Make sure `SockJS` is targeting `https://mpis-backend.onrender.com/ws`.
3.  **Broken Missing Images**: Ensure the `buildImageUrl()` utility is correctly wrapping relative `/uploads/...` paths on the frontend.
4.  **Java OutOfMemoryError**: Result of sending raw, unscaled `Base64` massive images; ensure Webcams scale down canvases before POSTing.
