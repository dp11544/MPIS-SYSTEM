package com.mpsystem.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "system_alerts")
public class SystemAlert {

    @Id
    private String id;

    private String type;        // CAMERA_OFFLINE / CAMERA_RECOVERED
    private String cameraId;
    private String location;
    private String zone;
    private Instant occurredAt;

    // Required by MongoDB
    protected SystemAlert() {
    }

    // Primary constructor (explicit time control)
    public SystemAlert(
            String type,
            String cameraId,
            String location,
            String zone,
            Instant occurredAt
    ) {
        this.type = type;
        this.cameraId = cameraId;
        this.location = location;
        this.zone = zone;
        this.occurredAt = occurredAt;
    }

    // Convenience constructor (uses now)
    public SystemAlert(
            String type,
            String cameraId,
            String location,
            String zone
    ) {
        this(type, cameraId, location, zone, Instant.now());
    }

    // Getters only (immutable design)
    public String getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getCameraId() {
        return cameraId;
    }

    public String getLocation() {
        return location;
    }

    public String getZone() {
        return zone;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
