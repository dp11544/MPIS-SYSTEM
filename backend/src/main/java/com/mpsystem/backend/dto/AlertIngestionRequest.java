package com.mpsystem.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AlertIngestionRequest {

    @NotBlank(message = "Person ID is required")
    private String personId;

    @NotBlank(message = "Person Name is required")
    private String personName;

    @NotBlank(message = "Camera ID is required")
    private String cameraId;

    @Min(value = 0, message = "Similarity score must be >= 0")
    @Max(value = 1, message = "Similarity score must be <= 1")
    private double similarityScore;

    @NotNull(message = "Timestamp is required")
    private Long detectedAt;
}
