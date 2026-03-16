package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.LoginAttempt;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LoginAttemptRepository extends MongoRepository<LoginAttempt, String> {
}
