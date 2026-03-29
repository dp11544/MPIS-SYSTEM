package com.mpsystem.backend.controller;

import com.mpsystem.backend.dto.ForensicMatchRequest;
import com.mpsystem.backend.dto.ForensicMatchResponse;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.service.FaceMatchService;
import com.mpsystem.backend.service.MatchResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/forensic")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ForensicController {

    private final FaceMatchService faceMatchService;

    // 🔥 Keep threshold realistic
    private static final double MATCH_THRESHOLD = 0.65;

    @PostMapping("/match")
    public ResponseEntity<ForensicMatchResponse> matchEmbedding(
            @RequestBody ForensicMatchRequest request) {

        // 🔴 HARD VALIDATION
        if (request == null || request.getEmbedding() == null || request.getEmbedding().isEmpty()) {

            log.warn("Invalid forensic request received");

            return ResponseEntity.badRequest().body(
                ForensicMatchResponse.builder()
                        .status("INVALID_INPUT")
                        .matchedPerson(null)
                        .similarity(0.0)
                        .caseId(null)
                        .confidenceLevel(null)
                        .build()
            );
        }

        try {
            log.info("Processing forensic match. Embedding size: {}", request.getEmbedding().size());

            // 🔥 Find match
            MatchResult result = faceMatchService.findBestMatch(request.getEmbedding());

            if (result == null) {
                log.error("MatchResult is null");

                return ResponseEntity.internalServerError().body(
                    ForensicMatchResponse.builder()
                            .status("ERROR")
                            .matchedPerson(null)
                            .similarity(0.0)
                            .caseId(null)
                            .confidenceLevel(null)
                            .build()
                );
            }

            double similarity = result.getSimilarity();
            ConfidenceLevel confidence = faceMatchService.calculateConfidence(similarity);

            boolean isMatch = result.isMatch() && similarity >= MATCH_THRESHOLD;

            // ✅ MATCH FOUND
            if (isMatch && result.getPerson() != null) {

                log.info("MATCH FOUND → {} | Similarity: {}",
                        result.getPerson().getName(), similarity);

                return ResponseEntity.ok(
                    ForensicMatchResponse.builder()
                            .status("MATCH_FOUND")
                            .matchedPerson(result.getPerson().getName())
                            .similarity(similarity)
                            .caseId(result.getPerson().getId())
                            .confidenceLevel(confidence.name())
                            .build()
                );
            }

            // ❌ NO MATCH
            log.info("NO MATCH → Highest similarity: {}", similarity);

            return ResponseEntity.ok(
                ForensicMatchResponse.builder()
                        .status("NO_MATCH")
                        .matchedPerson(null)
                        .similarity(similarity)
                        .caseId(null)
                        .confidenceLevel(confidence.name())
                        .build()
            );

        } catch (Exception e) {

            log.error("Forensic matching failed: {}", e.getMessage(), e);

            return ResponseEntity.internalServerError().body(
                ForensicMatchResponse.builder()
                        .status("ERROR")
                        .matchedPerson(null)
                        .similarity(0.0)
                        .caseId(null)
                        .confidenceLevel(null)
                        .build()
            );
        }
    }
}