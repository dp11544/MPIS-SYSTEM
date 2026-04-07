## Missing Person Intelligence System using AI-based Face Recognition and Surveillance Analytics

The **Missing Person Intelligence System (MPIS)** is a real-time, distributed surveillance platform that leverages artificial intelligence to identify missing individuals using facial recognition. The system integrates modern web technologies, backend processing, and AI inference to deliver accurate and instant alerts in surveillance environments.

## System Overview

MPIS is designed to automate the identification process by analyzing image inputs and comparing them with stored facial embeddings. The system ensures reliable performance through multi-frame validation, adaptive thresholding, and intelligent filtering mechanisms.

It is built using a scalable architecture where each component operates independently, enabling efficient processing and real-time communication.

##  Architecture

Frontend (React - Vercel)
        ↓
Backend (Spring Boot - Render)
        ↓
AI Engine (Flask - Railway)
        ↓
MongoDB Database
        ↓
WebSocket (Real-time Alerts)

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
## 🧠 Dashboard Interface
<img width="1919" height="1079" alt="Screenshot 2026-04-01 003703" src="https://github.com/user-attachments/assets/2e0c9ab6-2822-4e14-8bfb-fb97b0e37492" />


## 📝 Missing Person Registration

<img width="1911" height="969" alt="Screenshot 2026-04-04 144638" src="https://github.com/user-attachments/assets/30b04a5b-0188-4e25-9b1e-a4c29c2bcce7" />


Interface for registering missing person details along with facial images for future identification.

---

## 🔬 Forensic Match Interface
<img width="1912" height="960" alt="Screenshot 2026-04-04 145400" src="https://github.com/user-attachments/assets/dd0aca16-b6a7-40ab-a4a9-e1f740b2e84c" />
Allows manual image upload and AI-based matching for investigation purposes.

---

## 📡 Live Surveillance Monitor
<img width="1918" height="952" alt="Screenshot 2026-04-07 165948" src="https://github.com/user-attachments/assets/0c57ae75-6aaf-4554-9651-daa9f467b383" />
Displays real-time alerts generated from surveillance streams with instant updates.

---

## 🗺️ Deployment Map Interface

<img width="1919" height="958" alt="Screenshot 2026-04-07 165119" src="https://github.com/user-attachments/assets/4f9e371c-3a5a-4a32-b823-33ce6372f79e" />
Visual representation of camera locations and detection points for situational awareness.

---

## 📂 Missing Persons Registry
<img width="1911" height="967" alt="Screenshot 2026-04-07 165418" src="https://github.com/user-attachments/assets/7c753223-d76b-44be-aebe-23d397514e44" />
Structured database view of all registered individuals with search and management features.

---
## 📊 Intelligence Overview

<img width="1914" height="963" alt="Screenshot 2026-04-07 170526" src="https://github.com/user-attachments/assets/d10ad090-a20b-41cb-9b72-260dec2668a1" />
Displays analytics such as total alerts, matches, and system activity insights.

---

## 🧪 Diagnostics & Telemetry
<img width="1904" height="970" alt="Screenshot 2026-04-07 165255" src="https://github.com/user-attachments/assets/d6337a5c-7081-42b5-8f1e-8c3df47c8d02" />
Provides system health status including backend, AI engine, and connectivity.

---

## 📁 Case File Interface
<img width="1919" height="965" alt="Screenshot 2026-04-07 170821" src="https://github.com/user-attachments/assets/f0f847f3-a991-4db2-93da-1ea7d8f11078" />
Detailed view of a specific alert including identity, similarity score, and metadata.

---

## 📚 Full Case File Interface
!<img width="1911" height="956" alt="Screenshot 2026-04-07 170926" src="https://github.com/user-attachments/assets/daa0d428-b3a9-4538-a1c8-cc9b9d5a3b9c" />
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
