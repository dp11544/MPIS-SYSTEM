package com.mpsystem.backend.controller;

import com.mpsystem.backend.service.AIClientService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/forensic")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ForensicController {

    private final AIClientService aiClientService;

    // 🔥 FINAL ENDPOINT (ONLY ONE YOU NEED)
    @PostMapping(value = "/match-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> matchImage(
            @RequestParam("file") MultipartFile file) {

        try {

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "status", "ERROR",
                                "message", "File is empty"
                        )
                );
            }

            // 🔥 DIRECT CALL TO AI
            Map<String, Object> result = aiClientService.matchFace(file);

            log.info("AI Match Result: {}", result);

            return ResponseEntity.ok(result);

        } catch (Exception e) {

            log.error("Forensic match failed", e);

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "status", "ERROR",
                            "message", "Matching failed"
                    )
            );
        }
    }
}