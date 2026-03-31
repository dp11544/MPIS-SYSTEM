import React, { useEffect, useState } from 'react';
import { Camera, MapPin, Clock } from 'lucide-react';

const AlertCard = ({ alert, isNew }) => {
    const similarityPercent = (alert.similarity * 100).toFixed(1);
    const isHighConfidence = alert.similarity >= 0.8;
    const color = isHighConfidence ? 'var(--status-alert)' : 'var(--status-warning)';

    // Manage slide-in entry animation
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        // Trigger generic animation on mount
        const timer = setTimeout(() => setAnimateIn(true), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className={`glass-panel ${isNew ? 'alert-pulse-glow' : ''}`}
            style={{
                padding: '16px',
                borderRadius: '12px',
                borderLeft: `5px solid ${color}`,
                marginBottom: '10px',
                transform: animateIn ? 'translateX(0)' : 'translateX(-20px)',
                opacity: animateIn ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: isNew ? `0 0 15px ${isHighConfidence ? 'rgba(255,77,77,0.4)' : 'rgba(255,193,7,0.4)'}` : '0 4px 15px rgba(0,0,0,0.2)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '50%', background: 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${color}`
                    }}>
                        {alert.imageUrl ? (
                            <img src={alert.imageUrl} alt="Person" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {alert.personName?.charAt(0) || 'U'}
                            </span>
                        )}
                    </div>
                    <div>
                        <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {alert.personName || `ID: ${alert.personId}`}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                            <Camera size={12} /> <span style={{ fontFamily: 'var(--font-mono)' }}>{alert.cameraId || 'UNKNOWN_CAM'}</span>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        background: isHighConfidence ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                        color: color,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        border: `1px solid ${isHighConfidence ? 'rgba(255, 77, 77, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`
                    }}>
                        {similarityPercent}%
                    </div>
                    {alert.confidenceLevel && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase' }}>
                            {alert.confidenceLevel}
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={14} />
                    <span>{new Date(alert.detectedAt.endsWith('Z') ? alert.detectedAt : alert.detectedAt + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                {isNew && (
                    <span style={{ color: 'var(--status-alert)', fontSize: '0.75rem', animation: 'pulse 1.5s infinite' }}>● JUST NOW</span>
                )}
            </div>
        </div>
    );
};

export default AlertCard;
