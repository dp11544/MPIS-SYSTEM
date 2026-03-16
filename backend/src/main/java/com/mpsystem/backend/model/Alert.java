package com.mpsystem.backend.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "alerts")
public class Alert {

    @Id
    private String id;

    // ================= CORE IDENTIFICATION =================
    private String personId;
    private String personName;

    // ================= MATCHING DATA =================
    private double similarity;
    private ConfidenceLevel confidenceLevel;

    // ================= SOURCE & CONTEXT =================
    private String source;          // UPLOAD / CCTV / MOBILE
    private String cameraId;        // NULL for UPLOAD
    private AlertState state;        // DETECTED / CONFIRMED / DUPLICATE

    // ================= AI EXPLAINABILITY =================
    private String algorithmVersion;
    private String modelUsed;

    // ================= AUDIT =================
    private LocalDateTime detectedAt;
    private String evidenceImagePath;

    // =====================================================
    // REQUIRED BY SPRING DATA (DO NOT REMOVE)
    // =====================================================
    protected Alert() {
        // for MongoDB
    }

    // =====================================================
    // CONSTRUCTOR FOR REAL-TIME CCTV ALERTS
    // =====================================================
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

    // =====================================================
    // CONSTRUCTOR FOR IMAGE UPLOAD / MANUAL ALERTS
    // =====================================================
    public Alert(
            String personId,
            String personName,
            double similarity,
            ConfidenceLevel confidenceLevel,
            String source,
            String algorithmVersion
    ) {
        this.personId = personId;
        this.personName = personName;
        this.similarity = similarity;
        this.confidenceLevel = confidenceLevel;
        this.source = source;
        this.cameraId = null;
        this.algorithmVersion = algorithmVersion;
        this.modelUsed = algorithmVersion;
        this.state = AlertState.CONFIRMED;
        this.detectedAt = LocalDateTime.now();
        this.evidenceImagePath = null;
    }

    // ================= GETTERS ONLY =================

    public String getId() {
        return id;
    }

    public String getPersonId() {
        return personId;
    }

    public String getPersonName() {
        return personName;
    }

    public double getSimilarity() {
        return similarity;
    }

    public ConfidenceLevel getConfidenceLevel() {
        return confidenceLevel;
    }

    public String getSource() {
        return source;
    }

    public String getCameraId() {
        return cameraId;
    }

    public AlertState getState() {
        return state;
    }

    public String getAlgorithmVersion() {
        return algorithmVersion;
    }

    public String getModelUsed() {
        return modelUsed;
    }

    public LocalDateTime getDetectedAt() {
        return detectedAt;
    }

    public String getEvidenceImagePath() {
        return evidenceImagePath;
    }
}
