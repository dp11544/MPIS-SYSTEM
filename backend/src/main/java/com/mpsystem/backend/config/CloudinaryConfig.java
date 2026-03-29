package com.mpsystem.backend.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
            "cloud_name", "dym1jxqix",
            "api_key", "572366324833343",
            "api_secret", "dUaBDBJGTjD_K3rt0H7O3UXXFCQ"
        ));
    }
}