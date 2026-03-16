package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.OtpSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface OtpSessionRepository extends MongoRepository<OtpSession, String> {
    Optional<OtpSession> findByBatchId(String batchId);
    void deleteByBatchId(String batchId);
}
