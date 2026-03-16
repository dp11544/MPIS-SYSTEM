package com.mpsystem.backend.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.util.List;
import java.util.Map;

@Service
public class FaceEmbeddingService {

    @Value("${ai.engine.base-url:http://localhost:5000}")
    private String aiEngineBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Calls Python AI Engine to extract face embedding.
     */
    @SuppressWarnings("unchecked")
    public List<Double> generateEmbedding(File imageFile) {

        String url = aiEngineBaseUrl + "/extract-embedding";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new FileSystemResource(imageFile));

        HttpEntity<MultiValueMap<String, Object>> requestEntity =
                new HttpEntity<>(body, headers);

        ResponseEntity<Map<String, Object>> response =
                restTemplate.postForEntity(url, requestEntity, (Class<Map<String, Object>>)(Class<?>)Map.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException(
                    "AI Engine failed with status: " + response.getStatusCode()
            );
        }

        Map<String, Object> responseBody = response.getBody();

        if (responseBody == null || !responseBody.containsKey("embedding")) {
            throw new RuntimeException("Invalid response from AI Engine");
        }

        return (List<Double>) responseBody.get("embedding");
    }
}
