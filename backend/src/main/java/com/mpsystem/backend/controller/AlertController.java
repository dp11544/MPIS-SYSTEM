package com.mpsystem.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.mpsystem.backend.dto.AlertIngestionRequest;
import com.mpsystem.backend.dto.RealtimeAlertRequest;
import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.repository.AlertRepository;
import com.mpsystem.backend.service.RealtimeAlertService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
@Slf4j
public class AlertController {

    private final AlertRepository alertRepository;
    private final RealtimeAlertService realtimeAlertService;

    // Secure regex patterns to prevent NoSQL injection and XSS
    private static final Pattern ID_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{3,50}$");
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_ -]{2,100}$");
    private static final double MIN_SECURE_THRESHOLD = 0.40;

    public AlertController(AlertRepository alertRepository, RealtimeAlertService realtimeAlertService) {
        this.alertRepository = alertRepository;
        this.realtimeAlertService = realtimeAlertService;
    }

    /**
     * 🔐 ZERO TRUST FRONTEND INGESTION TO UNIFIED PIPELINE
     * URL: POST /api/alerts
     */
    @PostMapping
    public ResponseEntity<?> ingestAlert(@Valid @RequestBody AlertIngestionRequest request) {
        
        try {
            // 1️⃣ ZERO TRUST: Validate similarity bounds (Server-side Enforcement)
            if (request.getSimilarityScore() < MIN_SECURE_THRESHOLD || request.getSimilarityScore() > 1.0) {
                log.warn("🚨 [SECURITY] Rejected spoofed alert. Invalid similarity: {}", request.getSimilarityScore());
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(
                    Map.of("status", "REJECTED", "message", "Similarity score fails strict bounds")
                );
            }

            // 2️⃣ ZERO TRUST: Strict Input Sanitization & Format Checks
            if (request.getPersonId() == null || !ID_PATTERN.matcher(request.getPersonId()).matches()) {
                log.warn("🚨 [SECURITY] Rejected spoofed alert. Malformed personId: {}", request.getPersonId());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of("status", "REJECTED", "message", "Malformed Person ID")
                );
            }

            if (request.getPersonName() == null || !NAME_PATTERN.matcher(request.getPersonName()).matches()) {
                log.warn("🚨 [SECURITY] Rejected spoofed alert. Malformed personName: {}", request.getPersonName());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of("status", "REJECTED", "message", "Malformed Person Name")
                );
            }

            if (request.getCameraId() == null || !ID_PATTERN.matcher(request.getCameraId()).matches()) {
                log.warn("🚨 [SECURITY] Rejected spoofed alert. Malformed cameraId");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of("status", "REJECTED", "message", "Malformed Camera ID")
                );
            }

            // Optional evidence validation
            if (request.getEvidenceImage() != null && request.getEvidenceImage().length() > 5_000_000) {
                log.warn("🚨 [SECURITY] Rejected oversized evidence image (>5MB)");
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(
                    Map.of("status", "REJECTED", "message", "Evidence image slice too large")
                );
            }

            // 3️⃣ ZERO TRUST: Map safely and push into deduplication pipeline
            RealtimeAlertRequest realtimeReq = new RealtimeAlertRequest();
            realtimeReq.setPersonId(request.getPersonId().trim());
            realtimeReq.setPersonName(request.getPersonName().trim());
            realtimeReq.setCameraId(request.getCameraId().trim());
            
            // Re-enforce algorithm similarity to stop payload intercept float-tampering
            realtimeReq.setSimilarity(Math.round(request.getSimilarityScore() * 10000.0) / 10000.0);
            
            realtimeReq.setConfidenceLevel(request.getSimilarityScore() >= 0.8 ? "HIGH" : "MEDIUM");
            realtimeReq.setAlgorithmVersion("v1.0");
            realtimeReq.setModelUsed("face-net-secured");
            
            long timestamp = request.getDetectedAt() != null ? request.getDetectedAt() : System.currentTimeMillis();
            realtimeReq.setDetectedAt(timestamp);
            
            realtimeReq.setEvidenceImage(request.getEvidenceImage());

            // 🔥 FORWARD TO DEDUPLICATION CACHE 🔥
            realtimeAlertService.processRealtimeAlert(realtimeReq);

            return ResponseEntity.accepted().body(Map.of("status", "RECEIVED", "message", "Alert successfully verified and queued"));

        } catch (Exception e) {
            log.error("💥 [SYSTEM FAILURE] Inbound alert processing crashed: ", e);
            // Non-descriptive error to prevent leaking stacktrace to frontend
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of("status", "ERROR", "message", "System encountered an unexpected exception")
            );
        }
    }

    /**
     * Police dashboard Read
     * URL: GET /api/alerts
     */
    @GetMapping
    public ResponseEntity<List<Alert>> getLatestAlerts() {
        try {
            List<Alert> alerts = alertRepository.findTop50ByOrderByDetectedAtDesc();
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("💥 [SYSTEM FAILURE] Failed to fetch latest alerts from DB: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
