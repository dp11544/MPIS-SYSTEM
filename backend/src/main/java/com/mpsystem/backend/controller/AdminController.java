package com.mpsystem.backend.controller;

import com.mpsystem.backend.service.UserProvisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserProvisionService userProvisionService;

    @PostMapping("/users")
    public String createUser(@RequestParam String batchId,
                             @RequestParam String mobile) {
        return userProvisionService.createOfficer(batchId, mobile);
    }
}
