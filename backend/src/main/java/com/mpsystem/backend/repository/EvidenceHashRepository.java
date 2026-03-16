package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.EvidenceHash;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface EvidenceHashRepository
        extends MongoRepository<EvidenceHash, String> {

    Optional<EvidenceHash> findByAlertId(String alertId);
}
