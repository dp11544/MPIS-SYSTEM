package com.mpsystem.backend.controller;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AlertQueryController {

    private final AlertRepository alertRepository;

    /**
     * Latest alerts (dashboard view)
     */
    @GetMapping("/latest")
    public List<Alert> getLatestAlerts() {

        log.info("Fetching latest alerts");

        List<Alert> alerts = alertRepository.findTop50ByOrderByDetectedAtDesc();

        if (alerts.isEmpty()) {
            log.warn("No alerts found");
        }

        return alerts;
    }

    /**
     * Alerts for a specific person (investigation view)
     */
    @GetMapping("/person/{personId}")
    public List<Alert> getAlertsByPerson(@PathVariable String personId) {

        // 🔴 VALIDATION
        if (personId == null || personId.trim().isEmpty()) {
            log.warn("Invalid personId received");
            return Collections.emptyList();
        }

        log.info("Fetching alerts for personId={}", personId);

        List<Alert> alerts =
                alertRepository.findTop100ByPersonIdOrderByDetectedAtDesc(personId);

        if (alerts.isEmpty()) {
            log.warn("No alerts found for personId={}", personId);
        }

        return alerts;
    }
}