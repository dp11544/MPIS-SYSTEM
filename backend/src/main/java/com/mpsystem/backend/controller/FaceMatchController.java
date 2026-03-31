package com.mpsystem.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.mpsystem.backend.service.AIClientService;

import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@RestController
@RequestMapping("/api/forensic")
@CrossOrigin(origins = "*")
@Slf4j
public class FaceMatchController {

    private final AIClientService aiClientService;

    public FaceMatchController(AIClientService aiClientService) {
        this.aiClientService = aiClientService;
    }

    @PostMapping(value = "/match-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> matchFace(@RequestParam("file") MultipartFile file) {

        try {

            // ================= VALIDATION =================
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "status", "ERROR",
                                "message", "Empty file"
                        )
                );
            }

            if (!file.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "status", "ERROR",
                                "message", "Only image files allowed"
                        )
                );
            }

            log.info("🔥 REQUEST RECEIVED: {}", file.getOriginalFilename());

            // ================= CALL AI =================
            Map<String, Object> res = aiClientService.matchFace(file);

            log.info("🔥 AI RESPONSE: {}", res);

            // ================= SAFETY =================
            if (res == null || !res.containsKey("status")) {
                return ResponseEntity.internalServerError().body(
                        Map.of(
                                "status", "ERROR",
                                "message", "Invalid AI response"
                        )
                );
            }

            String status = String.valueOf(res.get("status"));

            // ================= NORMALIZATION =================
            switch (status) {
                case "CONFIDENT_MATCH":
                case "NO_MATCH":
                case "NO_FACE":
                case "ERROR":
                    return ResponseEntity.ok(res);

                default:
                    log.warn("⚠️ UNKNOWN AI STATUS: {}", status);
                    return ResponseEntity.internalServerError().body(
                            Map.of(
                                    "status", "ERROR",
                                    "message", "Unknown AI status",
                                    "raw", res
                            )
                    );
            }

        } catch (Exception e) {

            log.error("❌ CONTROLLER ERROR", e);

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "status", "ERROR",
                            "message", "Controller failed: " + e.getMessage()
                    )
            );
        }
    }
}