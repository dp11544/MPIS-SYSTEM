package com.mpsystem.backend.config;

import java.io.File;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        // ✅ SAME path as UploadController
        String uploadDir = System.getProperty("user.dir") + File.separator + "uploads" + File.separator;

        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir.mkdirs(); // ensure folder exists
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir)
                .setCachePeriod(0);
    }
}