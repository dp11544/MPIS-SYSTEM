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

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
@Slf4j
public class UploadController {

    private final PersonService personService;
    private final Cloudinary cloudinary;

    public UploadController(PersonService personService,
                            Cloudinary cloudinary) {
        this.personService = personService;
        this.cloudinary = cloudinary;
    }

    @PostMapping(value = "/{personId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadPhoto(
            @PathVariable String personId,
            @RequestParam("image") MultipartFile image) {

        try {

            // ✅ VALIDATION
            if (image == null || image.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Image file is empty");
            }

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

            // ✅ FETCH PERSON
            Person person = personService.getPersonById(personId);

            // 🔥 SAVE IMAGE URL ONLY
            person.setPhotoPath(imageUrl);

            personService.savePerson(person);

            return ResponseEntity.ok("Photo uploaded successfully");

        } catch (Exception e) {

            log.error("❌ Upload failed for personId={}", personId, e);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }
}