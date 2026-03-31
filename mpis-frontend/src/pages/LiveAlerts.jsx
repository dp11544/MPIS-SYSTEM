import React, { useState, useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';
import AlertCard from '../components/widgets/AlertCard';
import api from '../api/axios';
import webSocketService from '../services/WebSocketService';
import toast from '../utils/toast';
import { useCamera } from '../contexts/CameraContext';

const LiveAlerts = () => {
    const [liveFeed, setLiveFeed] = useState([]);
    const [newAlertTrigger, setNewAlertTrigger] = useState(false);

    const feedRef = useRef(null);
    const videoRef = useRef(null);

    const { cameraStream } = useCamera();

    // Attach global camera stream to the local screen if available
    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

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

                {/* 🔥 CAMERAS GRID (4 SCREENS) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: '1rem',
                    height: 'calc(100vh - 200px)', // Keeps it fitted within the screen
                    minHeight: '400px'
                }}>
                    {/* CAM 1: Local Browser Feed */}
                    <div style={{
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#000',
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute', top: '10px', left: '10px',
                            background: 'rgba(255,77,77,0.8)', color: 'white',
                            padding: '4px 10px', borderRadius: '6px',
                            fontSize: '0.7rem', fontWeight: 'bold', zIndex: 10,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 0 10px rgba(255,77,77,0.5)'
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }}></div>
                            CAM 01 (LOCAL WEB)
                        </div>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>

                    {/* CAM 2: Remote Placeholder */}
                    <div style={{
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0a0a0a, #151515)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            position: 'absolute', top: '10px', left: '10px',
                            background: 'rgba(0,123,255,0.2)', border: '1px solid rgba(0,123,255,0.4)',
                            color: '#007bff', padding: '4px 10px', borderRadius: '6px',
                            fontSize: '0.7rem', fontWeight: 'bold'
                        }}>
                            CAM 02 (NODE 1)
                        </div>
                        <VideoOff size={32} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: '15px' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>AWAITING CONNECTION</span>
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.65rem', marginTop: '5px', fontFamily: 'monospace' }}>SIGNAL LOST / OFFLINE</span>
                    </div>

                    {/* CAM 3: Remote Placeholder */}
                    <div style={{
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0a0a0a, #151515)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            position: 'absolute', top: '10px', left: '10px',
                            background: 'rgba(0,123,255,0.2)', border: '1px solid rgba(0,123,255,0.4)',
                            color: '#007bff', padding: '4px 10px', borderRadius: '6px',
                            fontSize: '0.7rem', fontWeight: 'bold'
                        }}>
                            CAM 03 (NODE 2)
                        </div>
                        <VideoOff size={32} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: '15px' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>AWAITING CONNECTION</span>
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.65rem', marginTop: '5px', fontFamily: 'monospace' }}>SIGNAL LOST / OFFLINE</span>
                    </div>

                    {/* CAM 4: Remote Placeholder */}
                    <div style={{
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0a0a0a, #151515)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            position: 'absolute', top: '10px', left: '10px',
                            background: 'rgba(255,193,7,0.15)', border: '1px solid rgba(255,193,7,0.3)',
                            color: '#ffc107', padding: '4px 10px', borderRadius: '6px',
                            fontSize: '0.7rem', fontWeight: 'bold'
                        }}>
                            CAM 04 (HQ LINK)
                        </div>
                        <VideoOff size={32} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: '15px' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>AWAITING CONNECTION</span>
                        <span style={{ color: 'rgba(255,193,7,0.3)', fontSize: '0.65rem', marginTop: '5px', fontFamily: 'monospace' }}>ENCRYPTED CHANNEL STANDBY</span>
                    </div>
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