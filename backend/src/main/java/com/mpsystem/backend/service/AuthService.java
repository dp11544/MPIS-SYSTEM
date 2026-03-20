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

    // 🔥 LOGIN (SAFE VERSION — NO CRASHES)
    public String login(String batchId, String password) {

        User user = userRepository.findByBatchId(batchId).orElse(null);

        // ✅ FIX 1: No exception — safe handling
        if (user == null) {
            log.warn("Login failed: user not found for batchId={}", batchId);
            logAttempt(batchId, false, "USER_NOT_FOUND");
            return "INVALID";
        }

        // ✅ Account locked
        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            logAttempt(batchId, false, "LOCKED");
            log.warn("Account locked for batchId={}", batchId);
            return "LOCKED";
        }

        // ✅ Password check
        if (!encoder.matches(password, user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);

            if (user.getFailedAttempts() >= 3) {
                user.setLockUntil(LocalDateTime.now().plusHours(24));
                user.setStatus("LOCKED");
            }

            userRepository.save(user);
            logAttempt(batchId, false, "WRONG_PASSWORD");

            log.warn("Invalid password for batchId={}", batchId);
            return "INVALID";
        }

        // ✅ Reset failed attempts
        user.setFailedAttempts(0);
        userRepository.save(user);

        // ✅ Password reset flow
        if ("RESET_REQUIRED".equals(user.getStatus())) {
            return "RESET_REQUIRED";
        }

        // 🔥 Generate OTP
        String otp = generateOtp();

        otpSessionRepository.deleteByBatchId(batchId);

        otpSessionRepository.save(
                OtpSession.builder()
                        .batchId(batchId)
                        .otpHash(encoder.encode(otp))
                        .expiresAt(LocalDateTime.now().plusSeconds(otpExpirationSeconds))
                        .verified(false)
                        .attempts(0)
                        .build());

        // 🔐 Demo logging
        String maskedMobile = "******0000";
        if (user.getMobile() != null && user.getMobile().length() >= 4) {
            int len = user.getMobile().length();
            maskedMobile = "******" + user.getMobile().substring(len - 4);
        }

        log.info("🔐 OTP sent to {}: {}", maskedMobile, otp);

        // ✅ Demo mode
        if (demoMode) {
            return "DEMO_" + maskedMobile + "_" + otp;
        }

        return "OTP_REQUIRED";
    }

    // 🔥 OTP VERIFY
    public String verifyOtp(String batchId, String otp) {

        OtpSession session = otpSessionRepository.findByBatchId(batchId).orElse(null);

        if (session == null) {
            log.warn("OTP not found for batchId={}", batchId);
            return "INVALID_OTP";
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            return "OTP_EXPIRED";
        }

        if (session.isVerified()) {
            return "OTP_ALREADY_USED";
        }

        if (session.getAttempts() >= 3) {
            return "OTP_ATTEMPTS_EXCEEDED";
        }

        if (!encoder.matches(otp, session.getOtpHash())) {
            session.setAttempts(session.getAttempts() + 1);
            otpSessionRepository.save(session);

            logAttempt(batchId, false, "OTP_FAILED");
            return "INVALID_OTP";
        }

        // ✅ Success
        session.setVerified(true);
        otpSessionRepository.save(session);

        logAttempt(batchId, true, "SUCCESS");

        log.info("OTP verified for batchId={}", batchId);

        return jwtUtil.generateToken(batchId);
    }

    // 🔥 LOGGING
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