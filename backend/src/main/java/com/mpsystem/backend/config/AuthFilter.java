package com.mpsystem.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import com.mpsystem.backend.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * MPIS Authentication Filter
 * 
 * Validates JWT tokens for protected endpoints.
 * Supports standard Authorization: Bearer token header.
 */
@Component
public class AuthFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(AuthFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";
    
    private final JwtUtil jwtUtil;

    @Autowired
    public AuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();
        String method = req.getMethod();

        // Allow CORS pre-flight requests
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        // Public endpoints that don't require authentication
        if (isPublicEndpoint(path)) {
            chain.doFilter(request, response);
            return;
        }

        // Extract token from Authorization header
        String token = extractToken(req);

        if (token == null || token.isEmpty()) {
            log.warn("Missing authentication token for: {} {}", method, path);
            sendUnauthorized(res, "Unauthorized: Missing Token");
            return;
        }

        // Validate JWT signature and expiration
        if (!jwtUtil.validateToken(token)) {
            log.warn("Invalid or expired token for: {} {}", method, path);
            sendUnauthorized(res, "Unauthorized: Invalid or Expired Token");
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * Check if the endpoint is public (no auth required)
     */
   private boolean isPublicEndpoint(String path) {
    return path.startsWith("/api/auth") ||
           path.startsWith("/api/persons") ||
           path.startsWith("/api/realtime") ||
           path.startsWith("/api/cameras") ||
           path.startsWith("/api/alerts") ||
           path.startsWith("/api/match") ||
           path.startsWith("/uploads/") ||
           path.startsWith("/actuator") ||
           path.startsWith("/health") ||
           path.startsWith("/ws-alerts");
}
    /**
     * Extract JWT token from Authorization header.
     * Supports both "Bearer token" and legacy "X-SESSION-TOKEN" header.
     */
    private String extractToken(HttpServletRequest req) {
        // Primary: Standard Authorization header
        String authHeader = req.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        
        // Fallback: Legacy custom header (for backward compatibility)
        String legacyToken = req.getHeader("X-SESSION-TOKEN");
        if (legacyToken != null && !legacyToken.isEmpty()) {
            return legacyToken;
        }
        
        return null;
    }

    /**
     * Send unauthorized response
     */
    private void sendUnauthorized(HttpServletResponse res, String message) throws IOException {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\": \"" + message + "\"}");
    }
}
