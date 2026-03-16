package com.mpsystem.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * SystemStatusController
 *
 * Provides a backend-proxied health check for the AI Engine.
 * The frontend calls this endpoint instead of calling the Flask
 * AI Engine directly (which would be blocked by CORS).
 *
 * GET /api/system/ai-status
 *  → Proxies GET http://localhost:5000/health
 *  → Returns { "online": true/false, "details": {...} }
 */
@RestController
@RequestMapping("/api/system")
public class SystemStatusController {

    private static final String AI_ENGINE_HEALTH_URL = "http://localhost:5000/health";

    private final RestTemplate restTemplate;

    public SystemStatusController() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Proxy health check for the CV2 AI Engine.
     * Always returns HTTP 200 — the "online" field in the body
     * tells the frontend whether the AI engine is reachable.
     */
    @GetMapping("/ai-status")
    public ResponseEntity<Map<String, Object>> getAiEngineStatus() {
        Map<String, Object> result = new HashMap<>();

        try {
            long start = System.currentTimeMillis();

            ResponseEntity<Map> aiResponse = restTemplate.getForEntity(
                AI_ENGINE_HEALTH_URL,
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

        // Always return 200 so the frontend interceptor doesn't trigger logout
        return ResponseEntity.ok(result);
    }
}
