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

    // ✅ SAVE PERSON
    public Person savePerson(Person person) {
        return personRepository.save(person);
    }

    // ✅ GET ALL PERSONS
    public List<Person> getAllPersons() {
        return personRepository.findAll();
    }

    // ✅ GET PERSON BY ID
    public Person getPersonById(String id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new PersonNotFoundException(id));
    }

    // 🔥 UPDATE PHOTO PATH (USED BY UPLOAD CONTROLLER)
    public Person updatePhoto(String personId, String photoPath) {

        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new PersonNotFoundException(personId));

        person.setPhotoPath(photoPath);

        return personRepository.save(person);
    }

    // 🗑️ DELETE PERSON
    public void deletePerson(String id) {
        if (!personRepository.existsById(id)) {
            throw new PersonNotFoundException(id);
        }
        personRepository.deleteById(id);
    }
}
