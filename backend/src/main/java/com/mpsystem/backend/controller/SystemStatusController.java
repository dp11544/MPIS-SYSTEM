package com.mpsystem.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemStatusController {

    // 🔥 FIXED PROPERTY (matches YAML)
    @Value("${mpis.ai.engine-url}")
    private String aiEngineUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/ai-status")
    public ResponseEntity<Map<String, Object>> getAiEngineStatus() {

        Map<String, Object> result = new HashMap<>();

        try {
            long start = System.currentTimeMillis();

            ResponseEntity<Map> aiResponse = restTemplate.getForEntity(
                    aiEngineUrl + "/health",
                    Map.class
            );

            long latencyMs = System.currentTimeMillis() - start;

            result.put("online", true);
            result.put("latencyMs", latencyMs);
            result.put("details", aiResponse.getBody());

        } catch (Exception e) {
            result.put("online", false);
            result.put("latencyMs", null);
            result.put("error", "AI Engine unreachable: " + e.getMessage());
        }

        return ResponseEntity.ok(result);
    }
}