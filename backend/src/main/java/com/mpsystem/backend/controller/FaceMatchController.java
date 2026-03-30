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

@RestController
@RequestMapping("/api/forensic")
@CrossOrigin(origins = "*")
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
                        Map.of("error", "Image file is empty")
                );
            }

            // 🔥 CALL AI ENGINE
            Map<String, Object> aiResponse = aiClientService.matchFace(file);

            // 🔴 SAFETY CHECK
            if (aiResponse == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                        Map.of("error", "AI returned null response")
                );
            }

            // 🔥 DEBUG LOG (VERY IMPORTANT)
            System.out.println("🔥 AI RESPONSE: " + aiResponse);

            // 🔥 SAFE EXTRACTION
            String personId = aiResponse.get("personId") != null
                    ? aiResponse.get("personId").toString()
                    : null;

            String personName = aiResponse.get("personName") != null
                    ? aiResponse.get("personName").toString()
                    : "Unknown";

            Double similarity = 0.0;
            if (aiResponse.get("similarity") instanceof Number) {
                similarity = ((Number) aiResponse.get("similarity")).doubleValue();
            }

            // 🔥 SAVE ALERT (ONLY IF VALID MATCH DATA EXISTS)
            if (personId != null && similarity > 0) {

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

            // ✅ RETURN AI RESPONSE DIRECTLY
            return ResponseEntity.ok(aiResponse);

        } catch (Exception e) {

            // 🔥 PRINT REAL ERROR IN LOGS
            e.printStackTrace();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of(
                            "error", "Match failed",
                            "message", e.getMessage()
                    )
            );
        }
    }

    // 🔥 CONFIDENCE LOGIC
    private ConfidenceLevel mapConfidence(Double similarity) {

        if (similarity == null) return ConfidenceLevel.LOW;

        if (similarity >= 0.75) return ConfidenceLevel.HIGH;
        if (similarity >= 0.5) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }
}