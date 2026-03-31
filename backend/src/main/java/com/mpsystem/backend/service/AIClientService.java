package com.mpsystem.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
@Slf4j
public class AIClientService {

    private final RestTemplate restTemplate;

    @Value("${mpis.ai.engine-url}")
    private String aiEngineUrl;

    public AIClientService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> matchFace(MultipartFile file) {

        try {
            String url = aiEngineUrl + "/match";

            log.info("🔥 Calling AI MATCH: {}", url);

            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", resource);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            Map<String, Object> res = response.getBody();

            log.info("🔥 AI RAW RESPONSE: {}", res);

            // 🔴 SAFETY: null check
            if (res == null) {
                return Map.of(
                        "status", "ERROR",
                        "message", "Empty AI response"
                );
            }

            // 🔴 SAFETY: AI error format
            if (res.containsKey("error")) {
                return Map.of(
                        "status", "ERROR",
                        "message", String.valueOf(res.get("error")),
                        "raw", res
                );
            }

            // 🔴 SAFETY: missing status → normalize
            if (!res.containsKey("status")) {
                return Map.of(
                        "status", "ERROR",
                        "message", "Invalid AI response",
                        "raw", res
                );
            }

            // ✅ FINAL SAFE RETURN
            return res;

        } catch (Exception e) {

            log.error("❌ AI MATCH FAILED", e);

            return Map.of(
                    "status", "ERROR",
                    "message", "AI failed: " + e.getMessage()
            );
        }
    }
}