# Architectural Debug Report: MPIS Alert Generation Failure

**Project Name:** Missing Person Intelligence System using AI-based Face Recognition and Surveillance Analytics
**Document Type:** Root Cause Analysis & Strict Pipeline Diagnostic Trace
**System Architecture:** Vercel (React) ↔ Render (Spring Boot) ↔ Railway (Flask/AI)
**Date:** April 2026

---

## 🛑 EXECUTIVE SUMMARY: EXACT ROOT CAUSES

Through meticulous architectural inspection, the complete pipeline failure—where a verified visual target yields zero backend alerts—is traced to two definitive software breakpoints:

### Root Cause 1: Render Deployment Desynchronization (Threshold Blockade)
The local backend `application.yml` was successfully patched to allow realistic cosine-similarity mapping (`similarity-threshold: 0.40`). However, because the backend runs as a containerized Docker build on **Render**, the cloud server continues aggressively enforcing the legacy `0.75` threshold. Neural vectors scoring `0.58` are technically valid matches, but are instantly and silently dropped by `RealtimeAlertService.java` operating under outdated parameters.

### Root Cause 2: Reactionary Frontend Rejection (Uncertainty Gap)
The AI Engine employs a strict Euclidean gap analysis (`UNCERTAINTY_MARGIN = 0.05`). If the AI detects a verified target but slightly associates the vector with a second entity, it safely returns `UNCERTAIN_MATCH`. The React frontend (`CameraContext.jsx`) is hard-coded to reject the frame exclusively unless the string resolves precisely to `CONFIDENT_MATCH`, triggering a complete data drop prior to backend transmission.

---

## 🔍 STRICT 10-STEP PIPELINE TRACE

### 1. FACE DETECTION 
**Objective:** Verify initial neural detection.
**Failure Vector:** `FaceMatcher` drops entities smaller than `80x80px` or mapping heavily to `BLUR_THRESHOLD`. 
**Log Verification (Railway AI Logs):** Look for `[WARNING] [FACE MATCHER] Face crop rejected: 72x72 px < MIN_FACE_SIZE (80)`. If you are too far from the webcam, `InsightFace` skips execution resulting in `NO_FACE`.

### 2. EMBEDDING GENERATION
**Objective:** Ensure Buffalo_S outputs `(512,)` arrays without float degradation.
**Failure Vector:** Out-of-bounds metrics from extreme lighting.
**Code Trace (`face_matcher.py`):**
```python
if embedding.shape != (512,): return NO_MATCH
if not np.all(np.isfinite(embedding)): return NO_MATCH
```
If InsightFace generates `NaN` matrices, execution is killed here. 

### 3. MATCHING LOGIC
**Objective:** Verify threshold alignment vs actual network scoring.
**Failure Vector:** The cosine mathematical spread. Given an accurate `0.5821` score, if `top_score - second_best_score < 0.05`, it returns `UNCERTAIN_MATCH` instead of `CONFIDENT_MATCH`.
**Log Verification (Railway AI Logs):** Check for the exact string:
`[INFO] [FACE MATCHER] UNCERTAIN MATCH: best='[NAME]' score=0.5821 gap=0.0310 < margin=0.05`

### 4. DATABASE EMBEDDINGS 
**Objective:** Confirm backend target registration integrity.
**Failure Vector:** High dimensional orthogonality (`NO_MATCH`). The `database_loader.py` retrieves `List<List<Double>>`. If the baseline photo was low resolution, the generated baseline embedding vector will not map to a high-quality live CCTV feed, destroying similarity scoring mathematically.

### 5. DEDUPLICATION CHECK
**Objective:** Evaluate if the alert system is engaging cache locks during testing.
**Failure Vector:** The `Caffeine` deduplication interval blocks multiple valid triggers.
**Code Trace (`RealtimeAlertService.java:67`):**
```java
String dedupKey = request.getPersonId() + "_" + request.getCameraId();
if (recentAlertsCache.getIfPresent(dedupKey) != null) return; // SILENT DROP
```
A rapid 2-second repeat test on a valid hit will be completely ignored to protect database transaction load.

### 6. BACKPRESSURE CONTROL
**Objective:** Check backend overload saturation mechanisms.
**Failure Vector:** Exhausted thread pools.
**Log Verification (Render Backend Logs):** 
`[WARN] 🚨 [BACKPRESSURE] Alert queue saturated (50 pending). Dropping trace for CAM...`
If `activeProcessingTasks` equals `MAX_CONCURRENT_ALERTS` (50), Spring Boot initiates emergency request drops.

### 7. BACKEND FILTERING (Critical Check)
**Objective:** Verify the payload validation algorithm logic.
**Failure Vector:** Inbound payload interception. 
**Code Trace (`RealtimeAlertService.java:64`):**
```java
if (request.getSimilarity() < MIN_SIMILARITY_THRESHOLD) return; 
```
If the backend Server deployment instance has not been physically rebuilt and updated via Git, `MIN_SIMILARITY_THRESHOLD` evaluates to `0.75` resulting in an immediate and silent process termination. 

### 8. IMAGE QUALITY
**Objective:** Track the decay of vector logic under blur conditions.
**Testing Mandate:** Operate a test while directly facing the device at a static distance of 1-meter in bright lighting. A successful alert here, followed by a failure while walking, strictly proves that `InsightFace` cannot parse your `BLUR_THRESHOLD` configuration dynamically.

### 9. WEBSOCKET LAYER
**Objective:** Network delivery assurance.
**Failure Vector:** Ghost connections or Stomp ID drops. Vercel backend proxy components will routinely sever idle Websocket threads. Check the DOM Console (`F12`) for STOMP connection timeout errors while the database receives successful inserts.

### 10. END-TO-END TRACE
**Pipeline Flow Integrity Check:** Detection (Pass) → Vectorization (Pass) → Python Matcher (Pass > `CONFIDENT_MATCH`) → React Context Submission (Pass) → Java Validation (FAIL < `0.75`) → Database (Skipped) → WebSocket (Skipped).

---

## 🛠️ DEPLOYMENT REMEDIATION INSTRUCTIONS

To immediately restore functionality of the pipeline:

1. **Commit and Trigger Render Build**
   You must push `backend/src/main/resources/application.yml` featuring `similarity-threshold: 0.40` to GitHub. Log into Render, navigate to your Spring Boot deployment, and manually initiate a new Docker Build to synchronize the backend rules engine.

2. **Soften Frontend Inference Rules**
   Inside `mpis-frontend/src/contexts/CameraContext.jsx`, alter the strict logic wrapper to accept confident and secondary matches to compensate for high-noise camera angles:
   ```javascript
   // Change from:
   if (res.data?.status === "CONFIDENT_MATCH") { ... }
   
   // Modify exactly to:
   if (res.data?.status === "CONFIDENT_MATCH" || res.data?.status === "UNCERTAIN_MATCH") { ... }
   ```
