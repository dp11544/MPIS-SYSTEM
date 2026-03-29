package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends MongoRepository<Alert, String> {

    // ✅ Deduplication
    boolean existsByPersonIdAndDetectedAtAfter(String personId, LocalDateTime time);

    // ✅ Dashboard (latest alerts)
    List<Alert> findTop50ByOrderByDetectedAtDesc();

    // ✅ CCTV deduplication (latest per camera)
    Optional<Alert> findTopByPersonIdAndCameraIdOrderByDetectedAtDesc(
            String personId,
            String cameraId
    );

    // ✅ Investigation (ALL alerts for person)
    List<Alert> findByPersonIdOrderByDetectedAtDesc(String personId);

    // 🔥 IMPORTANT (you were missing this for controller)
    List<Alert> findTop100ByPersonIdOrderByDetectedAtDesc(String personId);

    // ✅ Analytics (today count)
    long countByDetectedAtAfter(LocalDateTime time);

    // ❌ Avoid using this in loops (heavy)
    List<Alert> findByDetectedAtBetween(LocalDateTime start, LocalDateTime end);

    // 🔥 OPTIMIZED analytics (USE THIS)
    long countByDetectedAtBetween(LocalDateTime start, LocalDateTime end);
}