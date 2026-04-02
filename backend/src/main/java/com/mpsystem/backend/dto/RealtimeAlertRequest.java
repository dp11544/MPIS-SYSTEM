package com.mpsystem.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RealtimeAlertRequest {

    @NotNull
    private String personId;

    @NotNull
    private String personName;

    @NotNull
    private String cameraId;

    private double similarity;

    private String confidenceLevel;

    private String algorithmVersion;

    private String modelUsed;

    @NotNull
    private Long detectedAt;

    private String evidenceImage;
}
