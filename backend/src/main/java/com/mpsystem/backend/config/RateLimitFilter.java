package com.mpsystem.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RateLimitFilter implements Filter {

    // Thread-safe map to store buckets per IP address
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    private Bucket createNewBucket() {
        // 10 requests per minute total allowed
        Bandwidth limit = Bandwidth.builder()
                .capacity(10)
                .refillGreedy(10, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket resolveBucket(String ip) {
        return cache.computeIfAbsent(ip, k -> createNewBucket());
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();

        // 🛡️ Apply Rate Limiting ONLY to Auth Endpoints to stop brute force
        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/otp/verify")) {

            // Extract IP safely behind proxies
            String ip = req.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty()) {
                ip = req.getRemoteAddr();
            }

            Bucket bucket = resolveBucket(ip);

            // Consume 1 token per request
            if (bucket.tryConsume(1)) {
                chain.doFilter(request, response);
                return;
            } else {
                log.warn("Rate limit exceeded for IP {} on {}", ip, path);
                res.setStatus(429); // HTTP 429 Too Many Requests
                res.setContentType("application/json");
                res.getWriter().write(
                        "{\"error\": \"Too Many Requests\", \"message\": \"You have exceeded the maximum number of authentication attempts. Please try again in a minute.\"}");
                return;
            }
        }

        // Pass through non-auth endpoints
        chain.doFilter(request, response);
    }
}
