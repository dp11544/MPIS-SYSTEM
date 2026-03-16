import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Video, AlertTriangle, Shield, Radio, Wifi, WifiOff, RefreshCw, Target, Crosshair } from 'lucide-react';
import api from '../api/axios';
import webSocketService from '../services/WebSocketService';

// Fix for default Leaflet icons in Vite/webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Bhimavaram city center
const BHIMAVARAM_CENTER = [16.5449, 81.5212];
const ALERT_DISPLAY_DURATION = 30000; // 30 seconds
const CAMERA_REFRESH_INTERVAL = 30000;

// Map recenter helper
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, zoom || map.getZoom());
    }, [center, zoom, map]);
    return null;
};

// Custom SVG icons
const createCameraIcon = (status) => {
    const color = status === 'ONLINE' ? '#00c864' : status === 'DEGRADED' ? '#ffa500' : '#ff4d4d';
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 28px; height: 28px;
            background: ${color}22;
            border: 2px solid ${color};
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 12px ${color}88;
            cursor: pointer;
        ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.95C18.88 4 12 4 12 4s-6.88 0-8.59.47A2.78 2.78 0 0 0 1.46 6.42C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95C23 15.87 23 12 23 12s0-3.87-.46-5.58z"/>
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="${color}"/>
        </svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
    });
};

const createAlertIcon = (severity) => {
    const color = severity === 'HIGH' ? '#ff4d4d' : severity === 'MED' ? '#ffa500' : '#28a745';
    return L.divIcon({
        className: '',
        html: `<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="
                position: absolute;
                width: 40px; height: 40px;
                border: 2px solid ${color};
                border-radius: 50%;
                animation: ripple 1.5s ease-out infinite;
                opacity: 0.6;
            "></div>
            <div style="
                width: 22px; height: 22px;
                background: ${color};
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 20px ${color};
                display: flex; align-items: center; justify-content: center;
                z-index: 1;
            ">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/>
            </svg>
            </div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
    });
};

const createPoliceIcon = (status) => {
    const color = status === 'AVAILABLE' ? '#007bff' : '#6c757d';
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 24px; height: 16px;
            background: ${color};
            border-radius: 3px;
            border: 1px solid white;
            box-shadow: 0 0 10px ${color}88;
            position: relative;
        ">
            <div style="position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 10px; height: 3px; background: linear-gradient(90deg, #ff0000 50%, #0000ff 50%); border-radius: 1px;"></div>
        </div>`,
        iconSize: [24, 16],
        iconAnchor: [12, 8],
        popupAnchor: [0, -12],
    });
};

const getSeverity = (similarity) => {
    if (similarity >= 0.8) return { label: 'HIGH', color: '#ff4d4d' };
    if (similarity >= 0.6) return { label: 'MED', color: '#ffa500' };
    return { label: 'LOW', color: '#28a745' };
};

// Default simulated police units in Bhimavaram
const DEFAULT_POLICE_UNITS = [
    { unitId: 'PATROL_21', latitude: 16.5480, longitude: 81.5250, status: 'AVAILABLE' },
    { unitId: 'PATROL_15', latitude: 16.5410, longitude: 81.5150, status: 'BUSY' },
    { unitId: 'PATROL_08', latitude: 16.5520, longitude: 81.5320, status: 'AVAILABLE' },
];

const DeploymentMap = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [cameras, setCameras] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [wsConnected, setWsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState(BHIMAVARAM_CENTER);
    const [selectedAlert, setSelectedAlert] = useState(null);

    const alertTimeoutsRef = useRef({});
    const cameraMapRef = useRef(new Map());

    // Fetch cameras
    const fetchCameras = useCallback(async () => {
        try {
            setError(null);
            const response = await api.get('/cameras');
            const cameraData = response.data;
            const cameraMap = new Map();
            cameraData.forEach(cam => cameraMap.set(cam.cameraId, cam));
            cameraMapRef.current = cameraMap;
            setCameras(cameraData);
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to fetch cameras:', err);
            setError('Failed to load camera data');
            setIsLoading(false);
        }
    }, []);

    // Handle WebSocket alert
    const handleAlert = useCallback((alertData) => {
        const camera = cameraMapRef.current.get(alertData.cameraId);
        if (!camera) return;

        const alertId = `${alertData.cameraId}-${Date.now()}`;
        const severity = getSeverity(alertData.similarity);

        const newAlert = {
            id: alertId,
            personName: alertData.personName,
            cameraId: alertData.cameraId,
            cameraName: camera.name,
            similarity: alertData.similarity,
            timestamp: alertData.timestamp || Date.now(),
            lat: camera.latitude,
            lng: camera.longitude,
            severity: severity.label,
        };

        setActiveAlerts(prev => [...prev, newAlert]);
        setMapCenter([camera.latitude, camera.longitude]);
        setSelectedAlert(newAlert);

        alertTimeoutsRef.current[alertId] = setTimeout(() => {
            setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
            delete alertTimeoutsRef.current[alertId];
        }, ALERT_DISPLAY_DURATION);

        try {
            const audio = new Audio('/alert.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch (e) {}
    }, []);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch cameras on mount
    useEffect(() => {
        fetchCameras();
        const interval = setInterval(fetchCameras, CAMERA_REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchCameras]);

    // WebSocket
    useEffect(() => {
        webSocketService.setConnectionListener(c => setWsConnected(c), 'deployment-map');
        webSocketService.connect(err => { console.error('WS error:', err); setWsConnected(false); });
        webSocketService.subscribe('/topic/alerts', handleAlert);
        return () => {
            webSocketService.setConnectionListener(null, 'deployment-map');
            webSocketService.unsubscribe('/topic/alerts');
            Object.values(alertTimeoutsRef.current).forEach(clearTimeout);
        };
    }, [handleAlert]);

    const onlineCameras = cameras.filter(c => c.status === 'ONLINE').length;
    const hasAlerts = activeAlerts.length > 0;

    // Build movement path from alerts
    const alertPath = activeAlerts
        .filter(a => a.lat && a.lng)
        .map(a => [a.lat, a.lng]);

    return (
        <div style={{ animation: 'slideDown 0.4s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Tactical Deployment Map
                    </h1>
                    <p style={{ color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold', margin: '4px 0 0 0' }}>
                        <MapIcon size={16} /> BHIMAVARAM CITY — GEOSPATIAL INTELLIGENCE
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* WS status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: wsConnected ? 'rgba(0,200,100,0.1)' : 'rgba(255,165,0,0.1)', border: `1px solid ${wsConnected ? 'rgba(0,200,100,0.3)' : 'rgba(255,165,0,0.3)'}`, padding: '6px 14px', borderRadius: '8px' }}>
                        {wsConnected ? <Wifi size={15} color="var(--status-success)" /> : <WifiOff size={15} color="orange" />}
                        <span style={{ fontSize: '0.75rem', color: wsConnected ? 'var(--status-success)' : 'orange', fontWeight: 'bold' }}>{wsConnected ? 'LIVE' : 'CONNECTING...'}</span>
                    </div>
                    {/* Alert counter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: hasAlerts ? 'rgba(255,77,77,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${hasAlerts ? 'rgba(255,77,77,0.3)' : 'rgba(255,255,255,0.05)'}`, padding: '6px 14px', borderRadius: '8px' }}>
                        {hasAlerts && <div style={{ width: '8px', height: '8px', background: 'var(--status-alert)', borderRadius: '50%', boxShadow: '0 0 10px var(--status-alert)', animation: 'pulse 1s infinite' }}></div>}
                        <span style={{ fontSize: '0.8rem', color: hasAlerts ? 'var(--status-alert)' : 'var(--text-secondary)', fontWeight: 'bold' }}>{activeAlerts.length} ACTIVE DETECTION{activeAlerts.length !== 1 ? 'S' : ''}</span>
                    </div>
                    {/* UTC Clock */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '8px' }}>
                        <Radio size={14} color="var(--brand-blue)" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>{currentTime.toISOString().replace('T', ' ').substring(0, 19)} UTC</span>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', padding: '10px 16px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--status-alert)', fontSize: '0.85rem' }}>
                        <AlertTriangle size={13} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{error}
                    </span>
                    <button onClick={fetchCameras} style={{ background: 'transparent', border: '1px solid var(--status-alert)', color: 'var(--status-alert)', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                        <RefreshCw size={11} /> Retry
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(600px, 3fr) 320px', gap: '1.2rem', flex: 1, minHeight: 0 }}>

                {/* MAP */}
                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: hasAlerts ? '2px solid rgba(255,77,77,0.5)' : '1px solid rgba(100,255,218,0.15)', boxShadow: hasAlerts ? '0 0 30px rgba(255,77,77,0.2)' : 'none', transition: 'all 0.3s' }}>
                    {isLoading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, borderRadius: '16px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <RefreshCw size={30} color="var(--brand-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                                <p style={{ color: 'var(--text-secondary)', marginTop: '10px', fontSize: '0.85rem' }}>Loading camera nodes...</p>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={BHIMAVARAM_CENTER}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                        attributionControl={false}
                    >
                        <MapController center={hasAlerts ? mapCenter : null} zoom={hasAlerts ? 16 : null} />

                        {/* Dark tactical map tile */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                        />

                        {/* Camera markers with coverage circles */}
                        {cameras.map(cam => {
                            if (!cam.latitude || !cam.longitude) return null;
                            return (
                                <React.Fragment key={cam.cameraId}>
                                    <Marker
                                        position={[cam.latitude, cam.longitude]}
                                        icon={createCameraIcon(cam.status)}
                                    >
                                        <Popup className="tactical-popup">
                                            <div style={{ background: '#0a192f', color: 'white', padding: '10px', borderRadius: '8px', minWidth: '160px', fontFamily: 'monospace' }}>
                                                <div style={{ fontWeight: 'bold', color: cam.status === 'ONLINE' ? '#00c864' : '#ff4d4d', marginBottom: '6px' }}>
                                                    📷 {cam.cameraId}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{cam.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                                    LAT: {cam.latitude?.toFixed(4)}° | LNG: {cam.longitude?.toFixed(4)}°
                                                </div>
                                                <div style={{ marginTop: '6px', padding: '3px 8px', background: cam.status === 'ONLINE' ? 'rgba(0,200,100,0.2)' : 'rgba(255,77,77,0.2)', borderRadius: '4px', color: cam.status === 'ONLINE' ? '#00c864' : '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block' }}>
                                                    ● {cam.status}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    {/* Coverage radius */}
                                    <Circle
                                        center={[cam.latitude, cam.longitude]}
                                        radius={150}
                                        pathOptions={{
                                            color: cam.status === 'ONLINE' ? '#00c864' : cam.status === 'DEGRADED' ? '#ffa500' : '#ff4d4d',
                                            fillColor: cam.status === 'ONLINE' ? '#00c864' : cam.status === 'DEGRADED' ? '#ffa500' : '#ff4d4d',
                                            fillOpacity: 0.08,
                                            weight: 1,
                                            dashArray: '4 4',
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* Police unit markers */}
                        {DEFAULT_POLICE_UNITS.map(unit => (
                            <Marker key={unit.unitId} position={[unit.latitude, unit.longitude]} icon={createPoliceIcon(unit.status)}>
                                <Popup className="tactical-popup">
                                    <div style={{ background: '#0a192f', color: 'white', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}>
                                        <div style={{ fontWeight: 'bold', color: unit.status === 'AVAILABLE' ? '#007bff' : '#6c757d', marginBottom: '4px' }}>🚔 {unit.unitId}</div>
                                        <div style={{ fontSize: '0.75rem', padding: '2px 8px', background: unit.status === 'AVAILABLE' ? 'rgba(0,123,255,0.2)' : 'rgba(108,117,125,0.2)', borderRadius: '4px', display: 'inline-block', color: unit.status === 'AVAILABLE' ? '#007bff' : '#6c757d', fontWeight: 'bold' }}>
                                            {unit.status}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Alert markers */}
                        {activeAlerts.map(alert => {
                            if (!alert.lat || !alert.lng) return null;
                            return (
                                <React.Fragment key={alert.id}>
                                    <Marker
                                        position={[alert.lat, alert.lng]}
                                        icon={createAlertIcon(alert.severity)}
                                        eventHandlers={{ click: () => setSelectedAlert(alert) }}
                                    >
                                        <Popup className="tactical-popup">
                                            <div style={{ background: '#0a192f', color: 'white', padding: '12px', borderRadius: '8px', minWidth: '180px', fontFamily: 'monospace' }}>
                                                <div style={{ fontWeight: 'bold', color: '#ff4d4d', marginBottom: '6px', fontSize: '0.9rem' }}>🎯 {alert.personName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>📹 {alert.cameraId}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '6px' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#aaa' }}>CONFIDENCE</span>
                                                    <span style={{ fontWeight: 'bold', color: '#ffff00', fontSize: '0.95rem' }}>{(alert.similarity * 100).toFixed(1)}%</span>
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px' }}>{new Date(alert.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    {/* Alert pulse circle */}
                                    <Circle
                                        center={[alert.lat, alert.lng]}
                                        radius={80}
                                        pathOptions={{ color: '#ff4d4d', fillColor: '#ff4d4d', fillOpacity: 0.15, weight: 2 }}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* Movement path */}
                        {alertPath.length > 1 && (
                            <Polyline
                                positions={alertPath}
                                pathOptions={{ color: '#ff4d4d', weight: 3, dashArray: '10 6', opacity: 0.8 }}
                            />
                        )}
                    </MapContainer>

                    {/* Map overlay: Legend */}
                    <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 999, background: 'rgba(5,15,30,0.92)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {[
                            { color: '#00c864', label: 'Camera Online' },
                            { color: '#ffa500', label: 'Camera Degraded' },
                            { color: '#ff4d4d', label: 'Camera Offline' },
                            { color: '#ff4d4d', label: 'Active Alert', pulse: true },
                            { color: '#007bff', label: 'Police Unit' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: item.pulse ? '50%' : '3px', background: item.color, animation: item.pulse ? 'pulse 1s infinite' : 'none', flexShrink: 0 }}></div>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Node counter badge */}
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 999, background: 'rgba(5,15,30,0.92)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        NODES: <span style={{ color: 'var(--status-success)', fontWeight: 'bold' }}>{onlineCameras}</span> / {cameras.length}
                    </div>
                </div>

                {/* Right Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0, overflow: 'hidden' }}>

                    {/* Active Alerts */}
                    <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', flex: '0 0 auto', maxHeight: '55%', overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: hasAlerts ? 'var(--status-alert)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,77,77,0.15)', paddingBottom: '10px' }}>
                            <Target size={16} /> Active Targets ({activeAlerts.length})
                        </h3>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {activeAlerts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                    <Shield size={28} style={{ opacity: 0.3, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                                    <p style={{ margin: '0 0 4px' }}>No active alerts</p>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>Monitoring {onlineCameras} cameras...</p>
                                </div>
                            ) : (
                                activeAlerts.map(alert => {
                                    const sev = getSeverity(alert.similarity);
                                    return (
                                        <div key={alert.id} onClick={() => { setMapCenter([alert.lat, alert.lng]); setSelectedAlert(alert); }} style={{ background: 'rgba(255,77,77,0.07)', border: `1px solid rgba(255,77,77,0.25)`, borderRadius: '8px', padding: '10px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.12)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,77,77,0.07)'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 'bold' }}>{alert.personName}</span>
                                                <span style={{ fontSize: '0.85rem', color: sev.color, fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{(alert.similarity * 100).toFixed(1)}%</span>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{alert.cameraId} • {alert.cameraName}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 6px', borderRadius: '4px' }}>
                                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>LAT</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)' }}>{alert.lat?.toFixed(4)}</div>
                                                </div>
                                                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 6px', borderRadius: '4px' }}>
                                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>LNG</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)' }}>{alert.lng?.toFixed(4)}</div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                                <span>🕐 {new Date(alert.timestamp).toLocaleTimeString()}</span>
                                                <span style={{ color: sev.color, fontWeight: 'bold' }}>⚡ {sev.label}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Camera Nodes */}
                    <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={16} color="var(--brand-blue)" /> Camera Nodes
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--status-success)' }}>{onlineCameras}/{cameras.length}</span>
                        </h3>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <RefreshCw size={18} color="var(--brand-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : cameras.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No cameras configured</div>
                            ) : (
                                cameras.map(cam => (
                                    <div key={cam.cameraId}
                                        onClick={() => cam.latitude && setMapCenter([cam.latitude, cam.longitude])}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cam.status === 'ONLINE' ? 'var(--status-success)' : 'var(--status-alert)', boxShadow: cam.status === 'ONLINE' ? '0 0 8px var(--status-success)' : 'none', flexShrink: 0 }}></div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{cam.cameraId}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{cam.name}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: cam.status === 'ONLINE' ? 'var(--status-success)' : 'var(--status-alert)', background: cam.status === 'ONLINE' ? 'rgba(0,200,100,0.1)' : 'rgba(255,77,77,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', flexShrink: 0 }}>
                                            {cam.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes ripple { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3); opacity: 0; } }

                /* Leaflet map dark overrides */
                .leaflet-container { background: #020c1b !important; border-radius: 14px; }
                .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                .leaflet-popup-tip { display: none !important; }
                .leaflet-popup-content { margin: 0 !important; }
                .leaflet-control-zoom { background: rgba(5,15,30,0.9) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
                .leaflet-control-zoom a { background: transparent !important; color: white !important; border: none !important; }
                .leaflet-control-zoom a:hover { background: rgba(255,255,255,0.1) !important; }
            ` }} />
        </div>
    );
};

export default DeploymentMap;
