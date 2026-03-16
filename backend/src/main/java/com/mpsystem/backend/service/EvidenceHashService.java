package com.mpsystem.backend.service;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.EvidenceHash;
import com.mpsystem.backend.repository.EvidenceHashRepository;
import com.mpsystem.backend.util.CryptoHashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EvidenceHashService {

    private static final String HASH_ALGORITHM = "SHA-256";

    private final EvidenceHashRepository evidenceHashRepository;

    /**
     * Generate and store cryptographic hash for alert evidence
     */
    public void generateEvidenceHash(Alert alert) {

        // Build deterministic evidence payload
        String payload =
                alert.getId() +
                alert.getPersonId() +
                alert.getCameraId() +
                alert.getDetectedAt().toString() +
                alert.getSimilarity();

        // Generate hash
        String hashValue = CryptoHashUtil.sha256(payload);

        EvidenceHash evidenceHash = new EvidenceHash(
                alert.getId(),
                HASH_ALGORITHM,
                hashValue
        );

        evidenceHashRepository.save(evidenceHash);
    }
}
