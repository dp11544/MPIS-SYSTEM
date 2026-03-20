import React, { useState, useEffect, useRef } from 'react';
import { Activity, Camera, Play, VideoOff, Wifi, ShieldAlert } from 'lucide-react';
import AlertCard from '../components/widgets/AlertCard';
import api from '../api/axios';
import webSocketService from '../services/WebSocketService';
import toast from '../utils/toast';

const LiveAlerts = () => {
    const [liveFeed, setLiveFeed] = useState([]);
    const [isStreamOnline, setIsStreamOnline] = useState(true);
    const [newAlertTrigger, setNewAlertTrigger] = useState(false);

    // For auto-scrolling the feed
    const feedRef = useRef(null);

    useEffect(() => {
        // Initial fetch of recent alerts
        const fetchLatest = async () => {
            try {
                const res = await api.get('/alerts/latest');
                if (res.data && res.data.length > 0) {
                    setLiveFeed(res.data.slice(0, 10)); // keep last 10
                }
            } catch (err) {
                console.error("Failed to fetch initial feed", err);
            }
        };

        fetchLatest();

        const handleNewAlert = (alert) => {
            setLiveFeed(prev => [alert, ...prev].slice(0, 50));
            setNewAlertTrigger(true);
            setTimeout(() => setNewAlertTrigger(false), 3000);

            // Auto-scroll to top (though we add to top anyway)
            if (feedRef.current) {
                feedRef.current.scrollTop = 0;
            }
        };

        webSocketService.subscribe('/topic/alerts', handleNewAlert);

        return () => {
            webSocketService.unsubscribe('/topic/alerts');
        };
    }, []);

    const simulateAlert = () => {
        const mockAlert = {
            id: `SIM-LIVE-${Math.floor(Math.random() * 10000)}`,
            personId: 'SIMULATED-SUBJECT',
            personName: 'Live Demo Target',
            similarity: 0.92 + (Math.random() * 0.07), // 92-99%
            confidenceLevel: 'VERY HIGH',
            detectedAt: new Date().toISOString(),
            cameraId: 'MAIN_ENTRANCE_CAM'
        };

        setLiveFeed(prev => [mockAlert, ...prev].slice(0, 50));
        setNewAlertTrigger(true);
        setTimeout(() => setNewAlertTrigger(false), 3000);
        toast.info("Simulated alert injected into live stream");
    };

    // Helper component for offline camera boxes
    const OfflineCameraBox = ({ camName, ip }) => (
        <div style={{
            flex: 1, height: '100%', minHeight: '220px', position: 'relative',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(10,25,47,0.7))',
            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            {/* Top Bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 15px', display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '1px' }}>{camName}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{ip}</span>
            </div>

            {/* Offline Content */}
            <VideoOff size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '10px' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>OFFLINE / NO SIGNAL</span>

            {/* Bottom Bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 15px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--status-alert)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldAlert size={10} /> AWAITING CONNECTION
                </span>
            </div>
        </div>
    );

    return (
        <div style={{ animation: 'slideDown 0.4s easeOut', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Live Surveillance Console</h1>
                    <p style={{ color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginTop: '5px', fontWeight: 'bold' }}>
                        <span style={{
                            width: '8px', height: '8px', background: 'var(--status-alert)', borderRadius: '50%',
                            display: 'inline-block', boxShadow: '0 0 10px var(--status-alert)', animation: 'pulse 1.5s infinite'
                        }}></span>
                        ACTIVE VIDEO MONITORING [NODE 1 ONLINE]
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Wifi size={14} color="var(--status-success)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '1px' }}>NETWORK: SECURE</span>
                    </div>
                    <button
                        onClick={simulateAlert}
                        style={{
                            background: 'rgba(100, 255, 218, 0.1)', color: 'var(--text-accent)',
                            border: '1px solid rgba(100, 255, 218, 0.3)', padding: '8px 16px',
                            borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(100, 255, 218, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(100, 255, 218, 0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                        <Play size={16} /> Simulate Target Detection
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(700px, 2fr) 1fr', gap: '2rem', flex: 1 }}>

                {/* Left: 4-Camera Multi-View Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '15px', height: 'calc(100vh - 180px)', minHeight: '600px' }}>

                    {/* CAMERA 1: Active Live Feed */}
                    <div className="glass-panel" style={{
                        borderRadius: '12px', background: 'linear-gradient(180deg, rgba(0,0,0,0.8), rgba(10,25,47,0.9))', position: 'relative',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', border: newAlertTrigger ? '2px solid var(--status-alert)' : '1px solid rgba(0,123,255,0.3)',
                        boxShadow: newAlertTrigger ? '0 0 30px rgba(255,77,77,0.3) inset' : '0 10px 40px rgba(0,0,0,0.5)',
                        transition: 'all 0.3s ease'
                    }}>
                        {/* Fake camera overlay info */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            padding: '10px 15px', display: 'flex', justifyContent: 'space-between',
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)', zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'var(--status-alert)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '5px', height: '5px', background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span> REC
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>CAM_01_MAIN_LOBBY</span>
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{new Date().toLocaleTimeString()}</span>
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#000' }}>
                            {isStreamOnline ? (
                                <img
                                    src="http://localhost:5000/video_feed"
                                    alt="Live CCTV Feed"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        setIsStreamOnline(false);
                                    }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <VideoOff size={48} style={{ marginBottom: '1rem', opacity: 0.5, margin: '0 auto' }} />
                                    <h3 style={{ color: 'var(--status-alert)', letterSpacing: '2px', fontSize: '0.9rem', textTransform: 'uppercase' }}>STREAM OFFLINE</h3>
                                </div>
                            )}

                            {/* Crosshairs overlay for aesthetic */}
                            {isStreamOnline && (
                                <>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '40px', height: '40px', transform: 'translate(-50%, -50%)', border: '1px solid rgba(100, 255, 218, 0.4)', borderRadius: '50%', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '10px', background: 'rgba(100, 255, 218, 0.6)', transform: 'translate(-50%, -25px)', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '10px', background: 'rgba(100, 255, 218, 0.6)', transform: 'translate(-50%, 15px)', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '10px', height: '2px', background: 'rgba(100, 255, 218, 0.6)', transform: 'translate(-25px, -50%)', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '10px', height: '2px', background: 'rgba(100, 255, 218, 0.6)', transform: 'translate(15px, -50%)', pointerEvents: 'none' }}></div>
                                </>
                            )}
                        </div>

                        <div style={{
                            padding: '10px 15px', display: 'flex', justifyContent: 'space-between',
                            background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'absolute', bottom: 0, left: 0, right: 0
                        }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-accent)', fontWeight: 'bold' }}>192.168.1.100</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>1080p / 30fps</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--status-success)' }}>INFERENCE ACTIVE</span>
                            </div>
                            <Activity className="spin" size={14} color="var(--text-accent)" />
                        </div>
                    </div>

                    {/* CAMERA 2 */}
                    <OfflineCameraBox camName="CAM_02_EAST_CORRIDOR" ip="192.168.1.101" />

                    {/* CAMERA 3 */}
                    <OfflineCameraBox camName="CAM_03_PARKING_GARAGE" ip="192.168.1.102" />

                    {/* CAMERA 4 */}
                    <OfflineCameraBox camName="CAM_04_REAR_EXIT" ip="192.168.1.103" />

                </div>

                {/* Right: Scrolling Alert Column */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', padding: '1.5rem', height: 'calc(100vh - 180px)', minHeight: '600px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Camera size={18} color="var(--text-accent)" /> Target Acquired
                        </h3>
                        <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {liveFeed.length} EVENTS
                        </span>
                    </div>

                    <div className="custom-scrollbar" ref={feedRef} style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {liveFeed.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, padding: '20px', textAlign: 'center' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                    <Activity size={30} color="var(--text-secondary)" />
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monitoring multi-node video stream for high-confidence biometric matches...</p>
                            </div>
                        ) : (
                            liveFeed.map((alert, index) => (
                                <AlertCard key={alert.id || index} alert={alert} isNew={index === 0 && newAlertTrigger} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .spin { animation: spin 4s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}} />
        </div>
    );
};

export default LiveAlerts;
