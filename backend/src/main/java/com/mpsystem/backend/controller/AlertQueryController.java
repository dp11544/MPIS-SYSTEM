package com.mpsystem.backend.controller;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertQueryController {

    private final AlertRepository alertRepository;

    /**
     * Latest alerts (dashboard view)
     */
    @GetMapping("/latest")
    public List<Alert> getLatestAlerts() {
        return alertRepository.findTop50ByOrderByDetectedAtDesc();
    }

    /**
     * Alerts for a specific person (investigation view)
     */
    @GetMapping("/person/{personId}")
    public List<Alert> getAlertsByPerson(@PathVariable String personId) {
        return alertRepository.findByPersonIdOrderByDetectedAtDesc(personId);
    }
}
