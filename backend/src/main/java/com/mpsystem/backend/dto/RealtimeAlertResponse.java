package com.mpsystem.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Simple acknowledgement to AI engine.
 * Backend never blocks AI.
 */
@Data
@AllArgsConstructor
public class RealtimeAlertResponse {

    private String status;   // OK / REJECTED
    private String message;  // explanation
}
