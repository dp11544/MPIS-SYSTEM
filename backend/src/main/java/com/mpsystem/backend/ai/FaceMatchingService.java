package com.mpsystem.backend.ai;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FaceMatchingService {

    /**
     * Calculates cosine similarity between two face embeddings.
     * Range: [-1, 1], higher means more similar.
     */
    public double calculateSimilarity(List<Double> v1, List<Double> v2) {

        if (v1 == null || v2 == null || v1.isEmpty() || v2.isEmpty()) {
            throw new IllegalArgumentException("Embedding vectors must not be null or empty");
        }

        if (v1.size() != v2.size()) {
            throw new IllegalArgumentException(
                    "Embedding vectors must be of same length"
            );
        }

        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < v1.size(); i++) {
            double a = v1.get(i);
            double b = v2.get(i);

            dot += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA == 0.0 || normB == 0.0) {
            throw new IllegalArgumentException("Embedding norm must not be zero");
        }

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
