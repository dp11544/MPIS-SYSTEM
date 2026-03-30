package com.mpsystem.backend.service;

import com.mpsystem.backend.dto.AnalyticsResponse;
import com.mpsystem.backend.dto.AnalyticsResponse.DayData;
import com.mpsystem.backend.model.CameraStatus;
import com.mpsystem.backend.model.Person;
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

        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            log.warn("Invalid date range for analytics");
            return new AnalyticsResponse();
        }

        long totalCameras = cameraRepository.count();
        long onlineCameras = cameraRepository.countByStatus(CameraStatus.ONLINE);

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long alertsToday = alertRepository.countByDetectedAtAfter(startOfDay);

        long totalPersons = personRepository.count();

        double avgConfidence = calculateAverageConfidence();

        List<DayData> alertTimeline = calculateAlertTimeline(startDate, endDate);

        // 🔥 FIXED GENDER COUNT (SAFE)
        List<Person> allPersons = personRepository.findAll();

        long maleCount = allPersons.stream()
                .filter(p -> {
                    String g = p.getGender();
                    return g != null && g.trim().toLowerCase().startsWith("m");
                })
                .count();

        long femaleCount = allPersons.stream()
                .filter(p -> {
                    String g = p.getGender();
                    return g != null && g.trim().toLowerCase().startsWith("f");
                })
                .count();

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

    // ---------------------------------------------------------
    private double calculateAverageConfidence() {

        var recentAlerts = alertRepository.findTop50ByOrderByDetectedAtDesc();

        if (recentAlerts == null || recentAlerts.isEmpty()) return 0.0;

        double sum = recentAlerts.stream()
                .mapToDouble(a -> a.getSimilarity())
                .sum();

        return Math.round((sum / recentAlerts.size()) * 100.0 * 10.0) / 10.0;
    }

    // ---------------------------------------------------------
    private List<DayData> calculateAlertTimeline(LocalDate startDate, LocalDate endDate) {

        List<DayData> timeline = new ArrayList<>();
        long daysBetween = ChronoUnit.DAYS.between(startDate, endDate) + 1;

        DateTimeFormatter labelFormatter;

        if (daysBetween <= 31) {

            labelFormatter = DateTimeFormatter.ofPattern("MMM d");

            for (LocalDate day = startDate; !day.isAfter(endDate); day = day.plusDays(1)) {

                LocalDateTime start = day.atStartOfDay();
                LocalDateTime end = day.atTime(LocalTime.MAX);

                long count = alertRepository.countByDetectedAtBetween(start, end);

                timeline.add(DayData.builder()
                        .date(day.toString())
                        .label(day.format(labelFormatter))
                        .count((int) count)
                        .build());
            }

        } else if (daysBetween <= 366) {

            LocalDate monthStart = startDate.withDayOfMonth(1);

            while (!monthStart.isAfter(endDate)) {

                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                if (monthEnd.isAfter(endDate)) {
                    monthEnd = endDate;
                }

                LocalDateTime start = monthStart.isBefore(startDate)
                        ? startDate.atStartOfDay()
                        : monthStart.atStartOfDay();

                LocalDateTime end = monthEnd.atTime(LocalTime.MAX);

                long count = alertRepository.countByDetectedAtBetween(start, end);

                timeline.add(DayData.builder()
                        .date(monthStart.toString())
                        .label(monthStart.format(DateTimeFormatter.ofPattern("MMM")))
                        .count((int) count)
                        .build());

                monthStart = monthStart.plusMonths(1);
            }

        } else {

            LocalDate quarterStart = startDate.withDayOfMonth(1);
            int startMonth = ((quarterStart.getMonthValue() - 1) / 3) * 3 + 1;
            quarterStart = quarterStart.withMonth(startMonth);

            while (!quarterStart.isAfter(endDate)) {

                LocalDate quarterEnd = quarterStart.plusMonths(3).minusDays(1);
                if (quarterEnd.isAfter(endDate)) {
                    quarterEnd = endDate;
                }

                LocalDateTime start = quarterStart.isBefore(startDate)
                        ? startDate.atStartOfDay()
                        : quarterStart.atStartOfDay();

                LocalDateTime end = quarterEnd.atTime(LocalTime.MAX);

                long count = alertRepository.countByDetectedAtBetween(start, end);

                int quarter = (quarterStart.getMonthValue() - 1) / 3 + 1;

                timeline.add(DayData.builder()
                        .date(quarterStart.toString())
                        .label("Q" + quarter + " " + quarterStart.getYear())
                        .count((int) count)
                        .build());

                quarterStart = quarterStart.plusMonths(3);
            }
        }

        return timeline;
    }

    // ---------------------------------------------------------
    private Map<String, Long> calculateAgeGroups() {

        Map<String, Long> ageGroups = new LinkedHashMap<>();

        ageGroups.put("0-18", personRepository.countByAgeLessThanEqual(18));
        ageGroups.put("19-35", personRepository.countByAgeBetween(19, 35));
        ageGroups.put("36-49", personRepository.countByAgeBetween(36, 49));

        // 🔥 FIX: avoid missing method
        long above50 = personRepository.count() -
                personRepository.countByAgeLessThanEqual(49);

        ageGroups.put("50+", above50);

        return ageGroups;
    }
}