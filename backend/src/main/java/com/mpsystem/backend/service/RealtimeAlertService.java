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
        @Value("${mpis.ai.similarity-threshold:0.40}")
        private double MIN_SIMILARITY_THRESHOLD;

        @Value("${mpis.cache.dedup-window-seconds:5}")
        private long DEDUP_WINDOW_SECONDS;

        // 🛡️ LOAD CONTROL
        private final java.util.concurrent.atomic.AtomicInteger activeProcessingTasks = new java.util.concurrent.atomic.AtomicInteger(0);
        private static final int MAX_CONCURRENT_ALERTS = 50;
        // ==========================================

        // ================= DEDUPLICATION CACHE =================
        private com.github.benmanes.caffeine.cache.Cache<String, Boolean> recentAlertsCache;

        @PostConstruct
        protected void initCache() {
                this.recentAlertsCache = com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                                .expireAfterWrite(java.time.Duration.ofSeconds(DEDUP_WINDOW_SECONDS))
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
                        if (request.getSimilarity() < MIN_SIMILARITY_THRESHOLD) return;

                        String dedupKey = request.getPersonId() + "_" + request.getCameraId();
                        if (recentAlertsCache.getIfPresent(dedupKey) != null) return;
                        recentAlertsCache.put(dedupKey, true);

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
