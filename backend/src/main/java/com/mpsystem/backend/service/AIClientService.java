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
    // 🔥 MATCH (FORENSIC SEARCH)
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
            body.add("file", resource); // 🔥 MUST BE "file"

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI Engine returned non-200");
            }

            Map<String, Object> responseBody = response.getBody();

            // 🔥 FIX 1: handle empty response
            if (responseBody == null) {
                throw new RuntimeException("Empty AI response");
            }

            // 🔥 FIX 2: handle AI errors
            if (responseBody.containsKey("error")) {
                throw new RuntimeException("AI Error: " + responseBody.get("error"));
            }

            log.info("✅ AI MATCH Response: {}", responseBody);

            return responseBody;

        } catch (Exception e) {
            log.error("❌ AI MATCH failed", e);
            throw new RuntimeException("Failed to call AI Engine: " + e.getMessage(), e);
        }
    }

    // =========================================================
    // 🔥 EMBEDDING (UPLOAD / REGISTRATION)
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
            body.add("file", resource); // 🔥 MUST BE "file"

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI Engine returned non-200");
            }

            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null || !responseBody.containsKey("embedding")) {
                throw new RuntimeException("Invalid embedding response: " + responseBody);
            }

            List<Double> embedding = (List<Double>) responseBody.get("embedding");

            if (embedding == null || embedding.size() != 512) {
                throw new RuntimeException("Invalid embedding size");
            }

            log.info("✅ Embedding extracted successfully");

            return embedding;

        } catch (Exception e) {
            log.error("❌ AI EMBEDDING failed", e);
            throw new RuntimeException("Embedding extraction failed: " + e.getMessage(), e);
        }
    }

    // =========================================================
    // 🔥 SAFE FILENAME
    // =========================================================
    private String safeFilename(MultipartFile file) {
        String name = file.getOriginalFilename();
        return (name == null || name.isBlank()) ? "image.jpg" : name;
    }
}