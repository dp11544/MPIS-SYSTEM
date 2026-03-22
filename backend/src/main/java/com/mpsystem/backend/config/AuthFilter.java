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

        // ✅ Allow CORS preflight
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        // ✅ PUBLIC ENDPOINTS (NO TOKEN REQUIRED)
        if (isPublicEndpoint(path)) {
            chain.doFilter(request, response);
            return;
        }

        // 🔒 Extract token
        String token = extractToken(req);

        if (token == null || token.isEmpty()) {
            log.warn("Missing authentication token for: {} {}", method, path);
            sendUnauthorized(res, "Unauthorized: Missing Token");
            return;
        }

        // 🔒 Validate token
        if (!jwtUtil.validateToken(token)) {
            log.warn("Invalid or expired token for: {} {}", method, path);
            sendUnauthorized(res, "Unauthorized: Invalid or Expired Token");
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * ✅ FIXED: Public endpoints (LOGIN MUST BE HERE)
     */
   private boolean isPublicEndpoint(String path) {
    return path.startsWith("/api/auth") ||
           path.startsWith("/auth") ||
           path.startsWith("/api/system") ||   // 🔥 ADD THIS (YOUR FIX)
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
     * Extract JWT token
     */
    private String extractToken(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }

        // fallback (legacy)
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