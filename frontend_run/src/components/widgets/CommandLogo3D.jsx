import React from 'react';

const CommandLogo3D = ({ size = 80 }) => {
    return (
        <div style={{
            width: size,
            height: size,
            position: 'relative',
        }}>
            {/* Outer Rotating Ring */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid rgba(0, 200, 255, 0.3)',
                borderTopColor: 'rgba(0, 200, 255, 0.8)',
                animation: 'ringRotate 2s linear infinite',
            }} />

            {/* Middle Pulse Ring */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '1px solid rgba(100, 255, 218, 0.4)',
                animation: 'ringPulse 1.5s ease-in-out infinite',
            }} />

            {/* Core Circle with Gradient */}
            <div style={{
                position: 'absolute',
                top: '15%',
                left: '15%',
                width: '70%',
                height: '70%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.95) 0%, rgba(0, 50, 100, 0.9) 50%, rgba(0, 30, 60, 0.95) 100%)',
                border: '2px solid rgba(100, 255, 218, 0.6)',
                boxShadow: '0 0 20px rgba(0, 200, 255, 0.4), inset 0 0 20px rgba(0, 100, 200, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Eye/Surveillance Icon */}
                <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 50 50">
                    {/* Outer Eye Shape */}
                    <ellipse 
                        cx="25" cy="25" rx="22" ry="14" 
                        fill="none" 
                        stroke="rgba(100, 255, 218, 0.8)" 
                        strokeWidth="2"
                    />
                    {/* Iris */}
                    <circle 
                        cx="25" cy="25" r="10" 
                        fill="rgba(0, 150, 255, 0.3)"
                        stroke="rgba(0, 200, 255, 0.9)"
                        strokeWidth="1.5"
                    />
                    {/* Pupil */}
                    <circle 
                        cx="25" cy="25" r="5" 
                        fill="rgba(255, 50, 50, 0.9)"
                        style={{ animation: 'pupilGlow 1s ease-in-out infinite alternate' }}
                    />
                    {/* Scan Line */}
                    <line 
                        x1="3" y1="25" x2="47" y2="25" 
                        stroke="rgba(100, 255, 218, 0.4)" 
                        strokeWidth="1"
                        strokeDasharray="3 2"
                    />
                </svg>
            </div>

            {/* Corner Tech Accents */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '4px',
                height: '12px',
                background: 'linear-gradient(to bottom, rgba(100, 255, 218, 0.9), transparent)',
            }} />
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '4px',
                height: '12px',
                background: 'linear-gradient(to top, rgba(100, 255, 218, 0.9), transparent)',
            }} />
            <div style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '4px',
                background: 'linear-gradient(to right, rgba(100, 255, 218, 0.9), transparent)',
            }} />
            <div style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '4px',
                background: 'linear-gradient(to left, rgba(100, 255, 218, 0.9), transparent)',
            }} />

            <style>{`
                @keyframes ringRotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes ringPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                @keyframes pupilGlow {
                    0% { fill: rgba(255, 50, 50, 0.7); }
                    100% { fill: rgba(255, 100, 100, 1); }
                }
            `}</style>
        </div>
    );
};

export default CommandLogo3D;
