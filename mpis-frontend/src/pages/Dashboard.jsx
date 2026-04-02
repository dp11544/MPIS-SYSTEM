import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertTriangle, Video, Activity, Globe, Shield, Radio, Cpu, HardDrive, AlertOctagon, Info, Target } from 'lucide-react';

// ====== POLICE SIREN SOUND GENERATOR (Web Audio API) ======
const playPoliceSiren = (durationMs = 3000) => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Set HIGH volume for loud siren
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        
        // Police siren frequency oscillation (high-low-high pattern)
        const now = audioCtx.currentTime;
        const cycles = Math.floor(durationMs / 500); // Each cycle is 500ms
        
        for (let i = 0; i < cycles; i++) {
            const cycleStart = now + (i * 0.5);
            // Ramp up to high frequency (1200 Hz)
            oscillator.frequency.setValueAtTime(600, cycleStart);
            oscillator.frequency.linearRampToValueAtTime(1200, cycleStart + 0.25);
            // Ramp down to low frequency (600 Hz)
            oscillator.frequency.linearRampToValueAtTime(600, cycleStart + 0.5);
        }
        
        oscillator.start(now);
        oscillator.stop(now + (durationMs / 1000));
        
        // Cleanup
        setTimeout(() => {
            oscillator.disconnect();
            gainNode.disconnect();
            audioCtx.close();
        }, durationMs + 100);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
};
import StatCard from '../components/widgets/StatCard';
import AlertCard from '../components/widgets/AlertCard';
import ThreeDLogo from '../components/widgets/ThreeDLogo';
import CommandLogo3D from '../components/widgets/CommandLogo3D';
import api from '../api/axios';
import webSocketService from '../services/WebSocketService';

// Subcomponent: Animated Telemetry Bar
const TelemetryBar = ({ label, value, color, delay }) => (
    <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
            <span style={{ color }}>{value}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
                width: `${value}%`, height: '100%', background: color, borderRadius: '4px',
                boxShadow: `0 0 10px ${color}`, transition: 'width 1s ease-in-out',
                animation: `barPulse 3s infinite ${delay}s alternate`
            }}></div>
        </div>
    </div>
);

// Helper: Convert lat/lng to radar XY percentage (relative to bounding box)
const latLngToRadarXY = (lat, lng, cameras) => {
    if (!cameras || cameras.length === 0) {
        return { x: 50, y: 50 }; // Center fallback
    }
    
    // Calculate bounding box from all cameras
    const lats = cameras.filter(c => c.latitude != null).map(c => c.latitude);
    const lngs = cameras.filter(c => c.longitude != null).map(c => c.longitude);
    
    if (lats.length === 0 || lngs.length === 0) {
        return { x: 50, y: 50 };
    }
    
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;
    
    // Normalize to 15%-85% range (keep within radar circle)
    const x = 15 + ((lng - minLng) / (maxLng - minLng)) * 70;
    const y = 15 + ((maxLat - lat) / (maxLat - minLat)) * 70; // Invert Y for screen coords
    
    return { x: Math.max(15, Math.min(85, x)), y: Math.max(15, Math.min(85, y)) };
};

// Helper: Calculate distance between two lat/lng points (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Helper: Get severity color based on confidence
const getSeverityColor = (confidence, isPriority = false) => {
    if (isPriority) return { color: '#9b59b6', label: 'HIGH PRIORITY' }; // Purple
    if (confidence >= 80) return { color: '#ff4d4d', label: 'CONFIRMED' }; // Red
    if (confidence >= 60) return { color: '#ffa500', label: 'POSSIBLE' }; // Yellow/Orange
    return { color: '#28a745', label: 'LOW' }; // Green
};

// ====== UPGRADED TACTICAL SURVEILLANCE RADAR ======
const SurveillanceRadar = ({ cameras, alertBlips, hasActiveAlert, isFlashing, policeUnits = [] }) => {
    const [hoveredBlip, setHoveredBlip] = useState(null);
    const [hoveredCamera, setHoveredCamera] = useState(null);
    const [timeSinceLastDetection, setTimeSinceLastDetection] = useState(null);
    const [showCoverage, setShowCoverage] = useState(true);
    const [showPaths, setShowPaths] = useState(true);

    // Timer for last detection
    useEffect(() => {
        if (alertBlips.length === 0) {
            setTimeSinceLastDetection(null);
            return;
        }
        
        const latestBlip = alertBlips[alertBlips.length - 1];
        const updateTimer = () => {
            const elapsed = Math.floor((Date.now() - latestBlip.timestamp) / 1000);
            setTimeSinceLastDetection(elapsed);
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [alertBlips]);

    // Compute camera blips with health status colors
    const cameraBlips = React.useMemo(() => cameras.map((cam, i) => {
        const pos = latLngToRadarXY(cam.latitude, cam.longitude, cameras);
        // Camera health status colors
        let statusColor = 'var(--brand-blue)'; // ONLINE
        if (cam.status === 'OFFLINE') statusColor = '#666';
        else if (cam.status === 'DEGRADED') statusColor = '#ffa500';
        
        return {
            id: cam.cameraId || `cam-${i}`,
            x: pos.x,
            y: pos.y,
            delay: `${(i * 0.3) % 3}s`,
            size: '6px',
            color: statusColor,
            status: cam.status || 'ONLINE',
            name: cam.name || `Camera ${i + 1}`,
            latitude: cam.latitude,
            longitude: cam.longitude,
            orientation: cam.orientation || (i * 45) % 360 // Default orientation
        };
    }), [cameras]);

    // Calculate hotspots (areas with multiple alerts)
    const hotspots = React.useMemo(() => {
        if (alertBlips.length < 2) return [];
        
        const hotspotMap = new Map();
        alertBlips.forEach(blip => {
            // Grid-based hotspot detection (5% grid cells)
            const gridX = Math.floor(blip.x / 10) * 10;
            const gridY = Math.floor(blip.y / 10) * 10;
            const key = `${gridX}-${gridY}`;
            
            if (!hotspotMap.has(key)) {
                hotspotMap.set(key, { x: gridX + 5, y: gridY + 5, count: 0 });
            }
            hotspotMap.get(key).count++;
        });
        
        return Array.from(hotspotMap.values()).filter(h => h.count >= 2);
    }, [alertBlips]);

    // Calculate predicted next cameras (nearest to last detection)
    const predictedCameras = React.useMemo(() => {
        if (alertBlips.length === 0 || cameraBlips.length === 0) return [];
        
        const lastBlip = alertBlips[alertBlips.length - 1];
        if (!lastBlip.lat || !lastBlip.lng) return [];
        
        // Find cameras not already alerted and sort by distance
        const camerasWithDistance = cameraBlips
            .filter(cam => cam.latitude && cam.longitude)
            .map(cam => ({
                ...cam,
                distance: calculateDistance(lastBlip.lat, lastBlip.lng, cam.latitude, cam.longitude)
            }))
            .sort((a, b) => a.distance - b.distance);
        
        // Return top 3 nearest cameras
        return camerasWithDistance.slice(0, 3).map(c => c.id);
    }, [alertBlips, cameraBlips]);

    // Police units positioning
    const policeBlips = React.useMemo(() => {
        return policeUnits.map((unit, i) => {
            const pos = latLngToRadarXY(unit.latitude, unit.longitude, cameras);
            const lastBlip = alertBlips[alertBlips.length - 1];
            let distance = null;
            let eta = null;
            
            if (lastBlip?.lat && lastBlip?.lng && unit.latitude && unit.longitude) {
                distance = calculateDistance(lastBlip.lat, lastBlip.lng, unit.latitude, unit.longitude);
                eta = Math.ceil(distance / 0.5); // Assuming 30 km/h average speed = 0.5 km/min
            }
            
            return {
                id: unit.unitId || `unit-${i}`,
                x: pos.x,
                y: pos.y,
                status: unit.status || 'AVAILABLE',
                distance,
                eta
            };
        });
    }, [policeUnits, cameras, alertBlips]);

    // Get the latest alert blip for coordinate display
    const latestBlip = alertBlips.length > 0 ? alertBlips[alertBlips.length - 1] : null;
    const latestSeverity = latestBlip ? getSeverityColor(latestBlip.similarity * 100) : null;

    // Radar colors based on severity
    const radarColor = hasActiveAlert ? 'rgba(255, 77, 77' : 'rgba(0, 255, 128';
    const radarGlow = hasActiveAlert ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 255, 128, 0.2)';

    // Format time since detection
    const formatTimeSince = (seconds) => {
        if (seconds === null) return '--';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
    };

    return (
        <div className={`glass-panel ${isFlashing ? 'radar-flash' : ''}`} style={{
            padding: '1.5rem', borderRadius: '16px', height: '100%', minHeight: '350px',
            display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
            border: isFlashing ? '3px solid rgba(255, 0, 0, 1)' : (hasActiveAlert ? '1px solid rgba(255, 77, 77, 0.4)' : '1px solid rgba(255,255,255,0.05)'),
            boxShadow: isFlashing ? '0 0 60px rgba(255, 0, 0, 0.8), 0 0 100px rgba(255, 0, 0, 0.5) inset' : (hasActiveAlert ? '0 0 30px rgba(255, 77, 77, 0.2) inset' : 'none'),
            transition: 'all 0.1s ease',
            animation: isFlashing ? 'radarAlarmFlash 0.15s infinite alternate' : 'none'
        }}>
            {/* Radar-specific CSS animations */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes sweepTrail {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes targetPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.8; }
                }
                @keyframes targetRipple {
                    0% { width: 10px; height: 10px; opacity: 1; border-width: 3px; }
                    100% { width: 60px; height: 60px; opacity: 0; border-width: 1px; }
                }
                @keyframes targetRipple2 {
                    0% { width: 10px; height: 10px; opacity: 0.8; border-width: 2px; }
                    100% { width: 80px; height: 80px; opacity: 0; border-width: 1px; }
                }
                @keyframes nodeGlow {
                    0%, 100% { box-shadow: 0 0 4px currentColor; }
                    50% { box-shadow: 0 0 12px currentColor, 0 0 20px currentColor; }
                }
                @keyframes predictPulse {
                    0%, 100% { box-shadow: 0 0 5px #ffc107, 0 0 10px #ffc107; }
                    50% { box-shadow: 0 0 15px #ffc107, 0 0 25px #ffc107, 0 0 35px #ffc107; }
                }
                @keyframes hotspotGlow {
                    0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
                }
                @keyframes pathDash {
                    to { stroke-dashoffset: -20; }
                }
                .radar-tooltip {
                    position: absolute;
                    background: rgba(10, 25, 47, 0.98);
                    border: 1px solid rgba(100, 255, 218, 0.4);
                    border-radius: 8px;
                    padding: 10px 12px;
                    font-size: 0.7rem;
                    color: white;
                    z-index: 100;
                    min-width: 160px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                    pointer-events: none;
                }
                .radar-tooltip::before {
                    content: '';
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid rgba(100, 255, 218, 0.4);
                }
            `}} />

            {/* Header with Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', zIndex: 10 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={16} color={hasActiveAlert ? "var(--status-alert)" : "var(--brand-blue)"} /> Tactical Radar
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Toggle Controls - Enhanced visibility */}
                    <button onClick={() => setShowCoverage(!showCoverage)} style={{
                        background: showCoverage ? 'rgba(100,255,218,0.35)' : 'rgba(100,100,100,0.2)',
                        border: showCoverage ? '2px solid rgba(100,255,218,0.8)' : '1px solid rgba(150,150,150,0.3)',
                        color: showCoverage ? '#64ffda' : '#888',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer',
                        fontWeight: showCoverage ? '700' : '400',
                        boxShadow: showCoverage ? '0 0 12px rgba(100,255,218,0.5)' : 'none',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>COV {showCoverage ? '●' : '○'}</button>
                    <button onClick={() => setShowPaths(!showPaths)} style={{
                        background: showPaths ? 'rgba(255,77,77,0.35)' : 'rgba(100,100,100,0.2)',
                        border: showPaths ? '2px solid rgba(255,77,77,0.8)' : '1px solid rgba(150,150,150,0.3)',
                        color: showPaths ? '#ff4d4d' : '#888',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer',
                        fontWeight: showPaths ? '700' : '400',
                        boxShadow: showPaths ? '0 0 12px rgba(255,77,77,0.5)' : 'none',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>PATH {showPaths ? '●' : '○'}</button>
                    <span style={{
                        fontSize: '0.65rem',
                        color: hasActiveAlert ? latestSeverity?.color : 'var(--status-success)',
                        background: hasActiveAlert ? `${latestSeverity?.color}15` : 'rgba(40,167,69,0.1)',
                        padding: '3px 8px', borderRadius: '10px',
                        border: `1px solid ${hasActiveAlert ? latestSeverity?.color : 'rgba(40,167,69,0.3)'}40`,
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: hasActiveAlert ? latestSeverity?.color : 'var(--status-success)',
                            animation: hasActiveAlert ? 'pulse 0.5s infinite' : 'pulse 1.5s infinite'
                        }}></div>
                        {hasActiveAlert ? `${alertBlips.length} ${latestSeverity?.label}` : 'SCANNING'}
                    </span>
                </div>
            </div>

            {/* Main Radar Display */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {/* Radar Grid Map - SAME SIZE AS BEFORE */}
                <div style={{
                    position: 'absolute', width: '250px', height: '250px', borderRadius: '50%',
                    border: `2px solid ${radarColor}, 0.4)`,
                    background: 'radial-gradient(circle at center, rgba(0, 20, 10, 0.9) 0%, rgba(0, 10, 5, 0.95) 100%)',
                    boxShadow: `0 0 40px ${radarGlow} inset, 0 0 60px ${radarGlow}`
                }}>
                    {/* Distance Rings with Labels */}
                    {[
                        { size: 87.5, label: '20km' },
                        { size: 75, label: '15km' },
                        { size: 50, label: '10km' },
                        { size: 25, label: '5km' }
                    ].map((ring, i) => (
                        <div key={i}>
                            <div style={{
                                position: 'absolute',
                                top: `${(100 - ring.size) / 2}%`,
                                left: `${(100 - ring.size) / 2}%`,
                                width: `${ring.size}%`,
                                height: `${ring.size}%`,
                                border: `1px solid ${radarColor}, ${0.15 + i * 0.05})`,
                                borderRadius: '50%',
                                boxShadow: `0 0 ${4 + i * 2}px ${radarColor}, 0.1)`
                            }}></div>
                            <div style={{
                                position: 'absolute',
                                top: `${(100 - ring.size) / 2 - 1}%`,
                                left: '52%',
                                fontSize: '0.45rem',
                                color: `${radarColor}, 0.5)`,
                                fontFamily: 'monospace'
                            }}>{ring.label}</div>
                        </div>
                    ))}

                    {/* Crosshairs */}
                    <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', background: `linear-gradient(90deg, transparent 0%, ${radarColor}, 0.3) 20%, ${radarColor}, 0.3) 80%, transparent 100%)` }}></div>
                    <div style={{ position: 'absolute', top: '0', left: '50%', width: '1px', height: '100%', background: `linear-gradient(180deg, transparent 0%, ${radarColor}, 0.3) 20%, ${radarColor}, 0.3) 80%, transparent 100%)` }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '1px', background: `linear-gradient(90deg, transparent 0%, ${radarColor}, 0.15) 30%, ${radarColor}, 0.15) 70%, transparent 100%)`, transform: 'translate(-50%, -50%) rotate(45deg)' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '1px', background: `linear-gradient(90deg, transparent 0%, ${radarColor}, 0.15) 30%, ${radarColor}, 0.15) 70%, transparent 100%)`, transform: 'translate(-50%, -50%) rotate(-45deg)' }}></div>

                    {/* Sweep Animation */}
                    <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: '0', left: '50%', width: '50%', height: '50%',
                            background: hasActiveAlert
                                ? 'conic-gradient(from 0deg at 0% 100%, transparent 0deg, rgba(255,77,77,0.6) 3deg, rgba(255,77,77,0.3) 15deg, transparent 45deg)'
                                : 'conic-gradient(from 0deg at 0% 100%, transparent 0deg, rgba(0,255,128,0.6) 3deg, rgba(0,255,128,0.3) 15deg, transparent 45deg)',
                            transformOrigin: 'bottom left',
                            animation: `sweepTrail ${hasActiveAlert ? '1s' : '4s'} infinite linear`
                        }}></div>
                        <div style={{
                            position: 'absolute', top: '0', left: '50%', width: '50%', height: '50%',
                            background: 'transparent',
                            transformOrigin: 'bottom left',
                            animation: `sweepTrail ${hasActiveAlert ? '1s' : '4s'} infinite linear`,
                            borderRight: hasActiveAlert ? '2px solid rgba(255,77,77,0.95)' : '2px solid rgba(0,255,128,0.9)',
                            boxShadow: hasActiveAlert ? '0 0 15px rgba(255,77,77,0.8)' : '0 0 15px rgba(0,255,128,0.6)'
                        }}></div>
                    </div>

                    {/* ====== HOTSPOT HEAT ZONES ====== */}
                    {hotspots.map((hotspot, i) => (
                        <div key={`hotspot-${i}`} style={{
                            position: 'absolute',
                            top: `${hotspot.y}%`,
                            left: `${hotspot.x}%`,
                            width: `${20 + hotspot.count * 10}px`,
                            height: `${20 + hotspot.count * 10}px`,
                            background: `radial-gradient(circle, rgba(255,77,77,0.4) 0%, rgba(255,77,77,0.1) 50%, transparent 70%)`,
                            borderRadius: '50%',
                            transform: 'translate(-50%, -50%)',
                            animation: 'hotspotGlow 2s ease-in-out infinite',
                            zIndex: 3,
                            pointerEvents: 'none'
                        }}></div>
                    ))}

                    {/* ====== CAMERA COVERAGE ZONES ====== */}
                    {showCoverage && cameraBlips.map(cam => (
                        <div key={`cov-${cam.id}`} style={{
                            position: 'absolute',
                            top: `${cam.y}%`,
                            left: `${cam.x}%`,
                            width: '120px',
                            height: '120px',
                            transform: `translate(-50%, -50%) rotate(${cam.orientation}deg)`,
                            zIndex: 2,
                            pointerEvents: 'none'
                        }}>
                            {/* Wedge-shaped coverage cone - LARGE & VISIBLE */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '110px',
                                height: '110px',
                                background: cam.status === 'ONLINE' 
                                    ? 'conic-gradient(from -45deg, transparent 0deg, rgba(100,255,218,0.5) 0deg, rgba(100,255,218,0.3) 90deg, transparent 90deg)'
                                    : cam.status === 'DEGRADED'
                                    ? 'conic-gradient(from -45deg, transparent 0deg, rgba(255,165,0,0.5) 0deg, rgba(255,165,0,0.3) 90deg, transparent 90deg)'
                                    : 'conic-gradient(from -45deg, transparent 0deg, rgba(255,50,50,0.3) 0deg, rgba(255,50,50,0.15) 90deg, transparent 90deg)',
                                borderRadius: '50%',
                                transform: 'translate(-50%, -50%)',
                                border: cam.status === 'ONLINE' 
                                    ? '1px solid rgba(100,255,218,0.4)' 
                                    : cam.status === 'DEGRADED'
                                    ? '1px solid rgba(255,165,0,0.4)'
                                    : '1px solid rgba(255,50,50,0.2)'
                            }}></div>
                        </div>
                    ))}

                    {/* ====== SUSPECT MOVEMENT PATH ====== */}
                    {showPaths && alertBlips.length >= 1 && (
                        <svg style={{
                            position: 'absolute',
                            top: 0, left: 0,
                            width: '100%', height: '100%',
                            pointerEvents: 'none',
                            zIndex: 8
                        }}>
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,77,77,0.9)" />
                                </marker>
                                <filter id="pathGlow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            
                            {/* If only 1 alert, show line from center to that alert */}
                            {alertBlips.length === 1 && (
                                <line 
                                    x1="50%" y1="50%"
                                    x2={`${alertBlips[0].x}%`} y2={`${alertBlips[0].y}%`}
                                    stroke="rgba(255,77,77,0.8)"
                                    strokeWidth="3"
                                    strokeDasharray="8,4"
                                    markerEnd="url(#arrowhead)"
                                    filter="url(#pathGlow)"
                                    style={{ animation: 'pathDash 1s linear infinite' }}
                                />
                            )}
                            
                            {/* If multiple alerts, connect them in sequence */}
                            {alertBlips.length > 1 && alertBlips.slice(0, -1).map((blip, i) => {
                                const nextBlip = alertBlips[i + 1];
                                return (
                                    <line 
                                        key={`path-${i}`}
                                        x1={`${blip.x}%`} y1={`${blip.y}%`}
                                        x2={`${nextBlip.x}%`} y2={`${nextBlip.y}%`}
                                        stroke="rgba(255,77,77,0.8)"
                                        strokeWidth="3"
                                        strokeDasharray="8,4"
                                        markerEnd="url(#arrowhead)"
                                        filter="url(#pathGlow)"
                                        style={{ animation: 'pathDash 1s linear infinite' }}
                                    />
                                );
                            })}
                        </svg>
                    )}

                    {/* ====== CAMERA NODES WITH HEALTH STATUS ====== */}
                    {cameraBlips.map(cam => {
                        const isPredicted = predictedCameras.includes(cam.id);
                        return (
                            <div 
                                key={cam.id}
                                onMouseEnter={() => setHoveredCamera(cam)}
                                onMouseLeave={() => setHoveredCamera(null)}
                                style={{
                                    position: 'absolute', 
                                    top: `${cam.y}%`, 
                                    left: `${cam.x}%`, 
                                    width: isPredicted ? '10px' : cam.size, 
                                    height: isPredicted ? '10px' : cam.size,
                                    background: isPredicted ? '#ffc107' : cam.color,
                                    borderRadius: '50%',
                                    border: isPredicted ? '2px solid #fff' : 'none',
                                    boxShadow: isPredicted 
                                        ? '0 0 10px #ffc107, 0 0 20px #ffc107' 
                                        : `0 0 8px ${cam.color}`,
                                    animation: isPredicted 
                                        ? 'predictPulse 1s ease-in-out infinite' 
                                        : `nodeGlow 2s infinite ${cam.delay}`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isPredicted ? 15 : 5,
                                    cursor: 'pointer'
                                }}
                            />
                        );
                    })}

                    {/* Camera Tooltip */}
                    {hoveredCamera && (
                        <div className="radar-tooltip" style={{
                            top: `calc(${hoveredCamera.y}% - 75px)`,
                            left: `${hoveredCamera.x}%`,
                            transform: 'translateX(-50%)'
                        }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--brand-blue)', marginBottom: '4px' }}>
                                📷 {hoveredCamera.name}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                                <span style={{ 
                                    color: hoveredCamera.status === 'ONLINE' ? '#28a745' : 
                                           hoveredCamera.status === 'DEGRADED' ? '#ffa500' : '#666',
                                    fontWeight: 'bold'
                                }}>{hoveredCamera.status}</span>
                            </div>
                            {hoveredCamera.latitude && (
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                                    {hoveredCamera.latitude.toFixed(4)}°, {hoveredCamera.longitude.toFixed(4)}°
                                </div>
                            )}
                            {predictedCameras.includes(hoveredCamera.id) && (
                                <div style={{ 
                                    marginTop: '6px', 
                                    padding: '3px 6px', 
                                    background: 'rgba(255,193,7,0.2)', 
                                    border: '1px solid rgba(255,193,7,0.4)',
                                    borderRadius: '4px',
                                    color: '#ffc107',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                }}>⚠️ POTENTIAL NEXT DETECTION</div>
                            )}
                        </div>
                    )}

                    {/* ====== POLICE UNIT MARKERS ====== */}
                    {policeBlips.map(unit => (
                        <div key={unit.id} style={{
                            position: 'absolute',
                            top: `${unit.y}%`,
                            left: `${unit.x}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 12
                        }}>
                            {/* Police vehicle icon */}
                            <div style={{
                                width: '12px',
                                height: '8px',
                                background: unit.status === 'AVAILABLE' ? '#007bff' : '#6c757d',
                                borderRadius: '2px',
                                border: '1px solid rgba(255,255,255,0.5)',
                                boxShadow: unit.status === 'AVAILABLE' 
                                    ? '0 0 8px rgba(0,123,255,0.8)' 
                                    : '0 0 4px rgba(108,117,125,0.5)',
                                position: 'relative'
                            }}>
                                {/* Light bar */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-3px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '6px',
                                    height: '2px',
                                    background: 'linear-gradient(90deg, #ff0000 50%, #0000ff 50%)',
                                    borderRadius: '1px'
                                }}></div>
                            </div>
                            {/* Distance/ETA label */}
                            {unit.distance !== null && hasActiveAlert && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,123,255,0.9)',
                                    color: 'white',
                                    fontSize: '0.5rem',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 'bold'
                                }}>
                                    {unit.distance.toFixed(1)}km • {unit.eta}min
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Center Point */}
                    <div style={{ 
                        position: 'absolute', top: 'calc(50% - 4px)', left: 'calc(50% - 4px)', 
                        width: '8px', height: '8px', 
                        background: hasActiveAlert ? 'rgba(255,77,77,0.9)' : 'rgba(0,255,128,0.9)', 
                        borderRadius: '50%', 
                        boxShadow: hasActiveAlert 
                            ? '0 0 10px rgba(255,77,77,0.8), 0 0 20px rgba(255,77,77,0.4)' 
                            : '0 0 10px rgba(0,255,128,0.8), 0 0 20px rgba(0,255,128,0.4)',
                        zIndex: 10
                    }}></div>

                    {/* ====== ALERT BLIPS WITH DETAILED TOOLTIPS ====== */}
                    {alertBlips.map((blip, index) => {
                        const severity = getSeverityColor(blip.similarity * 100);
                        const isLatest = index === alertBlips.length - 1;
                        
                        return (
                            <div 
                                key={blip.id} 
                                onMouseEnter={() => setHoveredBlip(blip)}
                                onMouseLeave={() => setHoveredBlip(null)}
                                style={{
                                    position: 'absolute', 
                                    top: `${blip.y}%`, 
                                    left: `${blip.x}%`,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    transform: 'translate(-50%, -50%)', 
                                    zIndex: 20,
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Ripple effects for latest blip */}
                                {isLatest && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            border: `2px solid ${severity.color}`,
                                            borderRadius: '50%',
                                            animation: 'targetRipple 2s ease-out infinite',
                                            opacity: 0.8
                                        }}></div>
                                        <div style={{
                                            position: 'absolute',
                                            border: `2px solid ${severity.color}`,
                                            borderRadius: '50%',
                                            animation: 'targetRipple2 2s ease-out infinite',
                                            animationDelay: '0.5s',
                                            opacity: 0.6
                                        }}></div>
                                    </>
                                )}
                                
                                {/* Blip core */}
                                <div style={{
                                    width: isLatest ? '14px' : '10px', 
                                    height: isLatest ? '14px' : '10px',
                                    background: `radial-gradient(circle at 30% 30%, #fff 0%, ${severity.color} 50%, ${severity.color}aa 100%)`,
                                    borderRadius: '50%', 
                                    boxShadow: `0 0 10px 3px ${severity.color}`,
                                    animation: isLatest ? 'targetPulse 0.6s ease-in-out infinite' : 'none',
                                    zIndex: 25
                                }}></div>
                                
                                {/* Sequence number */}
                                {alertBlips.length > 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: severity.color,
                                        color: 'white',
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        fontSize: '0.55rem',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid white'
                                    }}>{index + 1}</div>
                                )}
                            </div>
                        );
                    })}

                    {/* Alert Blip Detailed Tooltip */}
                    {hoveredBlip && (
                        <div className="radar-tooltip" style={{
                            top: `calc(${hoveredBlip.y}% - 100px)`,
                            left: `${hoveredBlip.x}%`,
                            transform: 'translateX(-50%)',
                            minWidth: '180px'
                        }}>
                            <div style={{ fontWeight: 'bold', color: '#ff4d4d', marginBottom: '6px', fontSize: '0.8rem' }}>
                                🎯 {hoveredBlip.personName || 'Unknown'}
                            </div>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Confidence:</span>
                                    <span style={{ color: getSeverityColor(hoveredBlip.similarity * 100).color, fontWeight: 'bold' }}>
                                        {(hoveredBlip.similarity * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Camera:</span>
                                    <span style={{ color: 'white' }}>{hoveredBlip.cameraId || 'Unknown'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Time:</span>
                                    <span style={{ color: 'white', fontFamily: 'monospace' }}>
                                        {new Date(hoveredBlip.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                {hoveredBlip.lat && (
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace', textAlign: 'center' }}>
                                        📍 {hoveredBlip.lat.toFixed(4)}°, {hoveredBlip.lng.toFixed(4)}°
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ====== ENHANCED FOOTER WITH TIMER ====== */}
            <div style={{ 
                marginTop: 'auto', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.7rem', 
                color: hasActiveAlert ? 'var(--status-alert)' : 'var(--text-secondary)', 
                borderTop: hasActiveAlert ? '1px solid rgba(255,77,77,0.2)' : '1px solid rgba(255,255,255,0.05)', 
                paddingTop: '8px', 
                fontFamily: 'monospace'
            }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <span>LAT: {latestBlip?.lat?.toFixed(4) || '16.5399'}°</span>
                    <span>LON: {latestBlip?.lng?.toFixed(4) || '81.5320'}°</span>
                </div>
                
                {/* Time Since Last Detection */}
                {timeSinceLastDetection !== null && (
                    <div style={{
                        background: timeSinceLastDetection < 60 ? 'rgba(255,77,77,0.2)' : 'rgba(255,165,0,0.2)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${timeSinceLastDetection < 60 ? 'rgba(255,77,77,0.4)' : 'rgba(255,165,0,0.4)'}`,
                        color: timeSinceLastDetection < 60 ? '#ff4d4d' : '#ffa500',
                        fontWeight: 'bold',
                        fontSize: '0.65rem'
                    }}>
                        ⏱️ {formatTimeSince(timeSinceLastDetection)}
                    </div>
                )}
                
                <span style={{ 
                    color: cameras.filter(c => c.status === 'ONLINE').length === cameras.length 
                        ? 'var(--status-success)' 
                        : 'var(--status-warning)' 
                }}>
                    NODES: {cameras.filter(c => c.status === 'ONLINE').length}/{cameras.length}
                </span>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        registeredCases: '-',
        alertsToday: '-',
        camerasOnline: '-',
    });

    const [prioritySplit, setPrioritySplit] = useState({ critical: '-', high: '-', routine: '-' });

    const [liveFeed, setLiveFeed] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [newAlertTrigger, setNewAlertTrigger] = useState(false);

    // Animated telemetry values
    const [telemetry, setTelemetry] = useState({ cpu: 45, gpu: 72, mem: 60 });

    // ====== NEW: Real camera data and alert blips for radar ======
    const [cameras, setCameras] = useState([]);
    const [alertBlips, setAlertBlips] = useState([]);
    const [radarFlashing, setRadarFlashing] = useState(false);
    const BLIP_DURATION = 8000; // 8 seconds
    const SIREN_DURATION = 7000; // 7 seconds

    // ====== POLICE UNITS for tactical radar ======
    const [policeUnits, setPoliceUnits] = useState([
        { unitId: 'PATROL_21', latitude: 16.5420, longitude: 81.5350, status: 'AVAILABLE' },
        { unitId: 'PATROL_15', latitude: 16.5370, longitude: 81.5280, status: 'BUSY' },
        { unitId: 'PATROL_08', latitude: 16.5450, longitude: 81.5400, status: 'AVAILABLE' }
    ]);

    // ====== SIREN CONTROL: Prevent multiple sirens ======
    const sirenPlayingRef = useRef(false);
    const sirenTimeoutRef = useRef(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [personsRes, alertsRes, camerasRes] = await Promise.all([
                    api.get('/persons').catch(() => ({ data: [] })),
                    api.get('/alerts/latest').catch(() => ({ data: [] })),
                    api.get('/cameras').catch(() => ({ data: [] }))  // Fetch all cameras with coordinates
                ]);

                // Store cameras for radar
                const camerasData = camerasRes.data || [];
                setCameras(camerasData);

                // Calculate Priority Split from real data
                let critical = 0;
                let high = 0;
                let routine = 0;
                
                const now = new Date();
                const personsList = personsRes.data || [];
                
                personsList.forEach(person => {
                    const age = person.age || 30; // default if unknown
                    const createdAt = new Date(person.createdAt || new Date());
                    const hoursSinceReport = (now - createdAt) / (1000 * 60 * 60);
                    
                    // Critical: Children under 12, Seniors over 65
                    if (age < 12 || age > 65) {
                        critical++;
                    } 
                    // High: Reported missing within the last 48 hours
                    else if (hoursSinceReport < 48) {
                        high++;
                    } 
                    // Routine: Everyone else
                    else {
                        routine++;
                    }
                });

                setPrioritySplit({ critical, high, routine });

                setStats({
                    registeredCases: personsList.length,
                    alertsToday: alertsRes.data.length,
                    camerasOnline: camerasData.filter(c => c.status === 'ONLINE').length
                });

                if (alertsRes.data && alertsRes.data.length > 0) {
                    setLiveFeed(alertsRes.data.slice(0, 6)); // Top 6
                }
            } catch (err) {
                console.error("Dashboard init error", err);
            }
        };

        fetchDashboardData();

        // Helper function to create a radar blip from alert
        const createRadarBlip = (alert, camerasRef) => {
            // Find camera matching the alert's cameraId
            const camera = camerasRef.find(c => c.cameraId === alert.cameraId);
            if (!camera || camera.latitude == null || camera.longitude == null) {
                // Fallback deterministic position based on cameraId so a stationary camera stays in one place
                let fixedLat = 16.539861;
                let fixedLng = 81.532004;
                let xPos = 50; 
                let yPos = 50;
                
                if (alert.cameraId) {
                    let hash = 0;
                    for (let i = 0; i < alert.cameraId.length; i++) {
                        hash = alert.cameraId.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    // Keep within inner circle reliably
                    xPos = 35 + Math.abs(hash % 30);
                    yPos = 35 + Math.abs((hash >> 4) % 30);
                    
                    fixedLat += (hash % 100) * 0.0001;
                    fixedLng += ((hash >> 4) % 100) * 0.0001;
                }
                
                return {
                    id: `alert-${alert.id || Date.now()}-${Math.random()}`,
                    x: xPos,
                    y: yPos,
                    personName: alert.personName || 'Unknown',
                    similarity: alert.similarity || 0,
                    lat: fixedLat,
                    lng: fixedLng,
                    timestamp: Date.now()
                };
            }

            // Convert lat/lng to radar XY
            const pos = latLngToRadarXY(camera.latitude, camera.longitude, camerasRef);
            return {
                id: `alert-${alert.id || Date.now()}-${Math.random()}`,
                x: pos.x,
                y: pos.y,
                personName: alert.personName || 'Unknown',
                similarity: alert.similarity || 0,
                lat: camera.latitude,
                lng: camera.longitude,
                cameraId: alert.cameraId,
                timestamp: Date.now()
            };
        };

        const handleNewAlert = (alert) => {
            setLiveFeed(prev => [alert, ...prev].slice(0, 50));
            setStats(prev => ({ ...prev, alertsToday: (prev.alertsToday === '-' ? 1 : prev.alertsToday + 1) }));
            setNewAlertTrigger(true);
            setTimeout(() => setNewAlertTrigger(false), 3000);

            // ====== POLICE SIREN + RADAR FLASH (only if not already playing) ======
            if (!sirenPlayingRef.current) {
                sirenPlayingRef.current = true;
                playPoliceSiren(SIREN_DURATION);
                setRadarFlashing(true);
                
                // Clear any existing timeout
                if (sirenTimeoutRef.current) {
                    clearTimeout(sirenTimeoutRef.current);
                }
                
                // Reset siren flag after duration
                sirenTimeoutRef.current = setTimeout(() => {
                    sirenPlayingRef.current = false;
                    setRadarFlashing(false);
                }, SIREN_DURATION);
            }

            // Add radar blip using current cameras state
            setCameras(currentCameras => {
                const blip = createRadarBlip(alert, currentCameras);
                setAlertBlips(prev => [...prev, blip]);
                return currentCameras; // Don't modify cameras
            });

            // Spike telemetry on alert
            setTelemetry({ cpu: Math.min(99, telemetry.cpu + 20), gpu: 95, mem: Math.min(90, telemetry.mem + 5) });
        };

        webSocketService.subscribe('/topic/alerts', 'dashboard', handleNewAlert);
        webSocketService.setConnectionListener(setWsConnected, 'dashboard');

        // Random telemetry fluctuations
        const telInterval = setInterval(() => {
            setTelemetry(prev => ({
                cpu: Math.max(20, Math.min(85, prev.cpu + (Math.random() * 10 - 5))),
                gpu: Math.max(40, Math.min(95, prev.gpu + (Math.random() * 14 - 7))),
                mem: Math.max(40, Math.min(80, prev.mem + (Math.random() * 4 - 2)))
            }));
        }, 3000);

        // ====== NEW: Cleanup expired alert blips every second ======
        const blipCleanupInterval = setInterval(() => {
            const now = Date.now();
            setAlertBlips(prev => prev.filter(b => (now - b.timestamp) < BLIP_DURATION));
        }, 1000);

        return () => {
            webSocketService.unsubscribe('/topic/alerts', 'dashboard');
            webSocketService.setConnectionListener(null, 'dashboard');
            clearInterval(telInterval);
            clearInterval(blipCleanupInterval);
            // Cleanup siren timeout on unmount
            if (sirenTimeoutRef.current) {
                clearTimeout(sirenTimeoutRef.current);
            }
            sirenPlayingRef.current = false;
        };
    }, []);

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes blipFlash { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }
                @keyframes blipFadeIn { 0% { opacity: 0; transform: scale(0) } 50% { opacity: 1; transform: scale(1.5) } 100% { opacity: 1; transform: scale(1) } }
                @keyframes barPulse { 0% { opacity: 0.8; filter: brightness(1); } 100% { opacity: 1; filter: brightness(1.2); } }
                @keyframes radarAlarmFlash { 
                    0% { border-color: rgba(255, 0, 0, 1); box-shadow: 0 0 60px rgba(255, 0, 0, 0.9), 0 0 120px rgba(255, 0, 0, 0.6) inset; background: rgba(255, 0, 0, 0.15); }
                    100% { border-color: rgba(255, 255, 255, 1); box-shadow: 0 0 80px rgba(255, 255, 255, 0.7), 0 0 100px rgba(255, 0, 0, 0.4) inset; background: rgba(255, 255, 255, 0.1); }
                }
                .grid-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
                @media (max-width: 1024px) { .grid-layout { grid-template-columns: 1fr; } }
            `}} />

            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Command Logo - Unique hexagon with crosshairs */}
                    <CommandLogo3D size={65} />
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            DIGITAL COMMAND ROOM
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Global overview of Active Intelligence operations.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Shield size={16} color="var(--brand-blue)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>System State:</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--status-success)', fontWeight: 'bold' }}>SECURED</span>
                </div>
            </div>

            {/* Top Stats Row & 3D Logo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard title="Target Profiles" value={stats.registeredCases} icon={Users} color="var(--brand-blue)" isHighlight={newAlertTrigger} />
                <StatCard title="Alerts (24h Window)" value={stats.alertsToday} icon={AlertTriangle} color="var(--status-alert)" isHighlight={newAlertTrigger} />
                <StatCard title="Active Surveillance Nodes" value={stats.camerasOnline} icon={Video} color="var(--text-accent)" isHighlight={newAlertTrigger} />

                {/* Big 3D Logo placed perfectly in the rightmost slot for maximum visual impact */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px', height: '220px', background: 'radial-gradient(circle at center, rgba(100, 255, 218, 0.1) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(15px)', zIndex: 0 }}></div>
                    <div style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.6))', transform: 'scale(1.15)' }}>
                        <ThreeDLogo size={175} />
                    </div>
                </div>
            </div>
            {/* Main Content Grid */}
            <div className="grid-layout">
                {/* Left Column: Radar & Telemetry */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ height: '350px' }}>
                        <SurveillanceRadar 
                            cameras={cameras} 
                            alertBlips={alertBlips} 
                            hasActiveAlert={alertBlips.length > 0 || newAlertTrigger}
                            isFlashing={radarFlashing}
                            policeUnits={policeUnits}
                        />
                    </div>

                    {/* Case Priority Breakdown */}
                    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={18} color="var(--brand-blue)" /> Target Profiles Priority Split
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', background: 'rgba(255,77,77,0.1)', borderRadius: '10px', border: '1px solid rgba(255,77,77,0.3)' }}>
                                <AlertOctagon size={28} color="var(--status-alert)" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--status-alert)', lineHeight: '1' }}>{prioritySplit.critical}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Critical</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', background: 'rgba(255,193,7,0.1)', borderRadius: '10px', border: '1px solid rgba(255,193,7,0.3)' }}>
                                <AlertTriangle size={28} color="var(--status-warning)" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--status-warning)', lineHeight: '1' }}>{prioritySplit.high}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>High Priority</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', background: 'rgba(100,255,218,0.1)', borderRadius: '10px', border: '1px solid rgba(100,255,218,0.3)' }}>
                                <Info size={28} color="var(--brand-blue)" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--brand-blue)', lineHeight: '1' }}>{prioritySplit.routine}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Routine</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hardware Telemetry Panel */}
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={18} color="var(--text-accent)" /> AI Node Hardware Telemetry
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                            <div>
                                <TelemetryBar label="DNN Inference GPU" value={Math.round(telemetry.gpu)} color="var(--brand-blue)" delay={0} />
                                <TelemetryBar label="Core CPU Load" value={Math.round(telemetry.cpu)} color="var(--text-accent)" delay={0.5} />
                                <TelemetryBar label="Memory Allocation" value={Math.round(telemetry.mem)} color="var(--status-warning)" delay={1} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Cpu size={16} color="var(--text-secondary)" /> <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Engine: YOLOv8 + VGGFace2</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <HardDrive size={16} color="var(--text-secondary)" /> <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Embedding Size: 512-D Vector</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Activity size={16} color="var(--text-secondary)" /> <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Matching: Cosine Similarity & FAISS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Incident Feed */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>

                    {/* Live Feed Card */}
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-alert)', boxShadow: '0 0 8px var(--status-alert)', animation: 'pulse 1.5s infinite' }}></div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Incident Feed</h3>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {liveFeed.length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <Activity size={48} color="var(--text-secondary)" style={{ marginBottom: '15px' }} />
                                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>Awaiting target acquisitions...</p>
                                </div>
                            ) : (
                                liveFeed.map((alert, index) => (
                                    <AlertCard key={alert.id || index} alert={alert} isNew={index === 0 && newAlertTrigger} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
