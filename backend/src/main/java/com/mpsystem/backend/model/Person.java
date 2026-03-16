package com.mpsystem.backend.model;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.NotBlank;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "persons")
public class Person {

    @Id
    private String id;

    @NotBlank(message = "Name is required")
    private String name;

    private Integer age; // safer than int

    @NotBlank(message = "Gender is required")
    private String gender;

    private String lastSeenLocation;
    private String photoPath;
    private String contactNumber;

    // 🔥 AI FACE DATA
    private List<List<Double>> faceEmbeddings;

    // 🔐 Audit field
    private LocalDateTime createdAt;

    // ✅ Default constructor
    public Person() {
        this.createdAt = LocalDateTime.now();
    }

    // ===== GETTERS & SETTERS =====

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getLastSeenLocation() {
        return lastSeenLocation;
    }

    public void setLastSeenLocation(String lastSeenLocation) {
        this.lastSeenLocation = lastSeenLocation;
    }

    public String getPhotoPath() {
        return photoPath;
    }

    public void setPhotoPath(String photoPath) {
        this.photoPath = photoPath;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }

    public List<List<Double>> getFaceEmbeddings() {
        return faceEmbeddings;
    }

    public void setFaceEmbeddings(List<List<Double>> faceEmbeddings) {
        this.faceEmbeddings = faceEmbeddings;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    // ✅ Added setter (important for MongoDB)
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
