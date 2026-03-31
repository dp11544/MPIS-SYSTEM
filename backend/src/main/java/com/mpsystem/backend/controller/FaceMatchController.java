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

            // ✅ VALIDATION
            if (file == null || file.isEmpty()) {
                return ResponseEntity.ok(
                        Map.of(
                                "status", "ERROR",
                                "message", "Empty file"
                        )
                );
            }

            log.info("🔥 REQUEST RECEIVED");

            Map<String, Object> res = aiClientService.matchFace(file);

            log.info("🔥 FINAL RESPONSE TO FRONTEND: {}", res);

            // 🔴 HARD SAFETY (IMPORTANT)
            if (res == null || !res.containsKey("status")) {
                return ResponseEntity.ok(
                        Map.of(
                                "status", "ERROR",
                                "message", "Invalid AI response"
                        )
                );
            }

            // 🔴 NORMALIZE RESPONSE (KEY FIX)
            String status = String.valueOf(res.get("status"));

            if (!status.equals("CONFIDENT_MATCH") &&
                !status.equals("NO_MATCH") &&
                !status.equals("NO_FACE") &&
                !status.equals("ERROR")) {

                return ResponseEntity.ok(
                        Map.of(
                                "status", "ERROR",
                                "message", "Unknown AI status",
                                "raw", res
                        )
                );
            }

            // ✅ SAFE RETURN
            return ResponseEntity.ok(res);

        } catch (Exception e) {

            log.error("❌ CONTROLLER ERROR", e);

            return ResponseEntity.ok(
                    Map.of(
                            "status", "ERROR",
                            "message", "Controller failed: " + e.getMessage()
                    )
            );
        }
    }
}