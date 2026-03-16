package com.mpsystem.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackEvent {

    private String alertId;
    private String cameraId;
    private Instant detectedAt;
}
