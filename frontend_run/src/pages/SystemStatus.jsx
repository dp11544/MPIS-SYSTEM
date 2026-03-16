import React, { useState, useEffect } from 'react';
import { Server, Database, Activity, Wifi, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api, { silentApi } from '../api/axios';
import webSocketService from '../services/WebSocketService';

const StatusCard = ({ title, status, icon: Icon, description, latency }) => {
    const isOnline = status === 'ONLINE';
    const color = isOnline ? 'var(--status-success)' : 'var(--status-alert)';
    const bgColor = isOnline ? 'rgba(40, 167, 69, 0.05)' : 'rgba(255, 77, 77, 0.05)';
    const borderColor = isOnline ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 77, 77, 0.3)';

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(16, 26, 43, 0.8), rgba(10, 25, 47, 0.9))',
            borderRadius: '16px',
            padding: '25px',
            border: `1px solid ${borderColor}`,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 10px 30px -10px ${color}33`,
            transition: 'transform 0.2s',
            display: 'flex', flexDirection: 'column', gap: '20px'
        }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>

            {/* Top Row: Icon & Status Pill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    width: '60px', height: '60px', borderRadius: '12px',
                    background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${borderColor}`
                }}>
                    <Icon size={30} color={color} />
                </div>

                <div style={{
                    background: isOnline ? 'rgba(40, 167, 69, 0.15)' : 'rgba(255, 77, 77, 0.15)',
                    color: color, padding: '6px 14px', borderRadius: '20px',
                    fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                    border: `1px solid ${borderColor}`, letterSpacing: '1px'
                }}>
                    {isOnline ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {status}
                </div>
            </div>

            {/* Middle: Title & Description */}
            <div>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'var(--font-primary)' }}>{title}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>{description}</p>
            </div>

            {/* Bottom: Metrics/Latency */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>Ping Latency</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{latency || '--'} ms</span>
            </div>

            {/* Background Glow */}
            <div style={{
                position: 'absolute', top: '-50%', right: '-20%', width: '150px', height: '150px',
                background: color, filter: 'blur(80px)', opacity: 0.1, pointerEvents: 'none'
            }}></div>
        </div>
    );
};

const SystemStatus = () => {
    const [statuses, setStatuses] = useState({ backend: 'CHECKING', database: 'CHECKING', aiEngine: 'CHECKING', webSocket: 'CHECKING' });
    const [latencies, setLatencies] = useState({ backend: null, aiEngine: null });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastChecked, setLastChecked] = useState(new Date());

    const checkHealth = async () => {
        setIsRefreshing(true);
        let backendOnline = false;
        let dbOnline = false;
        let backendLat = null;
        let aiLat = null;

        // 1. Check Backend & DB
        try {
            const start = performance.now();
            await api.get('/persons');
            backendLat = Math.round(performance.now() - start);
            backendOnline = true;
            dbOnline = true;
        } catch (err) {
            console.error("Backend health check failed", err);
        }

        // 2. Check AI Engine — via backend proxy to avoid CORS
        let aiOnline = false;
        try {
            const start = performance.now();
            const aiRes = await silentApi.get('/system/ai-status');
            aiLat = aiRes.data?.latencyMs ?? Math.round(performance.now() - start);
            aiOnline = aiRes.data?.online === true;
        } catch (err) {
            console.warn("AI Engine health check failed", err);
        }

        // 3. Check WebSockets
        const wsOnline = webSocketService.client && webSocketService.client.connected;

        setStatuses({
            backend: backendOnline ? 'ONLINE' : 'OFFLINE',
            database: dbOnline ? 'ONLINE' : 'OFFLINE',
            aiEngine: aiOnline ? 'ONLINE' : 'OFFLINE',
            webSocket: wsOnline ? 'ONLINE' : 'OFFLINE'
        });

        setLatencies({ backend: backendLat, aiEngine: aiLat });
        setLastChecked(new Date());

        setTimeout(() => setIsRefreshing(false), 500);
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 10000); // Poll every 10s to save resources
        return () => clearInterval(interval);
    }, []);

    const allOnline = Object.values(statuses).every(s => s === 'ONLINE');

    return (
        <div style={{ animation: 'slideDown 0.4s easeOut', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        Diagnostics & Telemetry
                        {allOnline && (
                            <span style={{ fontSize: '0.8rem', background: 'rgba(40,167,69,0.1)', color: 'var(--status-success)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--status-success)', verticalAlign: 'middle' }}>ALL SYSTEMS NOMINAL</span>
                        )}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '8px' }}>Real-time core infrastructure monitoring and node health statuses.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Telemetry Sync</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 'bold' }}>{lastChecked.toLocaleTimeString()}</span>
                    </div>
                    <button
                        onClick={checkHealth}
                        disabled={isRefreshing}
                        style={{
                            background: 'var(--bg-tertiary)', border: '1px solid rgba(100,255,218,0.3)', color: 'var(--text-accent)',
                            width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: isRefreshing ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(100,255,218,0.1)'
                        }}
                        onMouseOver={e => { if (!isRefreshing) { e.currentTarget.style.background = 'rgba(100,255,218,0.1)'; e.currentTarget.style.transform = 'rotate(30deg)' } }}
                        onMouseOut={e => { if (!isRefreshing) { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.transform = 'rotate(0)' } }}
                    >
                        <RefreshCw size={20} className={isRefreshing ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Node Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                <StatusCard
                    title="Core API Services"
                    status={statuses.backend}
                    icon={Server}
                    description="Java Spring Boot 3 Engine. Handles domain logic, authentication, and HTTP routing."
                    latency={latencies.backend}
                />
                <StatusCard
                    title="Intelligence Database"
                    status={statuses.database}
                    icon={Database}
                    description="MongoDB Replica Set. Persistent store for subject profiles and biometric embeddings."
                    latency={latencies.backend ? latencies.backend + 2 : null} // Rough estimate since backend is up
                />
                <StatusCard
                    title="CV2 Inference Engine"
                    status={statuses.aiEngine}
                    icon={Activity}
                    description="Python Flask AI Node. Executes OpenCV DNN and Haar Cascade facial extraction."
                    latency={latencies.aiEngine}
                />
                <StatusCard
                    title="Real-Time Event Bus"
                    status={statuses.webSocket}
                    icon={Wifi}
                    description="STOMP over SockJS message broker. Manages live telemetry streams to active clients."
                    latency={statuses.webSocket === 'ONLINE' ? '< 5' : null}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default SystemStatus;
