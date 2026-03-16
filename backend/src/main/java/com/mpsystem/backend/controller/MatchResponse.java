package com.mpsystem.backend.controller;

import com.mpsystem.backend.model.ConfidenceLevel;

public class MatchResponse {

    private boolean match;
    private String personId;
    private String name;
    private double similarity;
    private ConfidenceLevel confidenceLevel;

    public MatchResponse(boolean match,
                         String personId,
                         String name,
                         double similarity,
                         ConfidenceLevel confidenceLevel) {
        this.match = match;
        this.personId = personId;
        this.name = name;
        this.similarity = similarity;
        this.confidenceLevel = confidenceLevel;
    }

    public boolean isMatch() {
        return match;
    }

    public String getPersonId() {
        return personId;
    }

    public String getName() {
        return name;
    }

    public double getSimilarity() {
        return similarity;
    }

    public ConfidenceLevel getConfidenceLevel() {
        return confidenceLevel;
    }
}
