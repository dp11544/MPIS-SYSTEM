package com.mpsystem.backend.service;

import com.mpsystem.backend.model.Alert;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcasts real-time alerts asynchronously to all subscribed WebSocket
     * clients.
     * The @Async annotation ensures this runs on a separate thread, meaning if the
     * STOMP broker slows down or throws an exception, it won't crash the main
     * AI ingestion thread or prevent the alert from being saved to MongoDB.
     */
    @Async
    public void broadcastAlert(Alert alert) {
        try {
            messagingTemplate.convertAndSend("/topic/alerts", alert);
            log.info(
                    "Alert successfully broadcasted via WebSocket (/topic/alerts) for personName='{}' from cameraId='{}'",
                    alert.getPersonName(), alert.getCameraId());
        } catch (Exception e) {
            log.error("Failed to broadcast alert for personName='{}': {}", alert.getPersonName(), e.getMessage());
            // Fail gracefully - the alert is already secured in MongoDB
        }
    }
}
