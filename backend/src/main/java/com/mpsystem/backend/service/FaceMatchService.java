package com.mpsystem.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.mpsystem.backend.model.ConfidenceLevel;
import com.mpsystem.backend.model.Person;
import com.mpsystem.backend.repository.PersonRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FaceMatchService {

    private final PersonRepository personRepository;

    private static final int EMBEDDING_SIZE = 512;

    public FaceMatchService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    // 🔥 Find best match (optimized)
    public MatchResult findBestMatch(List<Double> inputEmbedding) {

        // 🔴 VALIDATION
        if (inputEmbedding == null || inputEmbedding.size() != EMBEDDING_SIZE) {
            log.error("Invalid input embedding");
            return new MatchResult(null, 0.0);
        }

        List<Person> persons = personRepository.findAll();

        Person bestMatch = null;
        double highestSimilarity = 0.0;

        for (Person person : persons) {

            if (person.getFaceEmbeddings() == null || person.getFaceEmbeddings().isEmpty()) {
                continue;
            }

            for (List<Double> emb : person.getFaceEmbeddings()) {

                if (emb == null || emb.size() != EMBEDDING_SIZE) continue;

                double similarity = cosineSimilarity(inputEmbedding, emb);

                // 🔥 EARLY EXIT (BIG OPTIMIZATION)
                if (similarity >= 0.98) {
                    log.info("Perfect match found early → {}", person.getName());
                    return new MatchResult(person, similarity);
                }

                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestMatch = person;
                }
            }
        }

        log.info("Best match similarity: {}", highestSimilarity);

        return new MatchResult(bestMatch, highestSimilarity);
    }

    // 🔹 Cosine Similarity
    private double cosineSimilarity(List<Double> v1, List<Double> v2) {

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < EMBEDDING_SIZE; i++) {
            double a = v1.get(i);
            double b = v2.get(i);

            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        double denominator = Math.sqrt(normA) * Math.sqrt(normB);

        if (denominator < 1e-10) {
            return 0.0;
        }

        return dotProduct / denominator;
    }

    // 🔹 Confidence Level
    public ConfidenceLevel calculateConfidence(double similarity) {

        if (similarity >= 0.90) return ConfidenceLevel.VERY_HIGH;
        if (similarity >= 0.80) return ConfidenceLevel.HIGH;
        if (similarity >= 0.70) return ConfidenceLevel.MEDIUM;

        return ConfidenceLevel.LOW;
    }
}