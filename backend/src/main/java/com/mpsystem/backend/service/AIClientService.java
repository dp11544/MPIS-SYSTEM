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

import java.util.List;
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

    // =========================================================
    // 🔥 MATCH (NO CRASH VERSION)
    // =========================================================
    @SuppressWarnings("unchecked")
    public Map<String, Object> matchFace(MultipartFile file) {

        try {
            String url = aiEngineUrl + "/match";

            log.info("🔥 Calling AI MATCH: {}", url);

            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return safeFilename(file);
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

            Map<String, Object> responseBody = response.getBody();

            // 🔥 LOG EVERYTHING
            log.info("🔥 AI RAW RESPONSE: {}", responseBody);

            if (responseBody == null) {
                return Map.of(
                        "status", "ERROR",
                        "message", "Empty AI response"
                );
            }

            // 🔥 HANDLE AI ERROR RESPONSE
            if (responseBody.containsKey("error")) {
                return Map.of(
                        "status", "ERROR",
                        "message", String.valueOf(responseBody.get("error")),
                        "raw", responseBody
                );
            }

            // 🔥 ENSURE STATUS EXISTS
            if (!responseBody.containsKey("status")) {
                return Map.of(
                        "status", "ERROR",
                        "message", "Invalid AI response",
                        "raw", responseBody
                );
            }

            return responseBody;

        } catch (Exception e) {

            log.error("❌ AI MATCH FAILED", e);

            return Map.of(
                    "status", "ERROR",
                    "message", "AI Engine failed: " + e.getMessage()
            );
        }
    }

    // =========================================================
    // 🔥 EMBEDDING (NO CRASH VERSION)
    // =========================================================
    @SuppressWarnings("unchecked")
    public List<Double> extractEmbedding(MultipartFile file) {

        try {
            String url = aiEngineUrl + "/extract-embedding";

            log.info("🔥 Calling AI EMBEDDING: {}", url);

            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return safeFilename(file);
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

            Map<String, Object> responseBody = response.getBody();

            log.info("🔥 AI EMBEDDING RESPONSE: {}", responseBody);

            if (responseBody == null || !responseBody.containsKey("embedding")) {
                throw new RuntimeException("Invalid embedding response");
            }

            return (List<Double>) responseBody.get("embedding");

        } catch (Exception e) {
            log.error("❌ AI EMBEDDING FAILED", e);
            throw new RuntimeException("Embedding extraction failed");
        }
    }

    // =========================================================
    private String safeFilename(MultipartFile file) {
        String name = file.getOriginalFilename();
        return (name == null || name.isBlank()) ? "image.jpg" : name;
    }
}