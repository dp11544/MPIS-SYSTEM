package com.mpsystem.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.service.AIClientService;
import com.mpsystem.backend.service.PersonService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
@Slf4j
public class UploadController {

    private final PersonService personService;
    private final AIClientService aiClientService;
    private final Cloudinary cloudinary;

    public UploadController(PersonService personService,
                            AIClientService aiClientService,
                            Cloudinary cloudinary) {
        this.personService = personService;
        this.aiClientService = aiClientService;
        this.cloudinary = cloudinary;
    }

    @PostMapping(value = "/{personId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadPhoto(
            @PathVariable String personId,
            @RequestParam("file") MultipartFile file) {

        try {
            // ✅ Validate
            if (file == null || file.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Image file is empty");
            }

            // ✅ Safe filename
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null) {
                originalFilename = "image.jpg";
            }

            String safeFilename = originalFilename
                    .replaceAll("\\s+", "_")
                    .replaceAll("[^a-zA-Z0-9._-]", "");

            byte[] imageBytes = file.getBytes();

            // 🔥 CLOUDINARY UPLOAD
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    imageBytes,
                    ObjectUtils.asMap("public_id", System.currentTimeMillis() + "_" + safeFilename)
            );

            String imageUrl = (String) uploadResult.get("secure_url");

            log.info("Uploaded to Cloudinary: {}", imageUrl);

            // ✅ Fetch person
            Person person = personService.getPersonById(personId);

            // 🔥 GET EMBEDDING (FIXED METHOD)
            List<Double> embedding = aiClientService.extractEmbedding(file);

            if (embedding == null || embedding.size() != 512) {
                return ResponseEntity
                        .status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Failed to extract embedding");
            }

            // ✅ SAVE IMAGE URL
            person.setPhotoPath(imageUrl);

            // ✅ INIT LIST IF NULL
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