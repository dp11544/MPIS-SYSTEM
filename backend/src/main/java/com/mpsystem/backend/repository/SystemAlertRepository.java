package com.mpsystem.backend.repository;

import com.mpsystem.backend.model.SystemAlert;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SystemAlertRepository
        extends MongoRepository<SystemAlert, String> {

    boolean existsByTypeAndCameraId(String type, String cameraId);
}
