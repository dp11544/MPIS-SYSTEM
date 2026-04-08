import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import api, { silentApi } from '../api/axios';

const CameraContext = createContext();

export const useCamera = () => useContext(CameraContext);

export const CameraProvider = ({ children }) => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const intervalRef = useRef(null);

    // Initialize the hidden video element
    useEffect(() => {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '0';
        video.style.opacity = '0.001';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-9999';
        document.body.appendChild(video);
        videoRef.current = video;

        return () => {
            if (video) document.body.removeChild(video);
        };
    }, []);

    // Start Webcam globally
    const startCamera = async () => {
        if (isCameraActive || cameraStream) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: "environment" }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.error("Video play failed:", e));
            }
            setCameraStream(stream);
            setIsCameraActive(true);

            // ⚡ MUST register camera in backend so Deployment Map displays its alerts!
            await silentApi.post("/cameras/heartbeat", {
                cameraId: activeCameraId.current,
                name: "Laptop Webcam",
                location: "Command Center",
                zone: "HQ",
                description: "Primary Web Console Monitor",
                latitude: 16.5449,
                longitude: 81.5212
            }).catch(e => console.warn("Heartbeat failed", e));

            // Start sending frames globally
            if (!intervalRef.current) {
                intervalRef.current = setInterval(captureAndMatch, 2000);
            }
        } catch (err) {
            console.error("❌ Failed to access global webcam:", err);
            setIsCameraActive(false);
        }
    };

    // Stop Webcam
    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setCameraStream(null);
        setIsCameraActive(false);
    };

    const isProcessingRef = useRef(false);
    
    // Generates a unique Camera ID per session to ensure distinct tracing via backend Caffeine deduplication
    const activeCameraId = useRef(`WEB_FRONTEND_${Math.random().toString(36).substring(2, 10).toUpperCase()}`);

    // Global AI Frame Extraction & Transmission
    const captureAndMatch = async () => {
        if (!videoRef.current || videoRef.current.videoWidth === 0) return;
        if (isProcessingRef.current) return; // Prevent concurrent request flooding

        isProcessingRef.current = true; // Lock

        // ⚡ PAYLOAD OPTIMIZATION: Drastically scale down the extraction width 
        // to prevent large Base64 blobs from saturating MongoDB limits and slowing network HTTP POSTs.
        const MAX_OPTIMAL_WIDTH = 800; 
        const scale = Math.min(1, MAX_OPTIMAL_WIDTH / videoRef.current.videoWidth);
        const w = videoRef.current.videoWidth * scale;
        const h = videoRef.current.videoHeight * scale;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, w, h);

        // Compress extraction blob for rapid AI Inference bandwidth
        canvas.toBlob(async (blob) => {
            if (!blob) {
                isProcessingRef.current = false;
                return;
            }
            const formData = new FormData();
            formData.append("file", blob, "frame.jpg");

            try {
                // Submit frame cleanly
                const res = await silentApi.post("/forensic/match-image", formData);
                
                if (["CONFIDENT_MATCH", "REVIEW_MATCH"].includes(res.data?.status)) {
                    
                    const matchName = res.data.personName || "UNKNOWN";
                    const matchId = res.data.personId || "N/A";
                    const simScore = res.data.similarity || 0.0;
                    const isConfident = res.data.status === "CONFIDENT_MATCH";
                    
                    // Alert tracking logic
                    console.log(`[FRONTEND LOG] Authorized Alert Submission: ${matchName} (Status: ${res.data.status}, Score: ${simScore})`);
                    
                    // Stamp the evidence image on the canvas
                    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
                    ctx.fillRect(10, 10, Math.min(w - 20, 520), 140);
                    
                    ctx.font = "bold 22px monospace";
                    ctx.fillStyle = isConfident ? "#ff4d4d" : "#ffc107"; // Red for Confident, Amber for Review
                    ctx.fillText(isConfident ? `🚨 MPIS EVIDENCE CAPTURE` : `⚠️ MPIS MANUAL REVIEW FLAG`, 25, 45);
                    
                    ctx.font = "bold 18px monospace";
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(`TARGET: ${matchName.toUpperCase()} (${matchId})`, 25, 80);
                    
                    ctx.fillStyle = isConfident ? "#00c864" : "#ffc107";
                    ctx.fillText(`MATCH CONFIDENCE: ${Math.round(simScore * 100)}%`, 25, 110);
                    
                    ctx.fillStyle = "#aaaaaa";
                    ctx.font = "14px monospace";
                    ctx.fillText(`TIMESTAMP: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 25, 135);
                    
                    // ⚡ PAYLOAD OPTIMIZATION: Extremely compressed JPEG to prevent MongoDB bloat (0.40)
                    const evidenceBase64 = canvas.toDataURL("image/jpeg", 0.40);

                    // Zero Trust Unified Ingestion API - Backend is the sole source of truth
                    await api.post('/alerts', {
                        personId: matchId,
                        personName: matchName,
                        similarityScore: simScore,
                        cameraId: activeCameraId.current,
                        evidenceImage: evidenceBase64,
                        detectedAt: Date.now()
                    });
                }
            } catch (err) {
                // 🔁 FAIL-SAFE: Gracefully log rather than silently dying
                console.warn("[SYSTEM LOG] Background inference/ingestion failure. Retrying naturally next interval.");
            } finally {
                // 🔥 CRITICAL: Guarantee lock is released regardless of success or horrific failure.
                isProcessingRef.current = false; 
            }
        }, "image/jpeg", 0.75); // 0.75 tuning for optimized python analysis
    };

    // Automatically keep it running once user logs in or mounts layout
    useEffect(() => {
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line
    }, []);

    const value = {
        isCameraActive,
        cameraStream,
        startCamera,
        stopCamera
    };

    return (
        <CameraContext.Provider value={value}>
            {children}
        </CameraContext.Provider>
    );
};
