# MPIS (Missing Person Intelligence System) - System Implementation & Evaluation Report

## 1. SYSTEM INTEGRATION DETAILS

### 1.1 Architectural Data Flow
The MPIS system operates on a Unified Real-Time Inference Pipeline implementing a Zero-Trust architecture between the AI Node and Backend processing unit.
1. **Camera Feed to AI Engine**: CCTV client parses frames and sends inferences to the `mpis-ai-engine` (Flask).
2. **AI Extracted Identity -> Frontend**: Frontend application receives bounded box and alerts logic. 
3. **Frontend Ingestion to Backend**: Frontend forwards the matched person object via HTTP `POST /api/alerts`.
4. **Backend Server Verification (Spring Boot)**: Backend validates boundaries (re-weighing similarities against spoofing), deserializes payloads (<5MB limits), extracts Base64 evidences to HDD scale stores, and inserts the data into MongoDB.
5. **Real-Time Delivery (WebSocket)**: The verified Alert is streamed simultaneously to all connected surveillance clients via an active STOMP broker.

### 1.2 API Endpoints
**Frontend to Backend Alert Ingestion**
- **Endpoint**: `POST /api/alerts`
- **Request Format (AlertIngestionRequest)**:
```json
{
  "personId": "P001",
  "personName": "Durga Prasad",
  "cameraId": "CAM_STATION_1",
  "similarityScore": 0.8523,
  "detectedAt": 1714201823000,
  "evidenceImage": "data:image/jpeg;base64,/9j/4AAQSkZJ..."
}
```
- **Response Format**:
```json
{
  "status": "RECEIVED",
  "message": "Alert successfully verified and queued"
}
```

**AI Engine Inference (Match)**
- **Endpoint**: `POST /match`
- **Payload Input**: `FormData` containing the raw JPEG `file` byte array.
- **Payload Output**:
```json
{
  "status": "CONFIDENT_MATCH",
  "similarity": 0.8841,
  "personId": "P002",
  "personName": "Shreyas",
  "allScores": {
    "Shreyas": 0.8841,
    "Unknown1": 0.1230
  }
}
```

### 1.3 Image Handling Methodology
Instead of bloating the NoSQL database with large Base64 blobs, image processing has been decoupled into the `ImageStorageService`:
- Evidence strictly verified to be under **5,000,000 bytes (5MB)** to dodge `OutOfMemory` vulnerabilities.
- Base64 payload string decoded to byte-arrays.
- Stored partition-style over the filesystem using `uploads/evidence/YYYY-MM-DD/{UUID}.jpg` logic.
- The local filesystem URL path is preserved natively into the MongoDB `Alert` document (`evidenceImagePath` string field), heavily upgrading I/O throughput.

### 1.4 WebSocket Implementation
- Handled at `<Spring_Domain>/ws-alerts`.
- **Framework**: Spring WebSocket `StompEndpointRegistry` wrapped with `ThreadPoolTaskScheduler` customized (`wss-heartbeat-thread-` with pooled sized 1) and heartbeat sequences mapped at `4000ms`.
- **Broker**: SimpleBroker configured to broadcast to `/topic`.
- **Events**: On MongoDB insertion via `RealtimeAlertService`, `WebSocketBroadcastService` streams the persisted context via `/topic/alerts`.

---

## 2. BACKEND DETAILS (SPRING BOOT)

### 2.1 Major Controllers
- **`AlertController`**: Validates structural integrity (RegEx on IDs/Names), bounded checks minimum server similarity, and wraps requests to async deductive caching.
- **`PersonController`**: REST standard (CRUD), includes `updatePersonEmbeddings` algorithm using dimensional checks (Strict 512 dimensions array list required). Replaces overwrite mechanism by allowing purely incremental _append_ of 512-D vectors ensuring progressive learning without wipe-out.

### 2.2 Service Layer Logic & Deduplication
- **`RealtimeAlertService`**: Marked strategically with `@Async("alertExecutor")` and enforces asynchronous non-blocking transactions. 
- **Caching Mechanism**: Interwoven with **Caffeine caching**. A combination key of `personId_cameraId` operates under a sliding memory check. Cache executes `DEDUP_WINDOW_SECONDS=5s` timeout blocks; intercepting multiple rapid-frames (30fps camera overlaps), preventing catastrophic 100+ DB writes per second per recognized face.

### 2.3 Load Handling Operations
- A `java.util.concurrent.atomic.AtomicInteger` variable (`activeProcessingTasks`) monitors total real-time threads mapping logic.
- Max saturation defined to `MAX_CONCURRENT_ALERTS = 50`.
- Once threshold breached, the system initiates backpressure, selectively dropping frames via fast-fails to prevent JVM heap exhaustion.

---

## 3. AI ENGINE DETAILS (FLASK)

### 3.1 Neural Models & Dimensions
- **Underlying Model Name**: `buffalo_s` pipeline via InsightFace library.
- **Embedding Matrix Output**: Explicit `512-dimension` vectors representations.
- **Execution Leveling**: Fixed to `CPUExecutionProvider` on initialized Contexts. Bounding constraints bounded dynamically off `DETECTION_INPUT_SIZE: (320, 320)`.

### 3.2 Matching Algorithm Structure
Match predictions derived through pure **Cosine Similarity Mapping** alongside `L2 Normalization`.
1. The detected face crop generates a `512` array variable.
2. Norming mathematical function calculated via `np.linalg.norm(emb)`.
3. Dot-product is evaluated against all active vectors array elements: `score = float(np.dot(val_emb, stored_emb))`.

### 3.3 Threshold Calculations & Multiple Faces
- **Similarity Threshold Configured**: `0.40`. Above generates match signals.
- **Uncertainty Margin**: `0.05`. Ensures identical similarity scores alert the system to potential collision overlap risks.
- **Multiple Vectors Evaluation**: Scans the incoming feed against a stored person's `emb_list`. Uses `best_score` variable to locate the highest similarity ratio match in the multiple reference arrays map.

---

## 4. DATABASE DESIGN (MONGODB)

### 4.1 Schema Overview (Documents)
- **`persons` Collection**: Identifiers matrix representing the target missing subjects list. Contains the `faceEmbeddings` multidimensional dataset array values (`List<List<Double>>`).
- **`alerts` Collection**: Logs temporal events indicating visual mapping recognition.

### 4.2 Sample Alert Format (JSON Retrieval Mockup)
```json
{
  "_id": "64b73a4b9c1d...",
  "personId": "P_9091",
  "personName": "Durga Prasad",
  "similarity": 0.884,
  "confidenceLevel": "HIGH",
  "source": "CCTV",
  "cameraId": "CAM-ZONE-NORTH",
  "state": "DETECTED",
  "algorithmVersion": "v1.0",
  "modelUsed": "face-net-secured",
  "detectedAt": "2026-04-03T16:30:25",
  "evidenceImagePath": "/uploads/evidence/2026-04-03/bb8311a2-4f11.jpg"
}
```

---

## 5. SYSTEM TESTING DETAILS

The AI Engine leverages `test_ai_engine.py` simulating Python standard `unittest` mock architectures.

### 5.1 Test Scenarios & Flows Enforced
1. **Case: Confident Identification Overlaps**
   - *Input*: `_nearly_same()` mocked L2 norm vector matrix applied onto DB known structure.
   - *Expected output*: Validated dot mapping exceeds `.65`. Returns `CONFIDENT_MATCH`.
   - *Status*: Passes verification.

2. **Case: Identity Swap Failsafes (False Positive Prevention)**
   - *Input*: Vector dimensions of "Person A" matched towards queries expecting "Person B".
   - *Expected output*: Dot-product of mapped variables resolves `<0.4`. Orthogonal randomized 512-dim factors map to ~0 result.
   - *Status*: System handles overlap protection correctly.

3. **Case: Database Empty Contextual Check**
   - *Input*: Engine triggers standard `get_snapshot()` onto completely blank backend instance.
   - *Expected output*: Hard coded string `NO_MATCH` fallback executes correctly. Handled without variable crash structures.

4. **Case: Size Bounds Rejection**
   - *Input*: AI preprocessing receives cropped faces bounding under the required `80x80px` dimensions limit.
   - *Expected output*: Discard logic activates. Process intercepts before vector generation load.

5. **Case: Image Dimensions Limit Checks (Backpressure Logic)**
   - *Input*: Frontend `AlertIngestionRequest` triggers mapping sizes containing image bounds measuring 7MB (>5,000,000 Byte boundary string limitation).
   - *Expected output*: JVM memory protects itself returning un-mapped status object: `HttpStatus.PAYLOAD_TOO_LARGE`.

---

## 6. PERFORMANCE & RESULTS

- **Response Mapping Rate Contexts**: Valid inference mapping loops handle AI recognition operations successfully underneath the tested metrics parameters.
- **Accuracy Measurements**: By utilizing the updated threshold boundary to `MIN_SECURE_THRESHOLD: 0.40`, environmental anomalies causing noise recognition mapping errors have been drastically reduced vs previously open bounds checking states. 
- **Load Boundaries Constraint Variables**: `MAX_CONCURRENT_ALERTS` operates heavily on high overlap stream feeds (preventing MongoDB cluster locks). Saturation testing reveals drops operating efficiently if concurrent operations eclipse the defined `50` marker.

---

## 7. DEPLOYMENT CONFIGURATIONS

The full stack operates heavily within modern decoupled micro-orchestrations frameworks setup.
- **Hosting Target Framework Deploy**: `Render` Docker deployment pipelines mapping out custom environments limits.
- **Web App**:
   - Runtime built via nested internal `./backend/Dockerfile`.
   - Core operational `ENV` values: `SPRING_DATA_MONGODB_URI` & `MPIS_AI_ENGINE_URL`.
- **Python Node Engine**:
   - Boot loop mappings bound internally via `./ai-engine/Dockerfile`.
   - Engine mapped explicitly to port override bounds constraint variables: `PORT=10000`, mapping globally using `HOST=0.0.0.0`. Validating structural backend references leveraging `.env` variables string references.

---

## 8. REAL EXAMPLES (APPENDIX FORMAT REF)

### 8.1 Actual API Interception Response Logs (Backend Update Embedding Logic)
**Request Type**: `PUT /api/persons/P_5159/embeddings`
**Payload Snapshot Extrapolated**:
```json
{
  "embeddings": [
    [0.0123, -0.0512, 0.0881, 0.1111, ..., 0.0452] // (Exact length bound enforced: 512 parameters)
  ]
}
```

### 8.2 Live Context Database Stored Response 
**Realized Document Generation**:
```json
{
  "personId": "P_5159",
  "name": "Chandu",
  "age": 25,
  "gender": "M",
  "faceEmbeddings": [
    [-0.0101, 0.0091, 0.0451, ..., -0.0122]
  ],
  "createdAt": "2026-04-03T16:32:00"
}
```
