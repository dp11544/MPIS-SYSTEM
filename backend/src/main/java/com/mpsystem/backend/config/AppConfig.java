package com.mpsystem.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    // ✅ REST TEMPLATE (USED BY AI CLIENT)
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}