package com.mpsystem.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for camera data returned to frontend map display.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CameraResponse {

    private String cameraId;
    private String name;
    private String location;
    private Double latitude;
    private Double longitude;
    private String status;  // "ONLINE" or "OFFLINE"
}
