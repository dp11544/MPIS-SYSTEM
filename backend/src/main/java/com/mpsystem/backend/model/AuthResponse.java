package com.mpsystem.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Standard API Response for Authentication
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    // 🔥 STATUS TYPES:
    // SUCCESS, INVALID, OTP_REQUIRED, RESET_REQUIRED, LOCKED, ERROR
    private String status;

    // Human-readable message
    private String message;

    // Flexible structured data (token, otp, etc.)
    private Map<String, Object> data;
}