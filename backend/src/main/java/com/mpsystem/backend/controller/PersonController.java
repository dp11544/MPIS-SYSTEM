package com.mpsystem.backend.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.mpsystem.backend.dto.PersonEmbeddingDTO;
import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.service.PersonService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/persons")
@CrossOrigin(origins = "*")
@Slf4j
public class PersonController {

    private final PersonService personService;

    public PersonController(PersonService personService) {
        this.personService = personService;
    }

    // ✅ CREATE PERSON (with basic validation)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Person createPerson(@RequestBody Person person) {

        if (person.getName() == null || person.getName().isBlank()) {
            throw new RuntimeException("Name is required");
        }

        if (person.getGender() == null || person.getGender().isBlank()) {
            throw new RuntimeException("Gender is required");
        }

        return personService.savePerson(person);
    }

    // ✅ GET ALL PERSONS
    @GetMapping
    public List<Person> getAllPersons() {
        return personService.getAllPersons();
    }

    // ✅ GET PERSON BY ID
    @GetMapping("/{id}")
    public Person getPersonById(@PathVariable String id) {
        return personService.getPersonById(id);
    }

    /**
     * ✅ UPDATE PERSON EMBEDDINGS (APPEND, NOT REPLACE)
     */
    @PutMapping("/{id}/embeddings")
    public ResponseEntity<Person> updatePersonEmbeddings(
            @PathVariable String id,
            @RequestBody Map<String, List<List<Double>>> request) {

        try {

            Person person = personService.getPersonById(id);

            List<List<Double>> embeddings = request.get("embeddings");

            if (embeddings == null || embeddings.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            // ✅ Validate embedding dimension (512)
            for (List<Double> emb : embeddings) {
                if (emb == null || emb.size() != 512) {
                    log.warn(
                        "Invalid embedding dimension for {} expected 512 got {}",
                        id,
                        emb == null ? 0 : emb.size()
                    );
                    return ResponseEntity.badRequest().build();
                }
            }

            // ✅ APPEND instead of replace
            if (person.getFaceEmbeddings() == null) {
                person.setFaceEmbeddings(new ArrayList<>());
            }

            person.getFaceEmbeddings().addAll(embeddings);

            Person saved = personService.savePerson(person);

            log.info(
                "Updated embeddings for {} total_count={}",
                person.getName(),
                person.getFaceEmbeddings().size()
            );

            return ResponseEntity.ok(saved);

        } catch (Exception e) {

            log.error("Error updating embeddings {}", e.getMessage(), e);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    /**
     * ✅ GET ALL EMBEDDINGS (FOR AI ENGINE)
     */
    @GetMapping("/embeddings")
    public List<PersonEmbeddingDTO> getAllEmbeddings() {

        List<Person> allPersons = personService.getAllPersons();

        List<PersonEmbeddingDTO> result = new ArrayList<>();

        for (Person person : allPersons) {

            if (person.getFaceEmbeddings() == null ||
                person.getFaceEmbeddings().isEmpty()) {
                continue;
            }

            result.add(
                new PersonEmbeddingDTO(
                    person.getId(),
                    person.getName(),
                    person.getFaceEmbeddings()
                )
            );
        }

        log.info("Returning {} persons with embeddings", result.size());

        return result;
    }

    // ✅ UPDATE PERSON (SAFE — NO photoPath overwrite)
    @PutMapping("/{id}")
    public Person updatePerson(
            @PathVariable String id,
            @RequestBody Person person) {

        Person existing = personService.getPersonById(id);

        existing.setName(person.getName());
        existing.setAge(person.getAge());
        existing.setGender(person.getGender());
        existing.setLastSeenLocation(person.getLastSeenLocation());
        existing.setContactNumber(person.getContactNumber());

        // ❌ DO NOT update photoPath here (handled by UploadController)

        return personService.savePerson(existing);
    }

    // ✅ DELETE PERSON
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePerson(@PathVariable String id) {
        personService.deletePerson(id);
    }
}