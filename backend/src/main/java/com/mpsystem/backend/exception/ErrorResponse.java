package com.mpsystem.backend.exception;

/**
 * Standardized error payload returned to clients.
 */
public record ErrorResponse(
        String timestamp,
        int status,
        String error,
        String message,
        String path) {
}
