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
@CrossOrigin(origins = "*") // allow frontend (fix CORS)
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

        if (status.startsWith("DEMO_")) {
            String[] parts = status.split("_");

            response.setStatus("OTP_REQUIRED");
            response.setMessage("DEMO MODE ACTIVE: " + parts[2] + " (Sent to " + parts[1] + ")");

            Map<String, String> data = new HashMap<>();
            data.put("demoOtp", parts[2]);
            response.setData(data);

        } else if ("OTP_REQUIRED".equals(status)) {

            response.setStatus("OTP_REQUIRED");
            response.setMessage("Please verify OTP.");

        } else if ("RESET_REQUIRED".equals(status)) {

            response.setStatus("RESET_REQUIRED");
            response.setMessage("Reset password required.");

        } else {

            response.setStatus(status);
            response.setMessage("Authentication processed.");
        }

        return ResponseEntity.ok(response);
    }

    // 🔥 OTP VERIFY API
    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {

        String token = authService.verifyOtp(
                request.getBatchId(),
                request.getOtp()
        );

        AuthResponse response = new AuthResponse();
        response.setStatus("SUCCESS");
        response.setMessage("Verified");

        Map<String, String> data = new HashMap<>();
        data.put("token", token);
        response.setData(data);

        return ResponseEntity.ok(response);
    }
}