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

/**
 * Controller for forensic face matching operations.
 * Accepts pre-extracted embeddings and matches against the registry.
 */
@RestController
@RequestMapping("/api/forensic")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ForensicController {

    private final FaceMatchService faceMatchService;

    // Similarity threshold for considering a match
    private static final double MATCH_THRESHOLD = 0.65;

    /**
     * Match an embedding against the Missing Persons Registry.
     * 
     * @param request Contains the embedding vector
     * @return Match results including person info and similarity score
     */
    @PostMapping("/match")
    public ResponseEntity<ForensicMatchResponse> matchEmbedding(@RequestBody ForensicMatchRequest request) {
        
        log.info("Forensic match request received. Embedding size: {}", 
                request.getEmbedding() != null ? request.getEmbedding().size() : 0);

        if (request.getEmbedding() == null || request.getEmbedding().isEmpty()) {
            return ResponseEntity.badRequest().body(
                ForensicMatchResponse.builder()
                    .status("ERROR")
                    .matchedPerson(null)
                    .similarity(0.0)
                    .caseId(null)
                    .confidenceLevel(null)
                    .build()
            );
        }

        try {
            // Find best match using existing service
            MatchResult result = faceMatchService.findBestMatch(request.getEmbedding());
            
            // Calculate confidence level
            ConfidenceLevel confidence = faceMatchService.calculateConfidence(result.getSimilarity());
            
            // Determine if this is a match based on threshold
            boolean isMatch = result.isMatch() && result.getSimilarity() >= MATCH_THRESHOLD;
            
            if (isMatch && result.getPerson() != null) {
                log.info("Match found: {} with similarity {}", 
                        result.getPerson().getName(), result.getSimilarity());
                
                return ResponseEntity.ok(
                    ForensicMatchResponse.builder()
                        .status("MATCH_FOUND")
                        .matchedPerson(result.getPerson().getName())
                        .similarity(result.getSimilarity())
                        .caseId(result.getPerson().getId())
                        .confidenceLevel(confidence.name())
                        .build()
                );
            } else {
                log.info("No match found. Highest similarity: {}", result.getSimilarity());
                
                return ResponseEntity.ok(
                    ForensicMatchResponse.builder()
                        .status("NO_MATCH")
                        .matchedPerson(null)
                        .similarity(result.getSimilarity())
                        .caseId(null)
                        .confidenceLevel(confidence.name())
                        .build()
                );
            }
            
        } catch (Exception e) {
            log.error("Error during forensic matching: {}", e.getMessage(), e);
            
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
