package com.mpsystem.backend.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

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
    private LocalDateTime expiresAt;
    private boolean verified;
    private int attempts;
}
