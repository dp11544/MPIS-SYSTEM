package com.mpsystem.backend.service;

import com.mpsystem.backend.model.Person;

public class MatchResult {

    private Person person;
    private double similarity;

    public MatchResult(Person person, double similarity) {
        this.person = person;
        this.similarity = similarity;
    }

    public Person getPerson() {
        return person;
    }

    public double getSimilarity() {
        return similarity;
    }

    public boolean isMatch() {
        return person != null && similarity >= 0.75;
    }
}
