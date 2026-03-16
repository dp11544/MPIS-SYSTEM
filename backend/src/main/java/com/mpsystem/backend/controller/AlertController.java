package com.mpsystem.backend.controller;

import java.util.List;

import com.mpsystem.backend.dto.AlertIngestionRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.repository.AlertRepository;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    private final AlertRepository alertRepository;

    public AlertController(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    /**
     * AI ENGINE INGESTION
     * URL: POST /api/alerts
     */
    @PostMapping
    public ResponseEntity<Alert> ingestAlert(@Valid @RequestBody AlertIngestionRequest request) {
        // Map DTO to Entity to protect the database schema from arbitrary JSON field
        // injection
        Alert alert = new Alert(
                request.getPersonId(),
                request.getPersonName(),
                request.getSimilarityScore(),
                com.mpsystem.backend.model.ConfidenceLevel.HIGH, // Defaulting based on ingest logic
                "CCTV", // Defaulting source
                request.getCameraId(),
                "v1.0", // Defaulting algorithm
                "face-net", // Defaulting model
                com.mpsystem.backend.model.AlertState.DETECTED // Default state
        );

        Alert saved = alertRepository.save(alert);
        return ResponseEntity.ok(saved);
    }

    /**
     * Police dashboard
     * URL: GET /api/alerts
     */
    @GetMapping
    public ResponseEntity<List<Alert>> getLatestAlerts() {

        List<Alert> alerts = alertRepository.findTop50ByOrderByDetectedAtDesc();

        return ResponseEntity.ok(alerts);
    }
}
