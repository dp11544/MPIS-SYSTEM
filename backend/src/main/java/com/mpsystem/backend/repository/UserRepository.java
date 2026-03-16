package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByBatchId(String batchId);
}
