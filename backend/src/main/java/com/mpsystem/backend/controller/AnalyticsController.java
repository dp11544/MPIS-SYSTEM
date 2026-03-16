package com.mpsystem.backend.controller;

import com.mpsystem.backend.dto.AnalyticsResponse;
import com.mpsystem.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Get dashboard analytics data.
     * Returns camera stats, alert counts, demographics, and trends.
     * 
     * @param startDate Optional start date (defaults to 7 days ago)
     * @param endDate Optional end date (defaults to today)
     */
    @GetMapping
    public ResponseEntity<AnalyticsResponse> getAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        // Default to last 7 days if not specified
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        if (startDate == null) {
            startDate = endDate.minusDays(6); // 7 days including today
        }
        
        return ResponseEntity.ok(analyticsService.getAnalytics(startDate, endDate));
    }
}
