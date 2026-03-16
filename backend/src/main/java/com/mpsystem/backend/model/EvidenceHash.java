package com.mpsystem.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "evidence_hashes")
public class EvidenceHash {

    @Id
    private String id;

    private String alertId;          // Reference to Alert
    private String hashAlgorithm;    // SHA-256
    private String hashValue;        // Actual hash
    private Instant createdAt;

    protected EvidenceHash() {}

    public EvidenceHash(
            String alertId,
            String hashAlgorithm,
            String hashValue
    ) {
        this.alertId = alertId;
        this.hashAlgorithm = hashAlgorithm;
        this.hashValue = hashValue;
        this.createdAt = Instant.now();
    }

    public String getAlertId() {
        return alertId;
    }

    public String getHashAlgorithm() {
        return hashAlgorithm;
    }

    public String getHashValue() {
        return hashValue;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
