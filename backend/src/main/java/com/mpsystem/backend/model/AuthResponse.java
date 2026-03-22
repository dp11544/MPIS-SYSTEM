package com.mpsystem.backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.Map;

/**
 * Standard API Response for Authentication
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // 🔥 removes null fields in response
public class AuthResponse {

    // SUCCESS, INVALID, OTP_REQUIRED, RESET_REQUIRED, LOCKED, ERROR
    private String status;

    // Human-readable message
    private String message;

    // Optional data (token, otp, etc.)
    private Map<String, Object> data;

    // 🔥 Helper: success response
    public static AuthResponse success(String message, Map<String, Object> data) {
        return AuthResponse.builder()
                .status("SUCCESS")
                .message(message)
                .data(data)
                .build();
    }

    // 🔥 Helper: error response
    public static AuthResponse error(String message) {
        return AuthResponse.builder()
                .status("ERROR")
                .message(message)
                .build();
    }
}