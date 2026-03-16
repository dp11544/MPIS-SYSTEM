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
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @ModelAttribute LoginRequest loginRequest) {
        String status = authService.login(loginRequest.getBatchId(), loginRequest.getPassword());
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
            response.setMessage("Please verify your identity with the OTP sent to your registered device.");
        } else if ("RESET_REQUIRED".equals(status)) {
            response.setStatus("RESET_REQUIRED");
            response.setMessage("You must reset your password before continuing.");
        } else {
            response.setStatus(status);
            response.setMessage("Authentication processed.");
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @ModelAttribute OtpVerifyRequest otpVerifyRequest) {
        String token = authService.verifyOtp(otpVerifyRequest.getBatchId(), otpVerifyRequest.getOtp());
        AuthResponse response = new AuthResponse();
        response.setStatus("SUCCESS");
        response.setMessage("Identity verified successfully.");

        Map<String, String> data = new HashMap<>();
        data.put("token", token);
        response.setData(data);

        return ResponseEntity.ok(response);
    }
}
