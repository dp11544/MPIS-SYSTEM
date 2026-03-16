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

        // ================= CONFIG =================
        @Value("${mpis.ai.similarity-threshold}")
        private double MIN_SIMILARITY_THRESHOLD;

        @Value("${mpis.cache.dedup-window-seconds}")
        private long DEDUP_WINDOW_SECONDS;
        // ==========================================

        // ================= DEDUPLICATION CACHE =================
        // Thread-safe TTL cache: evicts alerts after configured window to prevent spam
        private com.github.benmanes.caffeine.cache.Cache<String, Boolean> recentAlertsCache;

        @PostConstruct
        protected void initCache() {
                this.recentAlertsCache = com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                                .expireAfterWrite(java.time.Duration.ofSeconds(DEDUP_WINDOW_SECONDS))
                                .maximumSize(10_000)
                                .build();
        }
        // =======================================================

        /**
         * Process CCTV alerts asynchronously.
         * SAFE for high-FPS CCTV streams.
         */
        @Async("alertExecutor")
        public void processRealtimeAlert(RealtimeAlertRequest request) {

                // 1️⃣ HARD THRESHOLD GATE
                if (request.getSimilarity() < MIN_SIMILARITY_THRESHOLD) {
                        log.debug(
                                        "Alert ignored (low similarity={} for personId={})",
                                        request.getSimilarity(),
                                        request.getPersonId());
                        return;
                }

                // 2️⃣ TEMPORAL DEDUPLICATION (Caffeine Cache - Thread Safe & Fast)
                String dedupKey = request.getPersonId() + "_" + request.getCameraId();
                if (recentAlertsCache.getIfPresent(dedupKey) != null) {
                        log.debug(
                                        "Duplicate alert ignored via Cache (personId={}, cameraId={})",
                                        request.getPersonId(),
                                        request.getCameraId());
                        return;
                }

                // Register alert in cache to block subsequent matches for 5 seconds
                recentAlertsCache.put(dedupKey, true);

                // 3️⃣ BUILD ALERT
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

                // 4️⃣ STORE ALERT
                Alert savedAlert = alertRepository.save(alert);

                // 🔐 BLOCKCHAIN-READY EVIDENCE HASHING
                evidenceHashService.generateEvidenceHash(savedAlert);

                log.info(
                                "Realtime alert stored (personId={}, cameraId={}, similarity={})",
                                savedAlert.getPersonId(),
                                savedAlert.getCameraId(),
                                savedAlert.getSimilarity());

                // 5️⃣ MULTI-CAMERA PERSON TRACKING
                personTrackingService.handleNewAlert(savedAlert);

                // 6️⃣ REAL-TIME WEBSOCKET PUSH (Asynchronous Thread)
                webSocketBroadcastService.broadcastAlert(savedAlert);
        }
}
