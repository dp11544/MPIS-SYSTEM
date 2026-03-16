package com.mpsystem.backend.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.repository.AlertRepository;
import com.mpsystem.backend.service.AIClientService;
import com.mpsystem.backend.service.FaceMatchService;
import com.mpsystem.backend.service.MatchResult;

@RestController
@RequestMapping("/api/match")
@CrossOrigin(origins = "*")
public class FaceMatchController {

        private final AIClientService aiClientService;
        private final FaceMatchService faceMatchService;
        private final AlertRepository alertRepository;

        public FaceMatchController(AIClientService aiClientService,
                        FaceMatchService faceMatchService,
                        AlertRepository alertRepository) {
                this.aiClientService = aiClientService;
                this.faceMatchService = faceMatchService;
                this.alertRepository = alertRepository;
        }

        @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public ResponseEntity<?> matchFace(
                        @RequestParam("image") MultipartFile image) throws Exception {

                if (image == null || image.isEmpty()) {
                        throw new IllegalArgumentException("Image file is empty");
                }

                // 🔥 Read bytes once
                byte[] imageBytes = image.getBytes();

                // 1️⃣ Generate embedding from AI Engine
                List<Double> embedding = aiClientService.getEmbedding(imageBytes, image.getOriginalFilename());

                // 2️⃣ Find best match
                MatchResult result = faceMatchService.findBestMatch(embedding);

                // 3️⃣ Calculate confidence level
                ConfidenceLevel confidence = faceMatchService.calculateConfidence(result.getSimilarity());

                // 4️⃣ If match found → ALERT DE-DUPLICATION + EXPLAINABILITY
                if (result.isMatch()) {

                        LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);

                        boolean alertExists = alertRepository.existsByPersonIdAndDetectedAtAfter(
                                        result.getPerson().getId(),
                                        tenMinutesAgo);

                        // Save alert ONLY if not duplicate
                        if (!alertExists) {
                                alertRepository.save(
                                                new Alert(
                                                                result.getPerson().getId(),
                                                                result.getPerson().getName(),
                                                                result.getSimilarity(),
                                                                confidence,
                                                                "UPLOAD",
                                                                "FaceEmbed-v1.0"));
                        }

                        return ResponseEntity.ok(
                                        new MatchResponse(
                                                        true,
                                                        result.getPerson().getId(),
                                                        result.getPerson().getName(),
                                                        result.getSimilarity(),
                                                        confidence));
                }

                // 5️⃣ No match
                return ResponseEntity.ok(
                                new MatchResponse(
                                                false,
                                                null,
                                                null,
                                                result.getSimilarity(),
                                                confidence));
        }
}
