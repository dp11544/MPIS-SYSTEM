package com.mpsystem.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Data
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "cameras")
public class Camera {

    @Id
    private String id;

    @Field("cameraId")
    private String cameraId;

    @Field("name")
    private String name;              // Human-readable camera name

    @Field("location")
    private String location;

    @Field("zone")
    private String zone;

    @Field("description")
    private String description;

    @Field("latitude")
    private Double latitude;          // GPS coordinates for map display

    @Field("longitude")
    private Double longitude;

    @Field("status")
    private CameraStatus status;      // ONLINE / OFFLINE

    @Field("lastHeartbeatAt")
    private Instant lastHeartbeatAt;
}
