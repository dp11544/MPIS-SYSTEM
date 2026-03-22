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

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) {

        try {

            if (userRepository.findByBatchId("admin").isPresent()) {
                log.info("✅ Admin already exists. Skipping seeding.");
                return;
            }

            log.info("🔐 Creating default admin user...");

            User admin = User.builder()
                    .batchId("admin")
                    .passwordHash(encoder.encode("admin"))
                    .mobile("5551239842")
                    .role("ADMIN")
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .createdAt(Instant.now())   // 🔥 FIX
                    .lockUntil(null)            // 🔥 IMPORTANT
                    .build();

            userRepository.save(admin);

            log.info("✅ Admin created → ID: admin | Password: admin");

        } catch (Exception e) {
            log.error("❌ Failed to seed admin user", e);
        }
    }
}