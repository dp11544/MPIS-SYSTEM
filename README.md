<img width="1919" height="964" alt="Screenshot 2026-04-07 170237" src="https://github.com/user-attachments/assets/302e23d6-c105-47e3-9668-168f8dc59e2e" />
  Missing Person Intelligence System (MPIS)

### *AI-Based Face Recognition and Real-Time Surveillance Analytics*

The **Missing Person Intelligence System (MPIS)** is a real-time, distributed surveillance platform that leverages artificial intelligence to identify missing individuals using facial recognition. The system integrates modern web technologies, backend processing, and AI inference to deliver accurate and instant alerts in surveillance environments.

---

## System Overview

MPIS is designed to automate the identification process by analyzing image inputs and comparing them with stored facial embeddings. The system ensures reliable performance through multi-frame validation, adaptive thresholding, and intelligent filtering mechanisms.

It is built using a scalable architecture where each component operates independently, enabling efficient processing and real-time communication.

---

##  Architecture

```
Frontend (React - Vercel)
        ↓
Backend (Spring Boot - Render)
        ↓
AI Engine (Flask - Railway)
        ↓
MongoDB Database
        ↓
WebSocket (Real-time Alerts)
```

---

## ⚙️ Core Features

* 🔍 AI-based face detection and embedding generation
* 🎯 Cosine similarity-based matching
* ⚡ Real-time alert broadcasting using WebSocket
* 🧠 Adaptive threshold system (CONFIDENT / REVIEW)
* ⏱ Multi-frame validation (temporal consistency)
* 🚫 Intelligent deduplication (Caffeine cache)
* 🛡️ Backpressure control using AtomicInteger
* 💾 Optimized image storage (filesystem-based)
* 🌐 Distributed cloud deployment

---

## ⚙️ Technology Stack

### Frontend

* React (Vite)
* Axios
* WebSocket

### Backend

* Spring Boot
* MongoDB
* Caffeine Cache
* Async Processing (@Async)

### AI Engine

* Flask
* InsightFace
* OpenCV
* NumPy

---

## 🔗 Environment Configuration

### Frontend (Vercel)

```env
VITE_API_URL=https://mpis-backend.onrender.com/api
VITE_AI_ENGINE_URL=https://mpis-ai-engine-production-f090.up.railway.app
```

---

### Backend (Render)

```env
AI_ENGINE_URL=https://mpis-ai-engine-production-f090.up.railway.app
SPRING_DATA_MONGODB_URI=your_mongodb_uri
```

---

## 🔄 System Workflow

1. Image input is captured from user or surveillance source
2. Backend validates and forwards request to AI engine
3. AI engine performs:

   * Face detection
   * Embedding generation
   * Similarity computation
4. Result is returned with match status
5. Backend applies:

   * Threshold validation
   * Multi-frame confirmation
   * Deduplication logic
6. Alert is stored in MongoDB
7. Alert is broadcast via WebSocket
8. Frontend updates in real-time

---

# 📸 Output Screens

---

## 🔐 Login Interface
<img width="1919" height="964" alt="Screenshot 2026-04-07 170237" src="https://github.com/user-attachments/assets/96a18b8f-0dee-4797-b700-6ddc336119b0" />


Secure authentication interface that restricts system access to authorized users.

---

## 📝 Missing Person Registration

![Register](./screenshots/register.png)

Interface for registering missing person details along with facial images for future identification.

---

## 🔬 Forensic Match Interface

![Forensic](./screenshots/forensic.png)

Allows manual image upload and AI-based matching for investigation purposes.

---

## 📡 Live Surveillance Monitor

![Live](./screenshots/live.png)

Displays real-time alerts generated from surveillance streams with instant updates.

---

## 🗺️ Deployment Map Interface

![Map](./screenshots/map.png)

Visual representation of camera locations and detection points for situational awareness.

---

## 📂 Missing Persons Registry

![Registry](./screenshots/registry.png)

Structured database view of all registered individuals with search and management features.

---

## 📊 Intelligence Overview

![Dashboard](./screenshots/dashboard.png)

Displays analytics such as total alerts, matches, and system activity insights.

---

## 🧪 Diagnostics & Telemetry

![Diagnostics](./screenshots/diagnostics.png)

Provides system health status including backend, AI engine, and connectivity.

---

## 📁 Case File Interface

![Case](./screenshots/case.png)

Detailed view of a specific alert including identity, similarity score, and metadata.

---

## 📚 Full Case File Interface

![Full Case](./screenshots/fullcase.png)

Comprehensive case tracking with historical alerts and evidence data.

---

## 🧪 Testing Summary

* ✔ High-quality images → Accurate match
* ✔ Low-quality inputs → Rejected
* ✔ Duplicate frames → Ignored
* ✔ Large payloads → Blocked
* ✔ Unknown persons → No match

---

## ⚡ Performance

* ⏱ Response Time: 0.5 – 1.5 seconds
* 🎯 High accuracy (depends on image quality)
* 🔄 Stable under continuous load

---

## ⚠️ Limitations

* Performance depends on image quality
* Reduced accuracy for occluded faces
* Limited cross-frame identity tracking

---

## 🚀 Future Enhancements

* Multi-camera tracking system
* Mobile application integration
* Advanced deep learning models
* Vector database (FAISS)
* Large-scale CCTV integration

---

## 👨‍💻 Author

ALLAM DURGA PRASAD
Missing Person Intelligence System (MPIS)

