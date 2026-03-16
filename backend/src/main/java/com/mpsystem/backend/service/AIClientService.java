package com.mpsystem.backend.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
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

            ByteArrayResource resource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", resource);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(url, request, (Class<Map<String, Object>>)(Class<?>)Map.class);

            return (List<Double>) response.getBody().get("embedding");

        } catch (org.springframework.web.client.HttpClientErrorException.BadRequest e) {
            if (e.getResponseBodyAsString().contains("No face detected")) {
                throw new com.mpsystem.backend.exception.FaceDetectionException("No face detected in the image");
            }
            throw new RuntimeException("AI Engine Bad Request: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to call AI Engine", e);
        }
    }
}
