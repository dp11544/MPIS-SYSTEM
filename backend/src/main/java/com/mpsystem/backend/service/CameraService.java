package com.mpsystem.backend.service;

import com.mpsystem.backend.model.Camera;
import com.mpsystem.backend.model.CameraStatus;
import com.mpsystem.backend.model.SystemAlert;
import com.mpsystem.backend.repository.CameraRepository;
import com.mpsystem.backend.repository.SystemAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CameraService {

        private static final String CAMERA_RECOVERED = "CAMERA_RECOVERED";

        private final CameraRepository cameraRepository;
        private final SystemAlertRepository systemAlertRepository;

        /**
         * Registers a camera if not present.
         * Otherwise updates heartbeat.
         */
        public void registerOrHeartbeat(
                        String cameraId,
                        String name,
                        String location,
                        String zone,
                        String description,
                        Double latitude,
                        Double longitude) {

                Camera existingCamera = cameraRepository.findByCameraId(cameraId).orElse(null);

                CameraStatus previousStatus = existingCamera != null ? existingCamera.getStatus() : null;

                Camera camera = (existingCamera != null)
                                ? existingCamera.toBuilder()
                                                .name(name != null ? name : existingCamera.getName())
                                                .latitude(latitude != null ? latitude : existingCamera.getLatitude())
                                                .longitude(longitude != null ? longitude : existingCamera.getLongitude())
                                                .lastHeartbeatAt(Instant.now())
                                                .status(CameraStatus.ONLINE)
                                                .build()
                                : Camera.builder()
                                                .cameraId(cameraId)
                                                .name(name != null ? name : location)
                                                .location(location)
                                                .zone(zone)
                                                .description(description)
                                                .latitude(latitude)
                                                .longitude(longitude)
                                                .status(CameraStatus.ONLINE)
                                                .lastHeartbeatAt(Instant.now())
                                                .build();

                Camera savedCamera = cameraRepository.save(camera);

                // 🔥 OFFLINE → ONLINE recovery detection
                if (previousStatus == CameraStatus.OFFLINE) {

                        boolean exists = systemAlertRepository.existsByTypeAndCameraId(
                                        CAMERA_RECOVERED,
                                        savedCamera.getCameraId());

                        if (!exists) {
                                SystemAlert recoveryAlert = new SystemAlert(
                                                CAMERA_RECOVERED,
                                                savedCamera.getCameraId(),
                                                savedCamera.getLocation(),
                                                savedCamera.getZone(),
                                                Instant.now());

                                systemAlertRepository.save(recoveryAlert);
                        }
                }
        }

        /**
         * Fetch camera metadata (used during alert enrichment).
         */
        public Camera getCameraOrThrow(String cameraId) {
                return cameraRepository.findByCameraId(cameraId)
                                .orElseThrow(() -> new RuntimeException("Camera not registered: " + cameraId));
        }

        public long getOnlineCameraCount() {
                return cameraRepository.countByStatus(CameraStatus.ONLINE);
        }

        /**
         * Fetch all cameras for map display.
         */
        public java.util.List<Camera> getAllCameras() {
                return cameraRepository.findAll();
        }
}
