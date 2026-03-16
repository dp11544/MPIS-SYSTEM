package com.mpsystem.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "alerts")
public class AlertRecord {

    @Id
    private String id;

    private String personId;
    private String location;
    private double confidence;
    private Date detectedAt = new Date();

    // getters & setters
    public String getId() {
        return id;
    }

    public String getPersonId() {
        return personId;
    }

    public void setPersonId(String personId) {
        this.personId = personId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public Date getDetectedAt() {
        return detectedAt;
    }
}
