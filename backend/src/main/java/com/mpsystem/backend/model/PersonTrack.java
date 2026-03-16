package com.mpsystem.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "person_tracks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonTrack {

    @Id
    private String id;

    // Reference to existing Person (do NOT embed person object)
    private String personId;

    // Ordered movement history across cameras
    private List<TrackEvent> events;

    // When this track started
    private Instant startedAt;

    // Last time the person was seen in this track
    private Instant lastSeenAt;
}
