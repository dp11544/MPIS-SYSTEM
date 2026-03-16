package com.mpsystem.backend.service;

import com.mpsystem.backend.dto.AnalyticsResponse;
import com.mpsystem.backend.dto.AnalyticsResponse.DayData;
import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.CameraStatus;
import com.mpsystem.backend.repository.AlertRepository;
import com.mpsystem.backend.repository.CameraRepository;
import com.mpsystem.backend.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final CameraRepository cameraRepository;
    private final AlertRepository alertRepository;
    private final PersonRepository personRepository;

    public AnalyticsResponse getAnalytics(LocalDate startDate, LocalDate endDate) {
        
        // Camera stats
        long totalCameras = cameraRepository.count();
        long onlineCameras = cameraRepository.countByStatus(CameraStatus.ONLINE);
        
        // Alerts today
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long alertsToday = alertRepository.countByDetectedAtAfter(startOfDay);
        
        // Total persons registered
        long totalPersons = personRepository.count();
        
        // Average confidence from recent alerts
        double avgConfidence = calculateAverageConfidence();
        
        // Alert timeline based on date range
        List<DayData> alertTimeline = calculateAlertTimeline(startDate, endDate);
        
        // Gender distribution
        long maleCount = personRepository.countByGenderIgnoreCase("Male") 
                       + personRepository.countByGenderIgnoreCase("M");
        long femaleCount = personRepository.countByGenderIgnoreCase("Female") 
                         + personRepository.countByGenderIgnoreCase("F");
        
        // Age demographics
        Map<String, Long> ageGroups = calculateAgeGroups();
        
        return AnalyticsResponse.builder()
                .totalCameras(totalCameras)
                .onlineCameras(onlineCameras)
                .avgConfidence(avgConfidence)
                .alertsToday(alertsToday)
                .totalPersons(totalPersons)
                .alertTimeline(alertTimeline)
                .maleCount(maleCount)
                .femaleCount(femaleCount)
                .ageGroups(ageGroups)
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .build();
    }

    private double calculateAverageConfidence() {
        List<Alert> recentAlerts = alertRepository.findTop50ByOrderByDetectedAtDesc();
        
        if (recentAlerts.isEmpty()) {
            return 0.0;
        }
        
        double sum = recentAlerts.stream()
                .mapToDouble(Alert::getSimilarity)
                .sum();
        
        return Math.round((sum / recentAlerts.size()) * 1000.0) / 10.0; // Convert to percentage with 1 decimal
    }

    private List<DayData> calculateAlertTimeline(LocalDate startDate, LocalDate endDate) {
        List<DayData> timeline = new ArrayList<>();
        long daysBetween = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        
        DateTimeFormatter labelFormatter;
        
        // Determine grouping based on date range
        if (daysBetween <= 31) {
            // Daily grouping for up to 31 days
            labelFormatter = DateTimeFormatter.ofPattern("MMM d");
            
            for (LocalDate day = startDate; !day.isAfter(endDate); day = day.plusDays(1)) {
                LocalDateTime dayStart = day.atStartOfDay();
                LocalDateTime dayEnd = day.atTime(LocalTime.MAX);
                
                List<Alert> dayAlerts = alertRepository.findByDetectedAtBetween(dayStart, dayEnd);
                
                timeline.add(DayData.builder()
                        .date(day.toString())
                        .label(day.format(labelFormatter))
                        .count(dayAlerts.size())
                        .build());
            }
        } else if (daysBetween <= 366) {
            // Monthly grouping for up to a year
            labelFormatter = DateTimeFormatter.ofPattern("MMM yyyy");
            
            LocalDate monthStart = startDate.withDayOfMonth(1);
            while (!monthStart.isAfter(endDate)) {
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                if (monthEnd.isAfter(endDate)) {
                    monthEnd = endDate;
                }
                
                LocalDateTime periodStart = monthStart.isBefore(startDate) ? startDate.atStartOfDay() : monthStart.atStartOfDay();
                LocalDateTime periodEnd = monthEnd.atTime(LocalTime.MAX);
                
                List<Alert> monthAlerts = alertRepository.findByDetectedAtBetween(periodStart, periodEnd);
                
                timeline.add(DayData.builder()
                        .date(monthStart.toString())
                        .label(monthStart.format(DateTimeFormatter.ofPattern("MMM")))
                        .count(monthAlerts.size())
                        .build());
                
                monthStart = monthStart.plusMonths(1);
            }
        } else {
            // Quarterly grouping for multi-year ranges
            labelFormatter = DateTimeFormatter.ofPattern("Q yyyy");
            
            LocalDate quarterStart = startDate.withDayOfMonth(1);
            int startMonth = ((quarterStart.getMonthValue() - 1) / 3) * 3 + 1;
            quarterStart = quarterStart.withMonth(startMonth);
            
            while (!quarterStart.isAfter(endDate)) {
                LocalDate quarterEnd = quarterStart.plusMonths(3).minusDays(1);
                if (quarterEnd.isAfter(endDate)) {
                    quarterEnd = endDate;
                }
                
                LocalDateTime periodStart = quarterStart.isBefore(startDate) ? startDate.atStartOfDay() : quarterStart.atStartOfDay();
                LocalDateTime periodEnd = quarterEnd.atTime(LocalTime.MAX);
                
                List<Alert> quarterAlerts = alertRepository.findByDetectedAtBetween(periodStart, periodEnd);
                
                int quarter = (quarterStart.getMonthValue() - 1) / 3 + 1;
                timeline.add(DayData.builder()
                        .date(quarterStart.toString())
                        .label("Q" + quarter + " " + quarterStart.getYear())
                        .count(quarterAlerts.size())
                        .build());
                
                quarterStart = quarterStart.plusMonths(3);
            }
        }
        
        return timeline;
    }

    private Map<String, Long> calculateAgeGroups() {
        Map<String, Long> ageGroups = new LinkedHashMap<>(); // Preserve order
        
        // 0-18 years
        long age0to18 = personRepository.countByAgeLessThanEqual(18);
        
        // 19-35 years
        long age19to35 = personRepository.countByAgeBetween(19, 35);
        
        // 36-50 years
        long age36to50 = personRepository.countByAgeBetween(36, 50);
        
        // 50+ years
        long age50plus = personRepository.countByAgeGreaterThan(50);
        
        ageGroups.put("0-18", age0to18);
        ageGroups.put("19-35", age19to35);
        ageGroups.put("36-50", age36to50);
        ageGroups.put("50+", age50plus);
        
        return ageGroups;
    }
}
