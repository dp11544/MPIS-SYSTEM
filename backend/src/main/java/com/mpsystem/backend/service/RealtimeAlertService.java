package com.mpsystem.backend.service;

import com.mpsystem.backend.dto.RealtimeAlertRequest;
import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.AlertState;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeAlertService {

        private final AlertRepository alertRepository;
        private final PersonTrackingService personTrackingService;
        private final EvidenceHashService evidenceHashService;
        private final WebSocketBroadcastService webSocketBroadcastService;
        private final ImageStorageService imageStorageService;

        // ================= CONFIG =================
        @Value("${mpis.ai.confident-threshold:0.75}")
        private double CONFIDENT_THRESHOLD;

        @Value("${mpis.ai.review-threshold:0.60}")
        private double REVIEW_THRESHOLD;

        @Value("${mpis.cache.dedup-window-seconds:10}")
        private long DEDUP_WINDOW_SECONDS;

        @Value("${mpis.ai.required-frames:1}")
        private int REQUIRED_FRAMES;

        @Value("${mpis.cache.tracker-window-seconds:3}")
        private long TRACKER_WINDOW_SECONDS;

        // 🛡️ LOAD CONTROL
        private final java.util.concurrent.atomic.AtomicInteger activeProcessingTasks = new java.util.concurrent.atomic.AtomicInteger(0);
        private static final int MAX_CONCURRENT_ALERTS = 50;
        // ==========================================

        // ================= TRACKING DATA STRUCTURE =================
        public static class FrameTrackingSession {
                public final String personId;
                public final String cameraId;
                public final java.util.Queue<Long> timestamps = new java.util.concurrent.ConcurrentLinkedQueue<>();

                public FrameTrackingSession(String personId, String cameraId) {
                        this.personId = personId;
                        this.cameraId = cameraId;
                }

                public void recordFrame(long timestampMillis, long windowMillis) {
                        timestamps.add(timestampMillis);
                        long cutoff = timestampMillis - windowMillis;
                        timestamps.removeIf(t -> t < cutoff);
                }

                public int getValidFrameCount() {
                        return timestamps.size();
                }
                
                public boolean isValidIdentity(String currentPersonId) {
                        return this.personId.equals(currentPersonId);
                }
        }

        // ================= DEDUPLICATION & TRACKING CACHES =================
        private com.github.benmanes.caffeine.cache.Cache<String, Boolean> recentAlertsCache;
        private com.github.benmanes.caffeine.cache.Cache<String, FrameTrackingSession> frameTrackerCache;

        @PostConstruct
        protected void initCache() {
                this.recentAlertsCache = com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                                .expireAfterWrite(java.time.Duration.ofSeconds(DEDUP_WINDOW_SECONDS))
                                .maximumSize(10_000)
                                .build();
                                
                this.frameTrackerCache = com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                                .expireAfterWrite(java.time.Duration.ofSeconds(TRACKER_WINDOW_SECONDS))
                                .maximumSize(10_000)
                                .build();
        }

        /**
         * Process CCTV alerts asynchronously with strict thread-pool safety and backpressure.
         */
        @Async("alertExecutor")
        public void processRealtimeAlert(RealtimeAlertRequest request) {

                // 🛡️ BACKPRESSURE / OVERLOAD PROTECTION
                if (activeProcessingTasks.get() >= MAX_CONCURRENT_ALERTS) {
                        log.warn("🚨 [BACKPRESSURE] Alert queue saturated ({} pending). Dropping trace for {}", MAX_CONCURRENT_ALERTS, request.getCameraId());
                        return;
                }

                activeProcessingTasks.incrementAndGet();

                try {
                        log.info("🔍 [BACKEND TRACE] Received alert mapped to: {} with similarity: {}", request.getPersonId(), request.getSimilarity());

                        // 🔴 ADAPTIVE THRESHOLD REJECTION
                        if (request.getSimilarity() < REVIEW_THRESHOLD) {
                                log.warn("🔴 [BACKEND DROPPED] Alert for {} rejected! Score {} < REVIEW_THRESHOLD of {}", 
                                        request.getPersonId(), request.getSimilarity(), REVIEW_THRESHOLD);
                                return;
                        }

                        // Determine Adaptive Confidence Level
                        String adaptiveLevel = request.getSimilarity() >= CONFIDENT_THRESHOLD ? "HIGH" : "MEDIUM";
                        request.setConfidenceLevel(adaptiveLevel);

                        // 🔴 SMART DEDUPLICATION SUPPRESSION
                        String dedupKey = request.getPersonId() + "_" + request.getCameraId();
                        if (recentAlertsCache.getIfPresent(dedupKey) != null) {
                                log.info("🟡 [BACKEND SKIPPED] Deduplication cooldown active for key {}. System waiting {}s before re-alerting.", dedupKey, DEDUP_WINDOW_SECONDS);
                                return;
                        }

                        // 🟠 STRICT MULTI-FRAME & IDENTITY CONFIRMATION
                        FrameTrackingSession session = frameTrackerCache.get(dedupKey, k -> new FrameTrackingSession(request.getPersonId(), request.getCameraId()));
                        
                        // Identity Mismatch Reset (Edge Case Protection)
                        if (!session.isValidIdentity(request.getPersonId())) {
                                log.warn("🚨 [SECURITY] Identity mismatch in tracking session for {}. Resetting tracker.", dedupKey);
                                frameTrackerCache.invalidate(dedupKey);
                                session = new FrameTrackingSession(request.getPersonId(), request.getCameraId());
                                frameTrackerCache.put(dedupKey, session);
                        }

                        // Record Sliding Window Timestamp
                        long now = System.currentTimeMillis();
                        session.recordFrame(now, TRACKER_WINDOW_SECONDS * 1000);
                        
                        int seenFrames = session.getValidFrameCount();
                        
                        if (seenFrames < REQUIRED_FRAMES) {
                                log.info("🟠 [MULTI-FRAME] Storing frame {}/{} for {}. Accumulating within {}s sliding window...", 
                                        seenFrames, REQUIRED_FRAMES, request.getPersonId(), TRACKER_WINDOW_SECONDS);
                                return; // SILENT RETURN (Wait for more frames)
                        }

                        log.info("🟢 [FINAL DECISION PASSED] Alert fully validated! {} consistent frames detected within {}s. Saving to DB...", REQUIRED_FRAMES, TRACKER_WINDOW_SECONDS);
                        // Trigger Dedup Cooldown Lock
                        recentAlertsCache.put(dedupKey, true);
                        // Clear Tracking Session
                        frameTrackerCache.invalidate(dedupKey);

                        try {
                                // 💾 PAYLOAD OPTIMIZATION: Extract heavy base64 to File System and fetch URL
                                String evidenceUrl = imageStorageService.storeEvidenceImage(request.getEvidenceImage());

                                Alert alert = new Alert(
                                                request.getPersonId(),
                                                request.getPersonName(),
                                                request.getSimilarity(),
                                                ConfidenceLevel.valueOf(request.getConfidenceLevel()),
                                                "CCTV",
                                                request.getCameraId(),
                                                request.getAlgorithmVersion(),
                                                request.getModelUsed(),
                                                AlertState.DETECTED);

                                // Guarantee the database ONLY receives the URL reference, never the bloated Base64 string natively
                                if (evidenceUrl != null) {
                                        alert.setEvidenceImagePath(evidenceUrl);
                                }

                                Alert savedAlert = alertRepository.save(alert);

                                try {
                                        evidenceHashService.generateEvidenceHash(savedAlert);
                                } catch (Exception hashErr) {
                                        log.error("⚠️ [SECURITY] Blockchain evidence hashing failed for {}", savedAlert.getId(), hashErr);
                                }

                                log.info("✅ Realtime alert secured (personId={}, cameraId={}, similarity={})",
                                                savedAlert.getPersonId(), savedAlert.getCameraId(), savedAlert.getSimilarity());

                                personTrackingService.handleNewAlert(savedAlert);
                                
                                // 🔌 WEBSOCKET FAIL-SAFE FIX
                                try {
                                        webSocketBroadcastService.broadcastAlert(savedAlert);
                                } catch (Exception wsErr) {
                                        log.warn("⚠️ [NETWORK] WebSocket broadcast failed, but DB saved successfully. Continuing flow.", wsErr);
                                }

                        } catch (Exception e) {
                                log.error("💥 [SYSTEM FAILURE] Database persistence failed for alert {}. Releasing cooldown lock.", request.getPersonId(), e);
                                recentAlertsCache.invalidate(dedupKey);
                        }
                } finally {
                        // Ensure async thread lock is always released safely
                        activeProcessingTasks.decrementAndGet();
                }
        }
}
