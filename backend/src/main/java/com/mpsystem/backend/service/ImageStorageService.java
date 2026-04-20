package com.mpsystem.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class ImageStorageService {

    private final Cloudinary cloudinary;

    @Autowired
    public ImageStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Stores a Base64 image payload PERMANENTLY to Cloudinary and returns the secure HTTPS URL.
     * Guaranteed to survive ephemeral Render restarts.
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

            String fileName = UUID.randomUUID().toString();
            
            log.info("☁️ Uploading evidence image to Cloudinary... ({} bytes)", decodedBytes.length);

            // 🔥 PERMANENT CLOUDINARY UPLOAD
            Map uploadResult = cloudinary.uploader().upload(
                    decodedBytes,
                    ObjectUtils.asMap(
                            "folder", "mpis/evidence",
                            "public_id", fileName
                    )
            );

            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("✅ Successfully saved permanent evidence image to Cloudinary: {}", secureUrl);
            
            return secureUrl;

        } catch (Exception e) {
            log.error("💥 Failed to store evidence image to Cloudinary", e);
            return null;
        }
    }
}
