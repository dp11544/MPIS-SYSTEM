package com.mpsystem.backend.dto;

import java.util.List;

/**
 * DTO for returning person embeddings to CCTV stream matching.
 * Supports multiple embeddings per person for improved accuracy.
 */
public class PersonEmbeddingDTO {
    
    private String personId;
    private String name;
    private List<List<Double>> embeddings;  // Support multiple embeddings

    public PersonEmbeddingDTO() {}

    public PersonEmbeddingDTO(String personId, String name, List<List<Double>> embeddings) {
        this.personId = personId;
        this.name = name;
        this.embeddings = embeddings;
    }

    // Getters and Setters
    public String getPersonId() {
        return personId;
    }

    public void setPersonId(String personId) {
        this.personId = personId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<List<Double>> getEmbeddings() {
        return embeddings;
    }

    public void setEmbeddings(List<List<Double>> embeddings) {
        this.embeddings = embeddings;
    }
}
