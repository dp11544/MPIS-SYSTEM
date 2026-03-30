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

            // 🔥 CALL AI DIRECTLY
            Map<String, Object> aiResponse = aiClientService.matchFace(file);

            String status = (String) aiResponse.get("status");
            Double similarity = (Double) aiResponse.get("similarity");

            // 🔥 HANDLE NO FACE
            if ("NO_FACE".equals(status)) {
                return ResponseEntity.ok(aiResponse);
            }

            // 🔥 HANDLE MATCH
            if ("CONFIDENT_MATCH".equals(status)) {

                String personId = (String) aiResponse.get("personId");
                String personName = (String) aiResponse.get("personName");

                ConfidenceLevel confidence = mapConfidence(similarity);

                LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);

                boolean alertExists = alertRepository
                        .existsByPersonIdAndDetectedAtAfter(personId, tenMinutesAgo);

                if (!alertExists) {
                    alertRepository.save(
                            new Alert(
                                    personId,
                                    personName,
                                    similarity,
                                    confidence,
                                    "UPLOAD",
                                    "AI-Match-v2"
                            )
                    );
                }
            }

            return ResponseEntity.ok(aiResponse);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                    Map.of("status", "ERROR", "message", "Match failed")
            );
        }
    }

    // 🔥 SIMPLE CONFIDENCE MAPPING
    private ConfidenceLevel mapConfidence(Double similarity) {

        if (similarity == null) return ConfidenceLevel.LOW;

        if (similarity >= 0.75) return ConfidenceLevel.HIGH;
        if (similarity >= 0.5) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }
}