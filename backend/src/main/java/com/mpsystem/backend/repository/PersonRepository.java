package com.mpsystem.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.mpsystem.backend.model.Person;


@Repository
public interface PersonRepository extends MongoRepository<Person, String> {
    
    // ✅ Analytics: Count by gender
    long countByGenderIgnoreCase(String gender);
    
    // ✅ Analytics: Count by age range
    long countByAgeBetween(int minAge, int maxAge);
    
    // ✅ Analytics: Count by age greater than
    long countByAgeGreaterThan(int age);
    
    // ✅ Analytics: Count by age less than or equal
    long countByAgeLessThanEqual(int age);
}
