package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.Camera;
import com.mpsystem.backend.model.CameraStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CameraRepository extends MongoRepository<Camera, String> {

    Optional<Camera> findByCameraId(String cameraId);

    long countByStatus(com.mpsystem.backend.model.CameraStatus status);

    List<Camera> findByStatus(CameraStatus status);
}
