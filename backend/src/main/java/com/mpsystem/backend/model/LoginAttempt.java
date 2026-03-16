package com.mpsystem.backend.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "login_attempts")
public class LoginAttempt {

    @Id
    private String id;

    private String batchId;
    private LocalDateTime timestamp;
    private boolean success;
    private String reason; // WRONG_PASSWORD / LOCKED / OTP_FAILED
}
