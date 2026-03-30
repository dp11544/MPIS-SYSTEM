package com.mpsystem.backend.controller;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.repository.AlertRepository;
import com.mpsystem.backend.service.AIClientService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/forensic")
@CrossOrigin(origins = "*")
@Slf4j
public class FaceMatchController {

    private final AIClientService aiClientService;
    private final AlertRepository alertRepository;

    public FaceMatchController(AIClientService aiClientService,
                               AlertRepository alertRepository) {
        this.aiClientService = aiClientService;
        this.alertRepository = alertRepository;
    }

    @PostMapping(value = "/match-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> matchFace(
            @RequestParam("file") MultipartFile file) {

        try {

            // ✅ VALIDATION
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of("status", "ERROR", "message", "Image file is empty")
                );
            }

            // 🔥 CALL AI ENGINE
            Map<String, Object> aiResponse = aiClientService.matchFace(file);

            // 🔥 LOG RESPONSE (IMPORTANT)
            log.info("🔥 AI RESPONSE: {}", aiResponse);

            if (aiResponse == null) {
                return ResponseEntity.ok(
                        Map.of("status", "ERROR", "message", "AI returned null")
                );
            }

            String status = String.valueOf(aiResponse.get("status"));

            // 🔴 HANDLE NO FACE
            if ("NO_FACE".equals(status)) {
                return ResponseEntity.ok(aiResponse);
            }

            // 🔴 HANDLE NO MATCH
            if ("NO_MATCH".equals(status)) {
                return ResponseEntity.ok(aiResponse);
            }

            // 🔴 HANDLE MATCH
            if ("CONFIDENT_MATCH".equals(status)) {

                String personId = String.valueOf(aiResponse.get("personId"));
                String personName = String.valueOf(aiResponse.get("personName"));

                Double similarity = 0.0;
                if (aiResponse.get("similarity") instanceof Number) {
                    similarity = ((Number) aiResponse.get("similarity")).doubleValue();
                }

                ConfidenceLevel confidence = mapConfidence(similarity);

                LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);

                boolean exists = alertRepository
                        .existsByPersonIdAndDetectedAtAfter(personId, tenMinutesAgo);

                if (!exists) {
                    alertRepository.save(
                            new Alert(
                                    personId,
                                    personName,
                                    similarity,
                                    confidence,
                                    "UPLOAD",
                                    "AI-Match-vFinal"
                            )
                    );
                }
            }

            // ✅ ALWAYS RETURN AI RESPONSE
            return ResponseEntity.ok(aiResponse);

        } catch (Exception e) {

            log.error("❌ MATCH FAILED", e);

            return ResponseEntity.ok(
                    Map.of(
                            "status", "ERROR",
                            "message", "Match failed: " + e.getMessage()
                    )
            );
        }
    }

    private ConfidenceLevel mapConfidence(Double similarity) {

        if (similarity == null) return ConfidenceLevel.LOW;

        if (similarity >= 0.75) return ConfidenceLevel.HIGH;
        if (similarity >= 0.5) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }
}