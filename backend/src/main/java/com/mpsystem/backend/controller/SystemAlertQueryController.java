package com.mpsystem.backend.controller;

import com.mpsystem.backend.model.SystemAlert;
import com.mpsystem.backend.repository.SystemAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/system-alerts")
@RequiredArgsConstructor
public class SystemAlertQueryController {

    private final SystemAlertRepository systemAlertRepository;

    /**
     * Fetch all system alerts (camera offline / recovered).
     */
    @GetMapping
    public List<SystemAlert> getAllSystemAlerts() {
        return systemAlertRepository.findAll();
    }
}
