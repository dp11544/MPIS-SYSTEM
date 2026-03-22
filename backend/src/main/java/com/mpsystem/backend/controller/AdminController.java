package com.mpsystem.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    // 🔥 TEMP: remove service until implemented

    @PostMapping("/users")
    public String createUser(@RequestParam String batchId,
                             @RequestParam String mobile) {
        return "UserProvisionService not implemented yet";
    }
}