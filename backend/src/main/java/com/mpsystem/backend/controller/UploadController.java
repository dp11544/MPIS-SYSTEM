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

    // 🔥 FIXED: Use /tmp for Render (cloud-safe)
    private static final String UPLOAD_DIR = "/tmp/uploads";

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
            // ❌ Invalid file check
            if (image == null || image.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Image file is empty");
            }

            // 🔥 Read bytes ONCE
            byte[] imageBytes = image.getBytes();
            String originalFilename = image.getOriginalFilename();

            if (originalFilename == null) {
                originalFilename = "image.jpg";
            }

            // 🔥 FIX: remove spaces from filename
            String safeFilename = originalFilename.replaceAll("\\s+", "_");

            // 🔥 FINAL filename
            String filename = System.currentTimeMillis() + "_" + safeFilename;

            // 1️⃣ Fetch person
            Person person = personService.getPersonById(personId);

            // 2️⃣ Call AI engine
            List<Double> embedding = aiClientService.getEmbedding(imageBytes, originalFilename);

            // 3️⃣ Ensure upload directory exists
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                boolean created = uploadDir.mkdirs();
                log.info("Upload directory created: {}", created);
            }

            // 4️⃣ Save file to /tmp/uploads
            File destination = new File(uploadDir, filename);
            Files.write(destination.toPath(), imageBytes);

            log.info("File saved at: {}", destination.getAbsolutePath());

            // 5️⃣ Save DB path (DO NOT CHANGE THIS FORMAT)
            person.setPhotoPath("uploads/" + filename);

            if (person.getFaceEmbeddings() == null) {
                person.setFaceEmbeddings(new java.util.ArrayList<>());
            }

            person.getFaceEmbeddings().add(embedding);

            personService.savePerson(person);

            return ResponseEntity.ok("Photo uploaded and face embedding stored successfully");

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