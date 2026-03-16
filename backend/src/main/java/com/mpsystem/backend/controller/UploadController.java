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

        private static final String UPLOAD_DIR = System.getProperty("user.dir") + File.separator + "uploads";

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
                        if (image == null || image.isEmpty()) {
                                return ResponseEntity
                                                .status(HttpStatus.BAD_REQUEST)
                                                .body("Image file is empty");
                        }

                        // 🔥 READ IMAGE BYTES ONCE (KEY FIX)
                        byte[] imageBytes = image.getBytes();
                        String originalFilename = image.getOriginalFilename();

                        // 1️⃣ Fetch person
                        Person person = personService.getPersonById(personId);

                        // 2️⃣ Call AI Engine USING BYTES
                        List<Double> embedding = aiClientService.getEmbedding(imageBytes, originalFilename);

                        // 3️⃣ Ensure upload directory
                        File uploadDir = new File(UPLOAD_DIR);
                        if (!uploadDir.exists())
                                uploadDir.mkdirs();

                        // 4️⃣ Save image locally using bytes
                        String filename = System.currentTimeMillis() + "_" + originalFilename;
                        File destination = new File(uploadDir, filename);
                        Files.write(destination.toPath(), imageBytes);

                        // 5️⃣ Save DB
                        person.setPhotoPath("uploads/" + filename);
                        if (person.getFaceEmbeddings() == null) {
                                person.setFaceEmbeddings(new java.util.ArrayList<>());
                        }
                        person.getFaceEmbeddings().add(embedding);
                        personService.savePerson(person);

                        return ResponseEntity.ok(
                                        "Photo uploaded and face embedding stored successfully");

                } catch (com.mpsystem.backend.exception.FaceDetectionException e) {
                        return ResponseEntity
                                        .status(HttpStatus.BAD_REQUEST)
                                        .body(e.getMessage());
                } catch (Exception e) {
                        log.error("Unexpected error during photo upload for personId={}: {}", personId, e.getMessage(),
                                        e);
                        return ResponseEntity
                                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body("Upload failed: " + e.getMessage());
                }
        }
}
