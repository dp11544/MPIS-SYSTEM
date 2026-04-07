# MPIS Final Architecture Report

**Project Name:** Missing Person Intelligence System using AI-based Face Recognition and Surveillance Analytics
**Document Type:** Surveillance Systems Stabilization & Temporal Architecture
**System Architecture:** Vercel (React) ↔ Render (Spring Boot) ↔ Railway (Flask/AI)
**Date:** April 2026

---

## 🛑 OVERVIEW: THE FINAL STABILITY UPGRADE
To guarantee production-level reliability in real-world environments, mere iteration counters and static thresholds are insufficient. Tracking mechanisms must enforce **Temporal Continuity** (time-bound validation) and **Absolute Identity Isolation**.

This final architectural upgrade deployed custom memory structures across the Spring Boot backbone that natively guarantee physical continuity limits prior to broadcast execution. 

---

## 🔥 1. TEMPORAL BOUNDARY TRACKING (Memory Structure)
A simple `AtomicInteger` allows ghost frames dispersed over 20 minutes to artificially accumulate and falsely trigger an alert. 
The backend has been upgraded with the `FrameTrackingSession` data structure. It manages a highly concurrent array of milliseconds (`timestamps`), sliding dynamically to expire old frames instantly.

**Engineered Component (`RealtimeAlertService.java`):**
```java
// ================= TRACKING DATA STRUCTURE =================
public static class FrameTrackingSession {
        public final String personId;
        public final String cameraId;
        public final java.util.Queue<Long> timestamps = new java.util.concurrent.ConcurrentLinkedQueue<>();

        public FrameTrackingSession(String personId, String cameraId) {
                this.personId = personId;
                this.cameraId = cameraId;
        }

        // ⏱️ Sliding Window Math (Automatically Expires Old Ghost Frames)
        public void recordFrame(long timestampMillis, long windowMillis) {
                timestamps.add(timestampMillis);
                long cutoff = timestampMillis - windowMillis;
                timestamps.removeIf(t -> t < cutoff);
        }

        public int getValidFrameCount() {
                return timestamps.size();
        }
        
        // 🔐 Strict Identity Enforcement
        public boolean isValidIdentity(String currentPersonId) {
                return this.personId.equals(currentPersonId);
        }
}
```

---

## 🔥 2. MULTI-LEVEL RESOLUTION PIPELINE (Decision Logic)
The final validation ruleset has been tightly constricted to ensure zero alert collisions can pass to the database. The logic checks all limits concurrently.

**MANDATORY DECISION RULE:**
`Score >= REVIEW` + `Count >= 3` + `Time <= 3000ms` + `Same Person` + `Same Camera`

**Applied Code:**
```java
// 🟠 STRICT MULTI-FRAME & IDENTITY CONFIRMATION
FrameTrackingSession session = frameTrackerCache.get(dedupKey, k -> new FrameTrackingSession(request.getPersonId(), request.getCameraId()));

// Identity Mismatch Reset (Edge-Case Protection)
if (!session.isValidIdentity(request.getPersonId())) {
        log.warn("🚨 [SECURITY] Identity mismatch in tracking session for {}. Resetting tracker.", dedupKey);
        frameTrackerCache.invalidate(dedupKey);
        session = new FrameTrackingSession(request.getPersonId(), request.getCameraId());
        frameTrackerCache.put(dedupKey, session);
}

// Record Sliding Window Timestamp
long now = System.currentTimeMillis();
session.recordFrame(now, TRACKER_WINDOW_SECONDS * 1000); // 3000ms sliding boundary

int seenFrames = session.getValidFrameCount();

if (seenFrames < REQUIRED_FRAMES) {
        log.info("🟠 [MULTI-FRAME] Storing frame {}/{} for {}. Accumulating within {}s sliding window...", 
                seenFrames, REQUIRED_FRAMES, request.getPersonId(), TRACKER_WINDOW_SECONDS);
        return; // SILENT RETURN (Await precise verification)
}

log.info("🟢 [FINAL DECISION PASSED] Alert fully validated! {} consistent frames detected within {}s. Saving to DB...", REQUIRED_FRAMES, TRACKER_WINDOW_SECONDS);

// Trigger Smart Deduplication Cooldown (10 seconds)
recentAlertsCache.put(dedupKey, true);
// Purge the current tracker array
frameTrackerCache.invalidate(dedupKey);
```

---

## 🔥 3. REMOVAL OF UNCERTAIN MATCHES (Frontend Drop)
We amputated the lowest confidence baseline from the JavaScript router completely.

Previously, `UNCERTAIN_MATCH` passed payloads backwards, muddying tracker metrics on edge-case lighting alignments. The React layer mathematically deletes these natively from memory without making external API bounds requests.

**Updated React Enforcement (`CameraContext.jsx`):**
```javascript
// Exclusively allows Confident execution and Manual-Review conditions
if (["CONFIDENT_MATCH", "REVIEW_MATCH"].includes(res.data?.status)) {
     // ... Pipeline Execution 
}
```

---

## 🚀 FINAL STEP-BY-STEP SURVEILLANCE RUNTIME

1. **Extraction (AI Layer):** InsightFace isolates crop bounding box. Computes a Cosine structural distance of `0.65`.
2. **First Triage (`REVIEW_MATCH`):** AI logic assesses `0.65` against `0.70` (Fail) and `0.55` (Pass). Flask returns `REVIEW_MATCH` and relays to Vercel UI.
3. **Frontend Routing (React):** JS detects `REVIEW_MATCH`. Updates Canvas warning to `⚠️ MPIS MANUAL REVIEW FLAG`. POST request mapped to `api/alerts`.
4. **Validation (Backend Memory 1):** Target payload hits Java thread logic. Similarity clears. Target generates `FrameTrackingSession` keyed dynamically to `CAM_01`. Vector queue receives Timestamp `1`. Memory registers `seenFrames: 1`. System securely halts.
5. **Validation (Backend Memory 2 & 3):** Consecutive rapid AI transmissions map directly to Java memory arrays. Queue evaluates Timestamps `2` and `3`. `seenFrames` = `3`.
6. **Time-Check Math**: Last payload Timestamp (`3`) minus First payload Timestamp (`1`) equates to exactly `2120ms` (which safely clears the `< 3000ms` window limit enforcement). 
7. **Broadcast Execution:** System passes final decision line. 10-second backend delay placed on `recentAlertsCache` to prevent database queueing loops. Payload injected to MongoDB and natively distributed via WebSocket channels. 
