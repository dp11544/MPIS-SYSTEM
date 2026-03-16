package com.mpsystem.backend.exception;

import com.mpsystem.backend.model.AuthResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler that catches unhandled runtime errors,
 * validation errors, and custom business exceptions, translating them
 * into structured ErrorResponse JSON payloads or preserving API contracts.
 */
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // 1. Validation Errors (Triggered by @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        log.warn("Validation Exception at {}: {}", request.getRequestURI(), ex.getMessage());
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }

        ErrorResponse errorRes = new ErrorResponse(
                Instant.now().toString(),
                HttpStatus.BAD_REQUEST.value(),
                "Validation Error",
                "Invalid request parameters: " + errors,
                request.getRequestURI());
        return new ResponseEntity<>(errorRes, HttpStatus.BAD_REQUEST);
    }

    // 2. Face Detection Errors
    @ExceptionHandler(FaceDetectionException.class)
    public ResponseEntity<ErrorResponse> handleFaceDetectionException(FaceDetectionException ex,
            HttpServletRequest request) {
        log.warn("Face Detection Exception at {}: {}", request.getRequestURI(), ex.getMessage());

        ErrorResponse errorRes = new ErrorResponse(
                Instant.now().toString(),
                HttpStatus.BAD_REQUEST.value(),
                "Face Detection Error",
                ex.getMessage(),
                request.getRequestURI());
        return new ResponseEntity<>(errorRes, HttpStatus.BAD_REQUEST);
    }

    // 3. Auth Exceptions (Preserving existing frontend API contract)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<AuthResponse> handleRuntimeException(RuntimeException ex, HttpServletRequest request) {
        // NOTE: Catching RuntimeException for Auth errors is too broad.
        // During Step 6 (Security Hardening), we will replace this with specific
        // AuthException or InvalidOtpException to avoid masking other DB/system bugs.
        log.warn("Business Logic Exception at {}: {}", request.getRequestURI(), ex.getMessage());
        AuthResponse response = new AuthResponse();

        String msg = ex.getMessage();
        if (msg != null && (msg.contains("OTP expired") || msg.contains("Maximum OTP attempts"))) {
            response.setStatus("OTP_EXPIRED");
        } else if (msg != null && msg.contains("Invalid OTP")) {
            response.setStatus("INVALID_OTP");
        } else if (msg != null && msg.contains("Account locked")) {
            response.setStatus("LOCKED");
        } else if (msg != null && (msg.contains("Invalid credentials") || msg.contains("User not found"))) {
            response.setStatus("INVALID_CREDENTIALS");
        } else {
            response.setStatus("ERROR");
        }

        response.setMessage(msg != null ? msg : "An error occurred");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    // 4. Fallback for all other unhandled Exceptions
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled Backend Exception at {}: {}", request.getRequestURI(), ex.getMessage(), ex);

        ErrorResponse errorRes = new ErrorResponse(
                Instant.now().toString(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "An unexpected system error occurred. See backend logs.",
                request.getRequestURI());
        return new ResponseEntity<>(errorRes, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
