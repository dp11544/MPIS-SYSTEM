import React, { useState, useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';
import AlertCard from '../components/widgets/AlertCard';
import api from '../api/axios';
import webSocketService from '../services/WebSocketService';
import toast from '../utils/toast';

const LiveAlerts = () => {
    const [liveFeed, setLiveFeed] = useState([]);
    const [newAlertTrigger, setNewAlertTrigger] = useState(false);

    const feedRef = useRef(null);
    const videoRef = useRef(null);

    // =========================================================
    // 🔥 START CAMERA (REAL LIVE FEED)
    // =========================================================
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });
                videoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Camera error:", err);
                toast.error("Camera access denied");
            }
        };

        startCamera();
    }, []);

    // =========================================================
    // 🔥 AUTO MATCH LOOP (EVERY 2 SEC)
    // =========================================================
    useEffect(() => {
        const interval = setInterval(() => {
            captureAndMatch();
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const captureAndMatch = async () => {
        if (!videoRef.current) return;

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
                const res = await api.post("/forensic/match-image", formData);

                if (res.data.status === "CONFIDENT_MATCH") {
                    console.log("MATCH FOUND:", res.data);
                }

            } catch (err) {
                console.error("Match error", err);
            }
        }, "image/jpeg");
    };

    // =========================================================
    // INITIAL LOAD + WEBSOCKET
    // =========================================================
    useEffect(() => {

        let isMounted = true;

        const fetchLatest = async () => {
            try {
                const res = await api.get('/alerts/latest');
                if (isMounted && res.data) {
                    setLiveFeed(res.data.slice(0, 10));
                }
            } catch (err) {
                console.error("Initial alerts fetch failed", err);
            }
        };

        fetchLatest();

        const handleNewAlert = (alert) => {
            if (!isMounted) return;

            setLiveFeed(prev => [alert, ...prev].slice(0, 50));
            setNewAlertTrigger(true);

            setTimeout(() => setNewAlertTrigger(false), 3000);

            if (feedRef.current) {
                feedRef.current.scrollTop = 0;
            }
        };

        webSocketService.subscribe('/topic/alerts', handleNewAlert);

        return () => {
            isMounted = false;
            webSocketService.unsubscribe('/topic/alerts');
        };

    }, []);

    // =========================================================
    // SIMULATION
    // =========================================================
    const simulateAlert = () => {

        const mockAlert = {
            id: `SIM-${Date.now()}`,
            personId: 'SIMULATED',
            personName: 'Demo Target',
            similarity: 0.92,
            confidenceLevel: 'HIGH',
            detectedAt: new Date().toISOString(),
            cameraId: 'CAM_01'
        };

        setLiveFeed(prev => [mockAlert, ...prev].slice(0, 50));
        setNewAlertTrigger(true);

        setTimeout(() => setNewAlertTrigger(false), 3000);

        toast.info("Simulated alert injected");
    };

    // =========================================================
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* HEADER */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1>Live Surveillance Console</h1>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        background: 'red',
                        borderRadius: '50%'
                    }} />
                    ACTIVE MONITORING
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '1.5rem',
                flex: 1
            }}>

                {/* 🔥 CAMERA (FIXED) */}
                <div style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#000'
                }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* ALERTS */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '1rem'
                }}>

                    <h3>Live Alerts ({liveFeed.length})</h3>

                    <div
                        ref={feedRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}
                    >
                        {liveFeed.length === 0 ? (
                            <p>No alerts yet</p>
                        ) : (
                            liveFeed.map((alert, index) => (
                                <AlertCard
                                    key={alert.id || index}
                                    alert={alert}
                                    isNew={index === 0 && newAlertTrigger}
                                />
                            ))
                        )}
                    </div>

                    <button onClick={simulateAlert} style={{ marginTop: '10px' }}>
                        Simulate Alert
                    </button>

                </div>
            </div>
        </div>
    );
};

export default LiveAlerts;