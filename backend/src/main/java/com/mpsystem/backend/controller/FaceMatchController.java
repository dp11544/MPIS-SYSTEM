package com.mpsystem.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.mpsystem.backend.service.AIClientService;
import com.mpsystem.backend.service.WebSocketBroadcastService;
import com.mpsystem.backend.repository.AlertRepository;
import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.model.AlertState;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@RestController
@RequestMapping("/api/forensic")
@CrossOrigin(origins = "*")
@Slf4j
public class FaceMatchController {

    private final AIClientService aiClientService;
    private final AlertRepository alertRepository;
    private final WebSocketBroadcastService webSocketBroadcastService;

    public FaceMatchController(
            AIClientService aiClientService,
            AlertRepository alertRepository,
            WebSocketBroadcastService webSocketBroadcastService) {

        this.aiClientService = aiClientService;
        this.alertRepository = alertRepository;
        this.webSocketBroadcastService = webSocketBroadcastService;
    }

    @PostMapping(value = "/match-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> matchFace(@RequestParam("file") MultipartFile file) {

        try {

            // ================= VALIDATION =================
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of("status", "ERROR", "message", "Empty file")
                );
            }

            if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest().body(
                        Map.of("status", "ERROR", "message", "Only image files allowed")
                );
            }

            log.info("🔥 REQUEST RECEIVED: {}", file.getOriginalFilename());

            // ================= CALL AI =================
            Map<String, Object> res = aiClientService.matchFace(file);

            log.info("🔥 AI RESPONSE: {}", res);

            if (res == null || !res.containsKey("status")) {
                return ResponseEntity.internalServerError().body(
                        Map.of("status", "ERROR", "message", "Invalid AI response")
                );
            }

            String status = String.valueOf(res.get("status"));

            // ================= 🔥 ALERT CREATION =================
            if ("CONFIDENT_MATCH".equals(status)) {

                try {
                    double similarity = res.get("similarity") != null
                            ? Double.parseDouble(res.get("similarity").toString())
                            : 0.0;

                    ConfidenceLevel confidenceLevel =
                            similarity >= 0.8 ? ConfidenceLevel.HIGH :
                            similarity >= 0.6 ? ConfidenceLevel.MEDIUM :
                            ConfidenceLevel.LOW;

                    Alert alert = new Alert(
                            (String) res.get("personId"),
                            (String) res.get("personName"),
                            similarity,
                            confidenceLevel,
                            "CCTV",
                            "LIVE_CAM",
                            "v1",
                            "FaceNet",
                            AlertState.DETECTED
                    );

                    Alert saved = alertRepository.save(alert);

                    log.info("✅ ALERT SAVED: {}", saved.getId());

                    webSocketBroadcastService.broadcastAlert(saved);

                } catch (Exception e) {
                    log.error("❌ ALERT CREATION FAILED", e);
                }
            }

            // ================= RESPONSE =================
            switch (status) {
                case "CONFIDENT_MATCH":
                case "NO_MATCH":
                case "NO_FACE":
                case "ERROR":
                    return ResponseEntity.ok(res);

                default:
                    log.warn("⚠️ UNKNOWN AI STATUS: {}", status);
                    return ResponseEntity.internalServerError().body(
                            Map.of(
                                    "status", "ERROR",
                                    "message", "Unknown AI status",
                                    "raw", res
                            )
                    );
            }

        } catch (Exception e) {

            log.error("❌ CONTROLLER ERROR", e);

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "status", "ERROR",
                            "message", "Controller failed: " + e.getMessage()
                    )
            );
        }
    }
}