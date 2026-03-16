package com.mpsystem.backend.controller;

import com.mpsystem.backend.dto.RealtimeAlertRequest;
import com.mpsystem.backend.dto.RealtimeAlertResponse;
import com.mpsystem.backend.service.RealtimeAlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RealtimeAlertController {

    private final RealtimeAlertService realtimeAlertService;

    /**
     * AI ENGINE INGESTION ENDPOINT
     * URL: POST /api/realtime/alert
     */
    @PostMapping("/alert")
    public ResponseEntity<RealtimeAlertResponse> receiveAlert(
            @Valid @RequestBody RealtimeAlertRequest request) {

        realtimeAlertService.processRealtimeAlert(request);

        return ResponseEntity.ok(
                new RealtimeAlertResponse(
                        "RECEIVED",
                        "Alert request received and queued for processing"
                )
        );
    }
}
