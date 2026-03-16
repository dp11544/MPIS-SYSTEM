package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.PersonTrack;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PersonTrackRepository
        extends MongoRepository<PersonTrack, String> {

    /**
     * Fetch the most recent track for a person
     * Used to decide whether to extend an existing track
     * or create a new one.
     */
    Optional<PersonTrack> findTopByPersonIdOrderByLastSeenAtDesc(String personId);
}
