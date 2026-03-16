package com.mpsystem.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTO for analytics dashboard data.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsResponse {

    private long totalCameras;
    private long onlineCameras;
    private double avgConfidence;
    private long alertsToday;
    private long totalPersons;
    
    // Alert counts per day with date labels
    private List<DayData> alertTimeline;
    
    // Gender distribution
    private long maleCount;
    private long femaleCount;
    
    // Age demographics
    private Map<String, Long> ageGroups;
    
    // Period info
    private String startDate;
    private String endDate;
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DayData {
        private String date;      // YYYY-MM-DD
        private String label;     // "Mar 1" or "Jan" for month view
        private long count;
    }
}
