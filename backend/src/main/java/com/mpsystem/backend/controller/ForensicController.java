package com.mpsystem.backend.controller;

import com.mpsystem.backend.dto.ForensicMatchRequest;
import com.mpsystem.backend.dto.ForensicMatchResponse;
import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.service.AIClientService;
import com.mpsystem.backend.service.FaceMatchService;
import com.mpsystem.backend.service.MatchResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/forensic")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ForensicController {

    private final FaceMatchService faceMatchService;
    private final AIClientService aiClientService;

    @Value("${mpis.ai.similarity-threshold:0.65}")
    private double MATCH_THRESHOLD;

    // 🔥 NEW ENDPOINT (THIS IS THE REAL FIX)
    @PostMapping(value = "/match-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ForensicMatchResponse> matchImage(
            @RequestParam("image") MultipartFile image) {

        try {

            if (image == null || image.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        buildResponse("INVALID_INPUT", null, 0.0, null, null)
                );
            }

            byte[] imageBytes = image.getBytes();

            // 🔥 STEP 1: GET EMBEDDING FROM AI
            List<Double> embedding =
                    aiClientService.getEmbedding(imageBytes, image.getOriginalFilename());

            if (embedding == null || embedding.size() != 512) {
                return ResponseEntity.internalServerError().body(
                        buildResponse("ERROR", null, 0.0, null, null)
                );
            }

            // 🔥 STEP 2: MATCH
            MatchResult result = faceMatchService.findBestMatch(embedding);

            double similarity = result.getSimilarity();
            ConfidenceLevel confidence =
                    faceMatchService.calculateConfidence(similarity);

            boolean isMatch =
                    result.isMatch() && similarity >= MATCH_THRESHOLD;

            if (isMatch && result.getPerson() != null) {

                log.info("MATCH FOUND → {} | Similarity: {}",
                        result.getPerson().getName(), similarity);

                return ResponseEntity.ok(
                        buildResponse(
                                "MATCH_FOUND",
                                result.getPerson().getName(),
                                similarity,
                                result.getPerson().getId(),
                                confidence.name()
                        )
                );
            }

            return ResponseEntity.ok(
                    buildResponse(
                            "NO_MATCH",
                            null,
                            similarity,
                            null,
                            confidence.name()
                    )
            );

        } catch (Exception e) {

            log.error("Image forensic match failed", e);

            return ResponseEntity.internalServerError().body(
                    buildResponse("ERROR", null, 0.0, null, null)
            );
        }
    }

    // 🔹 EXISTING (keep for internal use / testing)
    @PostMapping("/match")
    public ResponseEntity<ForensicMatchResponse> matchEmbedding(
            @RequestBody ForensicMatchRequest request) {

        if (request == null ||
            request.getEmbedding() == null ||
            request.getEmbedding().size() != 512) {

            return ResponseEntity.badRequest().body(
                    buildResponse("INVALID_INPUT", null, 0.0, null, null)
            );
        }

        try {

            MatchResult result =
                    faceMatchService.findBestMatch(request.getEmbedding());

            double similarity = result.getSimilarity();
            ConfidenceLevel confidence =
                    faceMatchService.calculateConfidence(similarity);

            boolean isMatch =
                    result.isMatch() && similarity >= MATCH_THRESHOLD;

            if (isMatch && result.getPerson() != null) {
                return ResponseEntity.ok(
                        buildResponse(
                                "MATCH_FOUND",
                                result.getPerson().getName(),
                                similarity,
                                result.getPerson().getId(),
                                confidence.name()
                        )
                );
            }

            return ResponseEntity.ok(
                    buildResponse(
                            "NO_MATCH",
                            null,
                            similarity,
                            null,
                            confidence.name()
                    )
            );

        } catch (Exception e) {

            log.error("Embedding match failed", e);

            return ResponseEntity.internalServerError().body(
                    buildResponse("ERROR", null, 0.0, null, null)
            );
        }
    }

    // 🔥 COMMON RESPONSE BUILDER
    private ForensicMatchResponse buildResponse(
            String status,
            String name,
            double similarity,
            String caseId,
            String confidence) {

        return ForensicMatchResponse.builder()
                .status(status)
                .matchedPerson(name)
                .similarity(similarity)
                .caseId(caseId)
                .confidenceLevel(confidence)
                .build();
    }
}