package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AlertRepository extends MongoRepository<Alert, String> {

    // Used for simple deduplication (existing logic)
    boolean existsByPersonIdAndDetectedAtAfter(
            String personId,
            LocalDateTime time
    );

    // Used for dashboard / recent alerts
    List<Alert> findTop50ByOrderByDetectedAtDesc();

    // Used for real-time CCTV temporal deduplication
    Optional<Alert> findTopByPersonIdAndCameraIdOrderByDetectedAtDesc(
            String personId,
            String cameraId
    );

    // ✅ NEW: Used for investigation (alerts by person)
    List<Alert> findByPersonIdOrderByDetectedAtDesc(String personId);

    // ✅ Analytics: Count alerts after a specific time (e.g., today)
    long countByDetectedAtAfter(LocalDateTime time);

    // ✅ Analytics: Get all alerts within date range
    List<Alert> findByDetectedAtBetween(LocalDateTime start, LocalDateTime end);
}
