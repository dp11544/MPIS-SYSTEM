package com.mpsystem.backend.service;

import com.mpsystem.backend.model.*;
import com.mpsystem.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;
import org.springframework.beans.factory.annotation.Value;

import com.mpsystem.backend.util.JwtUtil;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    @Value("${otp.demo-mode:false}")
    private boolean demoMode;

    @Value("${otp.expiration-seconds:130}")
    private long otpExpirationSeconds;

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final OtpSessionRepository otpSessionRepository;
    private final JwtUtil jwtUtil;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    // LOGIN (PASSWORD CHECK + OTP GENERATION)
    public String login(String batchId, String password) {

        User user = userRepository.findByBatchId(batchId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            logAttempt(batchId, false, "LOCKED");
            log.warn("Login blocked: Account locked for batchId={}", batchId);
            throw new RuntimeException("Account locked");
        }

        if (!encoder.matches(password, user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);

            if (user.getFailedAttempts() >= 3) {
                user.setLockUntil(LocalDateTime.now().plusHours(24));
                user.setStatus("LOCKED");
            }

            userRepository.save(user);
            logAttempt(batchId, false, "WRONG_PASSWORD");
            log.warn("Login failed (invalid password) for batchId={}. Failed attempts: {}", batchId,
                    user.getFailedAttempts());
            throw new RuntimeException("Invalid credentials");
        }

        user.setFailedAttempts(0);
        userRepository.save(user);

        if ("RESET_REQUIRED".equals(user.getStatus())) {
            return "RESET_REQUIRED";
        }

        String otp = generateOtp();
        otpSessionRepository.deleteByBatchId(batchId);

        otpSessionRepository.save(
                OtpSession.builder()
                        .batchId(batchId)
                        .otpHash(encoder.encode(otp))
                        .expiresAt(LocalDateTime.now().plusSeconds(otpExpirationSeconds)) // Dynamically injected expiry
                                                                                          // buffer
                        .verified(false)
                        .attempts(0)
                        .build());

        // SMS Simulation Log for Demo
        String maskedMobile = "******9842";
        if (user.getMobile() != null && user.getMobile().length() >= 4) {
            int len = user.getMobile().length();
            maskedMobile = "******" + user.getMobile().substring(len - 4);
        }
        log.info("🔐 [SECURITY] OTP sent to {}: {}", maskedMobile, otp);

        if (demoMode) {
            return "DEMO_" + maskedMobile + "_" + otp;
        }

        return "OTP_REQUIRED";
    }

    // OTP VERIFY + SESSION TOKEN GENERATION
    public String verifyOtp(String batchId, String otp) {

        OtpSession session = otpSessionRepository.findByBatchId(batchId)
                .orElseThrow(() -> new RuntimeException("OTP not found"));

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP expired");
        }

        if (session.isVerified()) {
            throw new RuntimeException("OTP already used");
        }

        if (session.getAttempts() >= 3) {
            throw new RuntimeException("Maximum OTP attempts exceeded");
        }

        if (!encoder.matches(otp, session.getOtpHash())) {
            session.setAttempts(session.getAttempts() + 1);
            otpSessionRepository.save(session);
            logAttempt(batchId, false, "OTP_FAILED");
            log.warn("OTP verification denied (invalid OTP) for batchId={}. Attempts used: {}", batchId,
                    session.getAttempts());
            throw new RuntimeException("Invalid OTP");
        }

        session.setVerified(true);
        otpSessionRepository.save(session);

        logAttempt(batchId, true, "SUCCESS");
        log.info("OTP verification successful. Session granted for batchId={}", batchId);

        // 🔐 SESSION TOKEN (Robust JWT generation)
        return jwtUtil.generateToken(batchId);
    }

    private void logAttempt(String batchId, boolean success, String reason) {
        loginAttemptRepository.save(
                LoginAttempt.builder()
                        .batchId(batchId)
                        .timestamp(LocalDateTime.now())
                        .success(success)
                        .reason(reason)
                        .build());
    }

    private String generateOtp() {
        return String.valueOf(100000 + new Random().nextInt(900000));
    }
}
