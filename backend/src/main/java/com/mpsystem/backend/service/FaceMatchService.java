package com.mpsystem.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.repository.PersonRepository;

@Service
public class FaceMatchService {

    private final PersonRepository personRepository;

    public FaceMatchService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    // 🔹 Find best matching person
    public MatchResult findBestMatch(List<Double> inputEmbedding) {

        List<Person> persons = personRepository.findAll();

        Person bestMatch = null;
        double highestSimilarity = 0.0;

        for (Person person : persons) {
            if (person.getFaceEmbeddings() == null || person.getFaceEmbeddings().isEmpty()) continue;

            double maxSimForPerson = 0.0;
            for (List<Double> emb : person.getFaceEmbeddings()) {
                if (emb == null || emb.isEmpty()) continue;
                double similarity = cosineSimilarity(inputEmbedding, emb);
                if (similarity > maxSimForPerson) {
                    maxSimForPerson = similarity;
                }
            }

            if (maxSimForPerson > highestSimilarity) {
                highestSimilarity = maxSimForPerson;
                bestMatch = person;
            }
        }

        return new MatchResult(bestMatch, highestSimilarity);
    }

    // 🔹 Cosine Similarity Function
    private double cosineSimilarity(List<Double> v1, List<Double> v2) {
        if (v1 == null || v2 == null || v1.size() != v2.size() || v1.isEmpty()) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < v1.size(); i++) {
            dotProduct += v1.get(i) * v2.get(i);
            normA += Math.pow(v1.get(i), 2);
            normB += Math.pow(v2.get(i), 2);
        }

        double denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator < 1e-10) {
            return 0.0;
        }
        return dotProduct / denominator;
    }

    // 🔹 Confidence Level Calculation (CBI / Police Logic)
    public ConfidenceLevel calculateConfidence(double similarity) {

        if (similarity >= 0.90) {
            return ConfidenceLevel.VERY_HIGH;
        } else if (similarity >= 0.80) {
            return ConfidenceLevel.HIGH;
        } else if (similarity >= 0.70) {
            return ConfidenceLevel.MEDIUM;
        } else {
            return ConfidenceLevel.LOW;
        }
    }
}
