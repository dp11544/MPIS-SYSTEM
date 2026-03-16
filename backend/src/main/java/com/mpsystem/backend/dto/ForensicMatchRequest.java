package com.mpsystem.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for forensic matching.
 * Contains the embedding vector extracted from an image.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ForensicMatchRequest {
    private List<Double> embedding;
}
