package com.mpsystem.backend.service;

import com.mpsystem.backend.model.Alert;
import com.mpsystem.backend.model.PersonTrack;
import com.mpsystem.backend.model.TrackEvent;
import com.mpsystem.backend.repository.PersonTrackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PersonTrackingService {

    private static final Duration TRACK_WINDOW = Duration.ofMinutes(10);

    private final PersonTrackRepository personTrackRepository;

    public void handleNewAlert(Alert alert) {

        // ✅ FIX: normalize to UTC
        Instant detectedAt = alert.getDetectedAt()
                .atZone(ZoneId.of("UTC"))
                .toInstant();

        String personId = alert.getPersonId();

        Optional<PersonTrack> lastTrackOpt =
                personTrackRepository.findTopByPersonIdOrderByLastSeenAtDesc(personId);

        if (lastTrackOpt.isEmpty()) {
            createNewTrack(alert, detectedAt);
            return;
        }

        PersonTrack lastTrack = lastTrackOpt.get();

        boolean withinTimeWindow =
                Duration.between(lastTrack.getLastSeenAt(), detectedAt)
                        .compareTo(TRACK_WINDOW) <= 0;

        if (withinTimeWindow) {
            appendToExistingTrack(lastTrack, alert, detectedAt);
        } else {
            createNewTrack(alert, detectedAt);
        }
    }

    private void appendToExistingTrack(PersonTrack track, Alert alert, Instant detectedAt) {

        TrackEvent event = TrackEvent.builder()
                .alertId(alert.getId())
                .cameraId(alert.getCameraId())
                .detectedAt(detectedAt)
                .build();

        track.getEvents().add(event);
        track.setLastSeenAt(detectedAt);

        personTrackRepository.save(track);
    }

    private void createNewTrack(Alert alert, Instant detectedAt) {

        TrackEvent event = TrackEvent.builder()
                .alertId(alert.getId())
                .cameraId(alert.getCameraId())
                .detectedAt(detectedAt)
                .build();

        PersonTrack newTrack = PersonTrack.builder()
                .personId(alert.getPersonId())
                .events(new ArrayList<>(List.of(event)))
                .startedAt(detectedAt)
                .lastSeenAt(detectedAt)
                .build();

        personTrackRepository.save(newTrack);
    }
}
