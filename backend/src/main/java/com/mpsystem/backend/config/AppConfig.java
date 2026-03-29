package com.mpsystem.backend.config;

import java.io.File;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    // 🔥 REST TEMPLATE (keep as is)
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // 🔥 FIXED: Use SAME path as UploadController (/tmp/uploads)
    private static final String UPLOAD_DIR = "/tmp/uploads/";

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        File dir = new File(UPLOAD_DIR);

        // 🔥 Ensure directory exists
        if (!dir.exists()) {
            boolean created = dir.mkdirs();
            System.out.println("Upload dir created: " + created);
        }

        // 🔥 CRITICAL: Map /uploads/** → /tmp/uploads/
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + UPLOAD_DIR)
                .setCachePeriod(3600);
    }
}