package com.mpsystem.backend.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import lombok.extern.slf4j.Slf4j;

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
    public List<Double> getEmbedding(byte[] imageBytes, String filename) {

        try {
            String url = aiEngineUrl + "/extract-embedding";

            log.info("Calling AI Engine: {}", url);

            ByteArrayResource resource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", resource); // 🔥 MUST MATCH FLASK

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<MultiValueMap<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(url, request, Map.class);

            // 🔴 HARD CHECKS
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("AI Engine returned non-200");
            }

            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null) {
                throw new RuntimeException("Empty response from AI Engine");
            }

            if (!responseBody.containsKey("embedding")) {
                throw new RuntimeException("No embedding in response: " + responseBody);
            }

            List<Double> embedding = (List<Double>) responseBody.get("embedding");

            if (embedding == null || embedding.size() != 512) {
                throw new RuntimeException("Invalid embedding size: " + embedding);
            }

            log.info("Embedding received successfully (size={})", embedding.size());

            return embedding;

        } catch (org.springframework.web.client.HttpClientErrorException.BadRequest e) {

            String error = e.getResponseBodyAsString();
            log.error("AI Engine 400 error: {}", error);

            if (error.contains("No face detected")) {
                throw new com.mpsystem.backend.exception.FaceDetectionException(
                        "No face detected in the image"
                );
            }

            throw new RuntimeException("AI Engine Bad Request: " + error, e);

        } catch (Exception e) {

            log.error("AI Engine call failed", e);
            throw new RuntimeException("Failed to call AI Engine: " + e.getMessage(), e);
        }
    }
}