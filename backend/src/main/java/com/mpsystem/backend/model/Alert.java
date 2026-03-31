package com.mpsystem.backend.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "alerts")
public class Alert {

    @Id
    private String id;

    private String personId;
    private String personName;

    private double similarity;
    private ConfidenceLevel confidenceLevel;

    private String source;
    private String cameraId;
    private AlertState state;

    private String algorithmVersion;
    private String modelUsed;

    private LocalDateTime detectedAt;
    private String evidenceImagePath;

    protected Alert() {}

    public Alert(
            String personId,
            String personName,
            double similarity,
            ConfidenceLevel confidenceLevel,
            String source,
            String cameraId,
            String algorithmVersion,
            String modelUsed,
            AlertState state
    ) {
        this.personId = personId;
        this.personName = personName;
        this.similarity = similarity;
        this.confidenceLevel = confidenceLevel;
        this.source = source;
        this.cameraId = cameraId;
        this.algorithmVersion = algorithmVersion;
        this.modelUsed = modelUsed;
        this.state = state;
        this.detectedAt = LocalDateTime.now();
        this.evidenceImagePath = null;
    }

    // ===== GETTERS =====

    public String getId() { return id; }
    public String getPersonId() { return personId; }
    public String getPersonName() { return personName; }
    public double getSimilarity() { return similarity; }
    public ConfidenceLevel getConfidenceLevel() { return confidenceLevel; }
    public String getSource() { return source; }
    public String getCameraId() { return cameraId; }
    public AlertState getState() { return state; }
    public String getAlgorithmVersion() { return algorithmVersion; }
    public String getModelUsed() { return modelUsed; }
    public LocalDateTime getDetectedAt() { return detectedAt; }
    public String getEvidenceImagePath() { return evidenceImagePath; }

    public void setEvidenceImagePath(String evidenceImagePath) {
        this.evidenceImagePath = evidenceImagePath;
    }
}