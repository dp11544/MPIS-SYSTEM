package com.mpsystem.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@Service
@Slf4j
public class ImageStorageService {

    @Value("${mpis.storage.evidence-dir:uploads/evidence}")
    private String evidenceDir;
    
    // Configurable base URL mapped to WebMvcConfigurer for serving static files
    @Value("${mpis.storage.base-url:/uploads/evidence}")
    private String baseUrl;

    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(evidenceDir);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
                log.info("📁 Created evidence storage directory at {}", path.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("💥 Failed to create evidence directory: {}", evidenceDir, e);
        }
    }

    /**
     * Stores a Base64 image payload to disk and returns the HTTP URL.
     */
    public String storeEvidenceImage(String base64Image) {
        if (base64Image == null || base64Image.isEmpty()) {
            return null;
        }

        // 🧠 BASE64 MEMORY SAFETY FIX: Pre-validation to prevent OutOfMemory errors
        if (base64Image.length() > 5_000_000) { // Limit strictly to ~5MB payload string lengths
            log.warn("⚠️ [MEMORY SAFETY] Rejecting massive base64 payload (Size: {} chars, > 5MB limits)", base64Image.length());
            return null;
        }

        try {
            // Strip data URL prefixes if they exist
            String[] parts = base64Image.split(",");
            String base64Data = parts.length > 1 ? parts[1] : parts[0];

            byte[] decodedBytes = java.util.Base64.getDecoder().decode(base64Data);
            
            // 📁 FILE SYSTEM SCALING FIX: Time-based partitioning
            String datePartition = java.time.LocalDate.now().toString(); 
            Path partitionPath = Paths.get(evidenceDir, datePartition);
            
            if (!Files.exists(partitionPath)) {
                Files.createDirectories(partitionPath);
            }

            String fileName = UUID.randomUUID().toString() + ".jpg";
            Path filePath = partitionPath.resolve(fileName);

            try (FileOutputStream fos = new FileOutputStream(filePath.toFile())) {
                fos.write(decodedBytes);
            }

            log.info("💾 Saved partitioned evidence image to disk: {}/{}", datePartition, fileName);
            
            String fileUrlPath = datePartition + "/" + fileName;
            return baseUrl.endsWith("/") ? baseUrl + fileUrlPath : baseUrl + "/" + fileUrlPath;

        } catch (Exception e) {
            log.error("💥 Failed to store evidence image locally", e);
            return null;
        }
    }
}
