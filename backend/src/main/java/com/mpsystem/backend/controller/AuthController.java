package com.mpsystem.backend.controller;

import com.mpsystem.backend.dto.LoginRequest;
import com.mpsystem.backend.dto.OtpVerifyRequest;
import com.mpsystem.backend.model.AuthResponse;
import com.mpsystem.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    // 🔥 LOGIN API
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {

        String status = authService.login(
                loginRequest.getBatchId(),
                loginRequest.getPassword()
        );

        AuthResponse response = new AuthResponse();

        // 🔥 DEMO MODE (OTP RETURN)
        if (status.startsWith("DEMO_")) {
            String[] parts = status.split("_");

            response.setStatus("OTP_REQUIRED");
            response.setMessage("DEMO MODE ACTIVE: " + parts[2] + " (Sent to " + parts[1] + ")");

            Map<String, Object> data = new HashMap<>();
            data.put("demoOtp", parts[2]);

            response.setData(data);
        }

        // 🔥 NORMAL OTP FLOW
        else if ("OTP_REQUIRED".equals(status)) {
            response.setStatus("OTP_REQUIRED");
            response.setMessage("Please verify OTP.");
        }

        // 🔥 PASSWORD RESET
        else if ("RESET_REQUIRED".equals(status)) {
            response.setStatus("RESET_REQUIRED");
            response.setMessage("Reset password required.");
        }

        // 🔥 ACCOUNT LOCKED
        else if ("LOCKED".equals(status)) {
            response.setStatus("LOCKED");
            response.setMessage("Account is locked. Try later.");
        }

        // 🔥 INVALID LOGIN
        else if ("INVALID".equals(status)) {
            response.setStatus("INVALID");
            response.setMessage("Invalid ID or Password.");
        }

        // 🔥 FALLBACK
        else {
            response.setStatus("ERROR");
            response.setMessage("Unexpected error occurred.");
        }

        return ResponseEntity.ok(response);
    }

    // 🔥 OTP VERIFY API
    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {

        String result = authService.verifyOtp(
                request.getBatchId(),
                request.getOtp()
        );

        AuthResponse response = new AuthResponse();

        // 🔥 SUCCESS
        if (!result.startsWith("INVALID") &&
            !result.contains("EXPIRED") &&
            !result.contains("ATTEMPTS")) {

            response.setStatus("SUCCESS");
            response.setMessage("OTP verified successfully.");

            Map<String, Object> data = new HashMap<>();
            data.put("token", result);

            response.setData(data);
        }

        // 🔥 INVALID OTP
        else if ("INVALID_OTP".equals(result)) {
            response.setStatus("INVALID_OTP");
            response.setMessage("Invalid OTP.");
        }

        // 🔥 EXPIRED
        else if ("OTP_EXPIRED".equals(result)) {
            response.setStatus("OTP_EXPIRED");
            response.setMessage("OTP expired.");
        }

        // 🔥 TOO MANY ATTEMPTS
        else if ("OTP_ATTEMPTS_EXCEEDED".equals(result)) {
            response.setStatus("OTP_ATTEMPTS_EXCEEDED");
            response.setMessage("Too many attempts.");
        }

        // 🔥 ALREADY USED
        else if ("OTP_ALREADY_USED".equals(result)) {
            response.setStatus("OTP_ALREADY_USED");
            response.setMessage("OTP already used.");
        }

        // 🔥 FALLBACK
        else {
            response.setStatus("ERROR");
            response.setMessage("OTP verification failed.");
        }

        return ResponseEntity.ok(response);
    }
}