package com.mpsystem.backend.config;

import com.mpsystem.backend.model.User;
import com.mpsystem.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByBatchId("admin").isEmpty()) {
            log.info("🔐 No admin user found. Bootstrapping default admin account for demo purpose...");

            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

            User admin = User.builder()
                    .batchId("admin")
                    .passwordHash(encoder.encode("admin"))
                    .mobile("5551239842")
                    .role("ADMIN")
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .createdAt(LocalDateTime.now())
                    .build();

            userRepository.save(admin);
            log.info("✅ Default admin account created (ID: admin, Password: admin)");
        }
    }
}
