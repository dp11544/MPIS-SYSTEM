Code Snippet 1 – Backend Alert Processing
 @PostMapping("/alert")
    public ResponseEntity<RealtimeAlertResponse> receiveAlert(
            @Valid @RequestBody RealtimeAlertRequest request) {

        realtimeAlertService.processRealtimeAlert(request);

        return ResponseEntity.ok(
                new RealtimeAlertResponse(
                        "RECEIVED",
                        "Alert request received and queued for processing"
                )
