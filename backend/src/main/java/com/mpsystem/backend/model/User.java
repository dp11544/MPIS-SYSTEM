package com.mpsystem.backend.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String batchId;
    private String passwordHash;
    private String mobile;

    private String role; // OFFICER / ADMIN
    private String status; // RESET_REQUIRED / ACTIVE / LOCKED

    private int failedAttempts;

    // 🔥 FIX: LocalDateTime → Instant
    private Instant lockUntil;

    // 🔥 FIX: LocalDateTime → Instant
    private Instant createdAt;
}