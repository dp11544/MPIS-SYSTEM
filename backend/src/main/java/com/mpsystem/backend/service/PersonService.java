package com.mpsystem.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mpsystem.backend.exception.PersonNotFoundException;
import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.repository.PersonRepository;

@Service
public class PersonService {

    private final PersonRepository personRepository;

    public PersonService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    // ✅ SAVE PERSON (SAFE)
    public Person savePerson(Person person) {

        if (person == null) {
            throw new RuntimeException("Person cannot be null");
        }

        return personRepository.save(person);
    }

    // ✅ GET ALL PERSONS
    public List<Person> getAllPersons() {
        return personRepository.findAll();
    }

    // ✅ GET PERSON BY ID
    public Person getPersonById(String id) {

        if (id == null || id.isBlank()) {
            throw new RuntimeException("Invalid person ID");
        }

        return personRepository.findById(id)
                .orElseThrow(() -> new PersonNotFoundException(id));
    }

    // ✅ UPDATE PHOTO PATH (SAFE + CONTROLLED)
    public Person updatePhoto(String personId, String photoPath) {

        Person person = getPersonById(personId);

        if (photoPath == null || photoPath.isBlank()) {
            throw new RuntimeException("Invalid photo path");
        }

        person.setPhotoPath(photoPath);

        return personRepository.save(person);
    }

    // 🗑️ DELETE PERSON
    public void deletePerson(String id) {

        if (id == null || id.isBlank()) {
            throw new RuntimeException("Invalid person ID");
        }

        if (!personRepository.existsById(id)) {
            throw new PersonNotFoundException(id);
        }

        personRepository.deleteById(id);
    }
}