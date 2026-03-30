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

            if (file == null || file.isEmpty()) {
                return ResponseEntity.ok(
                        Map.of("status", "ERROR", "message", "Empty file")
                );
            }

            log.info("🔥 REQUEST RECEIVED");

            Map<String, Object> response = aiClientService.matchFace(file);

            return ResponseEntity.ok(response);

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