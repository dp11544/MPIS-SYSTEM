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

    // 🔥 LOGIN API (FULL SAFE VERSION)
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {

        AuthResponse response = new AuthResponse();
        String status;

        try {
            status = authService.login(
                    loginRequest.getBatchId(),
                    loginRequest.getPassword()
            );
        } catch (Exception e) {
            e.printStackTrace();

            response.setStatus("ERROR");
            response.setMessage("Internal server error");

            return ResponseEntity.ok(response);
        }

        // 🔥 NULL SAFETY
        if (status == null) {
            response.setStatus("ERROR");
            response.setMessage("Null response from server");
            return ResponseEntity.ok(response);
        }

        // 🔥 DEMO MODE
        if (status.startsWith("DEMO_")) {

            String[] parts = status.split("_");

            if (parts.length < 3) {
                response.setStatus("ERROR");
                response.setMessage("Invalid demo response");
                return ResponseEntity.ok(response);
            }

            response.setStatus("OTP_REQUIRED");
            response.setMessage("DEMO MODE ACTIVE");

            Map<String, Object> data = new HashMap<>();
            data.put("demoOtp", parts[2]);
            data.put("maskedMobile", parts[1]);

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

        // 🔥 INTERNAL ERROR FROM SERVICE
        else if ("ERROR".equals(status)) {
            response.setStatus("ERROR");
            response.setMessage("Login failed internally.");
        }

        // 🔥 FALLBACK
        else {
            response.setStatus("ERROR");
            response.setMessage("Unexpected error occurred.");
        }

        return ResponseEntity.ok(response);
    }

    // 🔥 OTP VERIFY API (SAFE)
    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {

        AuthResponse response = new AuthResponse();
        String result;

        try {
            result = authService.verifyOtp(
                    request.getBatchId(),
                    request.getOtp()
            );
        } catch (Exception e) {
            e.printStackTrace();

            response.setStatus("ERROR");
            response.setMessage("OTP verification failed.");

            return ResponseEntity.ok(response);
        }

        // 🔥 SUCCESS (TOKEN RETURN)
        if (result != null &&
            !result.startsWith("INVALID") &&
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

        // 🔥 ERROR
        else {
            response.setStatus("ERROR");
            response.setMessage("OTP verification failed.");
        }

        return ResponseEntity.ok(response);
    }
}