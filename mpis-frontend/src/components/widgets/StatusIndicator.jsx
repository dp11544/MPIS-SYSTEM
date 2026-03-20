import React from 'react';

const StatusIndicator = ({ status, label }) => {
    // Determine color and glow based on status
    const isOnline = status === 'online';
    const isWarning = status === 'warning';

    let color = 'var(--status-alert)'; // Default red/offline
    if (isOnline) color = 'var(--status-success)';
    if (isWarning) color = 'var(--status-warning)';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'var(--bg-tertiary)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
        }}>
            <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 8px ${color}`,
                animation: isOnline ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                letterSpacing: '0.5px'
            }}>
                {label}
            </span>
        </div>
    );
};

export default StatusIndicator;
