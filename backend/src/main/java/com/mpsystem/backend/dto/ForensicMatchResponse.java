package com.mpsystem.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for forensic matching results.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ForensicMatchResponse {
    
    private String status;          // MATCH_FOUND or NO_MATCH
    private String matchedPerson;   // Person name
    private double similarity;      // Similarity score (0.0 - 1.0)
    private String caseId;          // Person/Case ID
    private String confidenceLevel; // VERY_HIGH, HIGH, MEDIUM, LOW
}
