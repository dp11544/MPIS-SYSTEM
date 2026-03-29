package com.mpsystem.backend.config;

import com.mpsystem.backend.model.User;
import com.mpsystem.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder encoder;

    @Override
    public void run(String... args) {

        try {

            // ✅ CASE-INSENSITIVE CHECK
            if (userRepository.findByBatchIdIgnoreCase("admin").isPresent()) {
                log.info("Admin already exists. Skipping seeding.");
                return;
            }

            log.info("Creating default admin user...");

            // 🔥 Default password (CHANGE AFTER LOGIN)
            String rawPassword = "Admin@123";

            User admin = User.builder()
                    .batchId("admin")
                    .passwordHash(encoder.encode(rawPassword))
                    .mobile("5551239842")
                    .role("ADMIN")
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .createdAt(Instant.now())
                    .lockUntil(null)
                    .build();

            userRepository.save(admin);

            // ⚠️ DO NOT LOG PASSWORD IN PRODUCTION
            log.warn("Default admin created. Change password immediately.");

        } catch (Exception e) {
            log.error("Failed to seed admin user", e);
        }
    }
}