package com.mpsystem.backend.controller;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.service.AIClientService;
import com.mpsystem.backend.service.PersonService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
@Slf4j
public class UploadController {

    // ✅ MUST match AppConfig EXACTLY
    private static final String UPLOAD_DIR = "/tmp/uploads/";

    private final PersonService personService;
    private final AIClientService aiClientService;

    public UploadController(PersonService personService,
                            AIClientService aiClientService) {
        this.personService = personService;
        this.aiClientService = aiClientService;
    }

    @PostMapping(value = "/{personId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadPhoto(
            @PathVariable String personId,
            @RequestParam("image") MultipartFile image) {

        try {
            // 🔴 Validate input
            if (image == null || image.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Image file is empty");
            }

            // 🔴 Read bytes ONCE
            byte[] imageBytes = image.getBytes();

            // 🔴 Safe filename
            String originalFilename = image.getOriginalFilename();
            if (originalFilename == null) {
                originalFilename = "image.jpg";
            }

            // remove spaces + unsafe chars
            String safeFilename = originalFilename
                    .replaceAll("\\s+", "_")
                    .replaceAll("[^a-zA-Z0-9._-]", "");

            String filename = System.currentTimeMillis() + "_" + safeFilename;

            // 🔴 Ensure directory exists
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                boolean created = dir.mkdirs();
                log.info("Upload directory created: {}", created);
            }

            // 🔴 Save file
            File destination = new File(UPLOAD_DIR + filename);
            Files.write(destination.toPath(), imageBytes);

            log.info("Saved at: {}", destination.getAbsolutePath());
            log.info("File exists: {}", destination.exists());

            // 🔴 HARD CHECK (prevents broken DB entries)
            if (!destination.exists()) {
                throw new RuntimeException("File not saved properly");
            }

            // 🔴 Fetch person
            Person person = personService.getPersonById(personId);

            // 🔴 AI embedding
            List<Double> embedding = aiClientService.getEmbedding(imageBytes, safeFilename);

            // 🔴 Save path (USED BY FRONTEND)
            person.setPhotoPath("uploads/" + filename);

            if (person.getFaceEmbeddings() == null) {
                person.setFaceEmbeddings(new java.util.ArrayList<>());
            }

            person.getFaceEmbeddings().add(embedding);

            personService.savePerson(person);

            return ResponseEntity.ok("Photo uploaded and embedding stored");

        } catch (com.mpsystem.backend.exception.FaceDetectionException e) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());

        } catch (Exception e) {

            log.error("Upload failed for personId={}: {}", personId, e.getMessage(), e);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }
}