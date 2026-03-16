package com.mpsystem.backend.controller;

import com.mpsystem.backend.model.EvidenceHash;
import com.mpsystem.backend.repository.EvidenceHashRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/evidence")
@RequiredArgsConstructor
public class EvidenceQueryController {

    private final EvidenceHashRepository evidenceHashRepository;

    /**
     * Fetch blockchain-ready evidence hash for an alert
     */
    @GetMapping("/{alertId}")
    public Optional<EvidenceHash> getEvidenceByAlertId(
            @PathVariable String alertId
    ) {
        return evidenceHashRepository.findByAlertId(alertId);
    }
}
