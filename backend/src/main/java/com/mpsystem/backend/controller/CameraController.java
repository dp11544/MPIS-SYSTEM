package com.mpsystem.backend.controller;

import com.mpsystem.backend.dto.CameraResponse;
import com.mpsystem.backend.model.Camera;
import com.mpsystem.backend.service.CameraService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cameras")
@RequiredArgsConstructor
public class CameraController {

    private final CameraService cameraService;

    /**
     * Get all cameras for map display.
     * Returns cameraId, name, location, latitude, longitude, status.
     */
    @GetMapping
    public ResponseEntity<List<CameraResponse>> getAllCameras() {
        List<Camera> cameras = cameraService.getAllCameras();
        
        List<CameraResponse> response = cameras.stream()
                .map(cam -> CameraResponse.builder()
                        .cameraId(cam.getCameraId())
                        .name(cam.getName() != null ? cam.getName() : cam.getLocation())
                        .location(cam.getLocation())
                        .latitude(cam.getLatitude())
                        .longitude(cam.getLongitude())
                        .status(cam.getStatus() != null ? cam.getStatus().name() : "OFFLINE")
                        .build())
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Camera registration + heartbeat endpoint.
     */
    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(@RequestBody Map<String, Object> request) {

        String cameraId = (String) request.get("cameraId");
        String name = (String) request.get("name");
        String location = (String) request.get("location");
        String zone = (String) request.get("zone");
        String description = (String) request.get("description");
        Double latitude = request.get("latitude") != null ? ((Number) request.get("latitude")).doubleValue() : null;
        Double longitude = request.get("longitude") != null ? ((Number) request.get("longitude")).doubleValue() : null;

        if (cameraId == null || cameraId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        cameraService.registerOrHeartbeat(
                cameraId,
                name,
                location,
                zone,
                description,
                latitude,
                longitude);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/online")
    public ResponseEntity<Long> getOnlineCameras() {
        return ResponseEntity.ok(cameraService.getOnlineCameraCount());
    }
}
