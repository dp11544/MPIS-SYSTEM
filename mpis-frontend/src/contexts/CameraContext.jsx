import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

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

    // Global AI Frame Extraction & Transmission
    const captureAndMatch = async () => {
        if (!videoRef.current || videoRef.current.videoWidth === 0) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append("file", blob, "frame.jpg");

            try {
                // Silently push frames to AI engine across all tabs
                const res = await api.post("/forensic/match-image", formData);
                if (res.data?.status === "CONFIDENT_MATCH") {
                    console.log("✅ GLOBAL MATCH DETECTED:", res.data);
                    
                    const matchName = res.data.personName || "UNKNOWN";
                    const matchId = res.data.personId || "N/A";
                    const simScore = res.data.similarity || 0.90;
                    
                    // Stamp the evidence image on the canvas
                    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                    ctx.fillRect(10, 10, 520, 140);
                    
                    ctx.font = "bold 22px monospace";
                    ctx.fillStyle = "#ff4d4d"; // Red alert text
                    ctx.fillText(`🚨 MPIS EVIDENCE CAPTURE`, 25, 45);
                    
                    ctx.font = "bold 18px monospace";
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(`TARGET: ${matchName.toUpperCase()} (${matchId})`, 25, 80);
                    
                    ctx.fillStyle = "#00c864";
                    ctx.fillText(`MATCH CONFIDENCE: ${Math.round(simScore * 100)}%`, 25, 110);
                    
                    ctx.fillStyle = "#aaaaaa";
                    ctx.font = "14px monospace";
                    ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 25, 135);
                    
                    const evidenceBase64 = canvas.toDataURL("image/jpeg", 0.65);

                    // Ingest alert directly to backend pipeline
                    api.post('/alerts', {
                        personId: matchId,
                        personName: matchName,
                        similarityScore: simScore,
                        cameraId: "WEB_FRONTEND",
                        evidenceImage: evidenceBase64,
                        detectedAt: Date.now()
                    }).catch(err => console.error("Global alert ingestion failed:", err));
                }
            } catch (err) {
                // Keep catching silently so background process doesn't explode
                // console.error("Global capture error:", err);
            }
        }, "image/jpeg", 0.90);
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
