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
    // 🔥 MATCH (FOR FORENSIC SEARCH)
    // =========================================================
    @SuppressWarnings("unchecked")
    public Map<String, Object> matchFace(MultipartFile file) {

        try {
            String url = aiEngineUrl + "/match";

            log.info("Calling AI Engine MATCH: {}", url);

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
            headers.setAccept(MediaType.parseMediaTypes("application/json"));

            HttpEntity<MultiValueMap<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI Engine returned non-200");
            }

            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null || !responseBody.containsKey("status")) {
                throw new RuntimeException("Invalid AI response: " + responseBody);
            }

            log.info("AI MATCH Response: {}", responseBody);

            return responseBody;

        } catch (Exception e) {
            log.error("AI MATCH call failed", e);
            throw new RuntimeException("Failed to call AI Engine: " + e.getMessage(), e);
        }
    }

    // =========================================================
    // 🔥 EMBEDDING (FOR UPLOAD / REGISTRATION)
    // =========================================================
    @SuppressWarnings("unchecked")
    public List<Double> extractEmbedding(MultipartFile file) {

        try {
            String url = aiEngineUrl + "/extract-embedding";

            log.info("Calling AI Engine EMBEDDING: {}", url);

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

            log.info("Embedding extracted successfully");

            return embedding;

        } catch (Exception e) {
            log.error("AI EMBEDDING call failed", e);
            throw new RuntimeException("Embedding extraction failed: " + e.getMessage(), e);
        }
    }

    // =========================================================
    // 🔥 SAFE FILENAME HELPER
    // =========================================================
    private String safeFilename(MultipartFile file) {
        String name = file.getOriginalFilename();
        return (name == null || name.isBlank()) ? "image.jpg" : name;
    }
}