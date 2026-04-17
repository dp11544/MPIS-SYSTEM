package com.mpsystem.backend.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.service.PersonService;
import com.mpsystem.backend.service.AIClientService;
import java.util.ArrayList;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
@Slf4j
public class UploadController {

    private final PersonService personService;
    private final Cloudinary cloudinary;
    private final AIClientService aiClientService;

    public UploadController(PersonService personService,
                            Cloudinary cloudinary,
                            AIClientService aiClientService) {
        this.personService = personService;
        this.cloudinary = cloudinary;
        this.aiClientService = aiClientService;
    }

    @PostMapping(value = "/{personId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadPhoto(
            @PathVariable String personId,
            @RequestParam("images") java.util.List<MultipartFile> images) {

        try {

            // ✅ VALIDATION
            if (images == null || images.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("No images provided");
            }

            if (images.size() > 5) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Maximum 5 photos allowed");
            }

            Person person = personService.getPersonById(personId);
            boolean isFirst = true;

            for (MultipartFile image : images) {
                if (image.isEmpty()) continue;

                byte[] imageBytes = image.getBytes();

                // ✅ SAFE FILENAME
                String originalFilename = image.getOriginalFilename();
                if (originalFilename == null) {
                    originalFilename = "image.jpg";
                }

                String safeFilename = originalFilename
                        .replaceAll("\\s+", "_")
                        .replaceAll("[^a-zA-Z0-9._-]", "");

                // 🔥 CLOUDINARY UPLOAD
                Map uploadResult = cloudinary.uploader().upload(
                        imageBytes,
                        ObjectUtils.asMap(
                                "public_id", System.currentTimeMillis() + "_" + safeFilename
                        )
                );

                String imageUrl = (String) uploadResult.get("secure_url");
                log.info("✅ Uploaded to Cloudinary: {}", imageUrl);

                // 🔥 SAVE FIRST IMAGE URL ONLY to photoPath for UI
                if (isFirst) {
                    person.setPhotoPath(imageUrl);
                    isFirst = false;
                }

                // 🔥 AI EMBEDDING EXTRACTION
                List<Double> embedding = aiClientService.extractEmbedding(image);
                if (embedding != null) {
                    if (person.getFaceEmbeddings() == null) {
                        person.setFaceEmbeddings(new ArrayList<>());
                    }
                    person.getFaceEmbeddings().add(embedding);
                    log.info("✅ Extracted & appended embedding for image");
                }
            }

            personService.savePerson(person);

            return ResponseEntity.ok("Photos uploaded successfully");

        } catch (Exception e) {

            log.error("❌ Upload failed for personId={}", personId, e);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }
}