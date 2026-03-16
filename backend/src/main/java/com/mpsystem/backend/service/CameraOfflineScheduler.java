package com.mpsystem.backend.service;

import com.mpsystem.backend.model.Camera;
import com.mpsystem.backend.model.CameraStatus;
import com.mpsystem.backend.model.SystemAlert;
import com.mpsystem.backend.repository.CameraRepository;
import com.mpsystem.backend.repository.SystemAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class CameraOfflineScheduler {

    // If no heartbeat for 30 seconds → camera is OFFLINE
    private static final Duration OFFLINE_THRESHOLD = Duration.ofSeconds(30);

    private final CameraRepository cameraRepository;
    private final SystemAlertRepository systemAlertRepository;

    // Runs every 15 seconds
    @Scheduled(fixedDelay = 15000)
    public void markOfflineCameras() {

        Instant cutoffTime = Instant.now().minus(OFFLINE_THRESHOLD);

        List<Camera> onlineCameras =
                cameraRepository.findByStatus(CameraStatus.ONLINE);

        for (Camera camera : onlineCameras) {

            if (camera.getLastHeartbeatAt() == null ||
                camera.getLastHeartbeatAt().isBefore(cutoffTime)) {

                // 1️⃣ Mark camera OFFLINE
                Camera offlineCamera = camera.toBuilder()
                        .status(CameraStatus.OFFLINE)
                        .build();

                cameraRepository.save(offlineCamera);

                // 2️⃣ Generate OFFLINE system alert (DEDUPLICATED)
                boolean alreadyAlerted =
                        systemAlertRepository.existsByTypeAndCameraId(
                                "CAMERA_OFFLINE",
                                camera.getCameraId()
                        );

                if (!alreadyAlerted) {
                    SystemAlert alert = new SystemAlert(
                            "CAMERA_OFFLINE",
                            camera.getCameraId(),
                            camera.getLocation(),
                            camera.getZone()
                    );

                    systemAlertRepository.save(alert);
                }
            }
        }
    }
}
