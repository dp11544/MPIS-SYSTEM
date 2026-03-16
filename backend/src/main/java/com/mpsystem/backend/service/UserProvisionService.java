package com.mpsystem.backend.service;

import com.mpsystem.backend.model.User;
import com.mpsystem.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProvisionService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public String createOfficer(String batchId, String mobile) {

        String tempPassword = UUID.randomUUID().toString().substring(0, 8);

        User user = User.builder()
                .batchId(batchId)
                .mobile(mobile)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .role("OFFICER")
                .status("RESET_REQUIRED")
                .failedAttempts(0)
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);
        return tempPassword; // send via admin-secure channel
    }
}
