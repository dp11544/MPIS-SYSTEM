package com.mpsystem.backend.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "otp_sessions")
public class OtpSession {

    @Id
    private String id;

    private String batchId;

    private String otpHash;

    // 🔥 FIX: LocalDateTime → Instant
    private Instant expiresAt;

    private boolean verified;

    private int attempts;
}