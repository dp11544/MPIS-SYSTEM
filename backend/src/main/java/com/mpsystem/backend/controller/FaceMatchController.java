package com.mpsystem.backend.controller;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.repository.AlertRepository;
import com.mpsystem.backend.service.AIClientService;

@RestController
@RequestMapping("/api/match")
@CrossOrigin(origins = "*")
public class FaceMatchController {

    private final AIClientService aiClientService;
    private final AlertRepository alertRepository;

    public FaceMatchController(AIClientService aiClientService,
                               AlertRepository alertRepository) {
        this.aiClientService = aiClientService;
        this.alertRepository = alertRepository;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> matchFace(
            @RequestParam("file") MultipartFile file) {

        try {

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of("status", "ERROR", "message", "Image file is empty")
                );
            }

            // 🔥 CALL AI
            Map<String, Object> aiResponse = aiClientService.matchFace(file);

            if (aiResponse == null) {
                return ResponseEntity.internalServerError().body(
                        Map.of("status", "ERROR", "message", "Empty AI response")
                );
            }

            // 🔥 SAFE READ
            String status = aiResponse.get("status") != null
                    ? aiResponse.get("status").toString()
                    : "UNKNOWN";

            Double similarity = null;
            if (aiResponse.get("similarity") instanceof Number) {
                similarity = ((Number) aiResponse.get("similarity")).doubleValue();
            }

            // 🔥 NO FACE
            if ("NO_FACE".equalsIgnoreCase(status)) {
                return ResponseEntity.ok(aiResponse);
            }

            // 🔥 MATCH
            if ("CONFIDENT_MATCH".equalsIgnoreCase(status)) {

                String personId = aiResponse.get("personId") != null
                        ? aiResponse.get("personId").toString()
                        : null;

                String personName = aiResponse.get("personName") != null
                        ? aiResponse.get("personName").toString()
                        : "Unknown";

                if (personId != null) {

                    ConfidenceLevel confidence = mapConfidence(similarity);

                    LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);

                    boolean alertExists = alertRepository
                            .existsByPersonIdAndDetectedAtAfter(personId, tenMinutesAgo);

                    if (!alertExists) {
                        alertRepository.save(
                                new Alert(
                                        personId,
                                        personName,
                                        similarity != null ? similarity : 0.0,
                                        confidence,
                                        "UPLOAD",
                                        "AI-Match-v2"
                                )
                        );
                    }
                }
            }

            return ResponseEntity.ok(aiResponse);

        } catch (Exception e) {

            e.printStackTrace(); // 🔥 IMPORTANT FOR DEBUG

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "status", "ERROR",
                            "message", e.getMessage()
                    )
            );
        }
    }

    // 🔥 CONFIDENCE MAPPING
    private ConfidenceLevel mapConfidence(Double similarity) {

        if (similarity == null) return ConfidenceLevel.LOW;

        if (similarity >= 0.75) return ConfidenceLevel.HIGH;
        if (similarity >= 0.5) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }
}