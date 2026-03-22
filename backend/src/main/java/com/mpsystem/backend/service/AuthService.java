package com.mpsystem.backend.service;

import com.mpsystem.backend.model.*;
import com.mpsystem.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;
import java.util.Random;

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

    public String login(String batchId, String password) {

        try {

            // 🔥 NULL INPUT GUARD
            if (batchId == null || password == null) {
                log.warn("Null input received");
                return "INVALID";
            }

            // 🔥 SAFE DB CALL
            User user = userRepository.findByBatchId(batchId).orElse(null);

            if (user == null) {
                log.warn("User not found: {}", batchId);
                logAttempt(batchId, false, "USER_NOT_FOUND");
                return "INVALID";
            }

            // 🔥 PASSWORD HASH CHECK
            String hash = user.getPasswordHash();
            if (hash == null || hash.isEmpty()) {
                log.error("Password hash missing for {}", batchId);
                return "INVALID";
            }

            // 🔥 ACCOUNT LOCK CHECK
            if (user.getLockUntil() != null &&
                user.getLockUntil().isAfter(LocalDateTime.now())) {

                logAttempt(batchId, false, "LOCKED");
                return "LOCKED";
            }

            // 🔥 SAFE PASSWORD MATCH
            boolean passwordMatch;
            try {
                passwordMatch = encoder.matches(password, hash);
            } catch (Exception e) {
                log.error("Password match error", e);
                return "INVALID";
            }

            if (!passwordMatch) {

                user.setFailedAttempts(user.getFailedAttempts() + 1);

                if (user.getFailedAttempts() >= 3) {
                    user.setLockUntil(LocalDateTime.now().plusHours(24));
                    user.setStatus("LOCKED");
                }

                userRepository.save(user);
                logAttempt(batchId, false, "WRONG_PASSWORD");

                return "INVALID";
            }

            // ✅ RESET FAILED ATTEMPTS
            user.setFailedAttempts(0);
            userRepository.save(user);

            // 🔁 RESET REQUIRED
            if ("RESET_REQUIRED".equals(user.getStatus())) {
                return "RESET_REQUIRED";
            }

            // 🔥 GENERATE OTP
            String otp = generateOtp();

            otpSessionRepository.deleteByBatchId(batchId);

            otpSessionRepository.save(
                OtpSession.builder()
                    .batchId(batchId)
                    .otpHash(encoder.encode(otp))
                    .expiresAt(LocalDateTime.now().plusSeconds(otpExpirationSeconds))
                    .verified(false)
                    .attempts(0)
                    .build()
            );

            // 🔥 MASK MOBILE
            String maskedMobile = "******0000";
            if (user.getMobile() != null && user.getMobile().length() >= 4) {
                int len = user.getMobile().length();
                maskedMobile = "******" + user.getMobile().substring(len - 4);
            }

            log.info("OTP sent to {}", maskedMobile);

            if (demoMode) {
                return "DEMO_" + maskedMobile + "_" + otp;
            }

            return "OTP_REQUIRED";

        } catch (Exception e) {
            log.error("🔥 LOGIN CRASH", e);
            return "ERROR";
        }
    }

    public String verifyOtp(String batchId, String otp) {

        try {

            OtpSession session = otpSessionRepository.findByBatchId(batchId).orElse(null);

            if (session == null) return "INVALID_OTP";

            if (session.getExpiresAt().isBefore(LocalDateTime.now()))
                return "OTP_EXPIRED";

            if (session.isVerified())
                return "OTP_ALREADY_USED";

            if (session.getAttempts() >= 3)
                return "OTP_ATTEMPTS_EXCEEDED";

            if (!encoder.matches(otp, session.getOtpHash())) {
                session.setAttempts(session.getAttempts() + 1);
                otpSessionRepository.save(session);
                return "INVALID_OTP";
            }

            session.setVerified(true);
            otpSessionRepository.save(session);

            return jwtUtil.generateToken(batchId);

        } catch (Exception e) {
            log.error("OTP VERIFY CRASH", e);
            return "INVALID_OTP";
        }
    }

    private void logAttempt(String batchId, boolean success, String reason) {
        loginAttemptRepository.save(
            LoginAttempt.builder()
                .batchId(batchId)
                .timestamp(LocalDateTime.now())
                .success(success)
                .reason(reason)
                .build()
        );
    }

    private String generateOtp() {
        return String.valueOf(100000 + new Random().nextInt(900000));
    }
}