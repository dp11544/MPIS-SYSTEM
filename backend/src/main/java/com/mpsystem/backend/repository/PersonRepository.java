package com.mpsystem.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.mpsystem.backend.model.Person;

@Repository
public interface PersonRepository extends MongoRepository<Person, String> {

    // ✅ Count by gender (case-insensitive)
    long countByGenderIgnoreCase(String gender);

    // ✅ Count by age range (safe for Integer)
    long countByAgeBetween(Integer minAge, Integer maxAge);

    // ✅ Count by age greater than
    long countByAgeGreaterThan(Integer age);

    // ✅ Count by age less than or equal
    long countByAgeLessThanEqual(Integer age);
}