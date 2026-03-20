import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, isHighlight }) => {
    return (
        <div
            className="glass-panel"
            style={{
                position: 'relative',
                padding: '1.5rem',
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(16, 33, 62, 0.5) 0%, rgba(8, 15, 30, 0.9) 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderTop: `4px solid ${color}`,
                boxShadow: isHighlight
                    ? `0 10px 30px ${color}33, inset 0 0 20px ${color}1A`
                    : '0 10px 30px rgba(0,0,0,0.5)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                overflow: 'hidden',
                animation: isHighlight ? 'cardBlink5 0.6s 5' : 'none',
                transform: isHighlight ? 'translateY(-3px)' : 'translateY(0)'
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes cardBlink5 {
                    0%, 100% { filter: brightness(1); transform: scale(1); border-top-color: ${color}; }
                    50% { filter: brightness(1.5) drop-shadow(0 0 15px ${color}80); transform: scale(1.02); border-top-color: #fff; }
                }
            `}} />

            {/* Subtle background glow */}
            <div style={{
                position: 'absolute',
                top: '-30px',
                right: '-30px',
                width: '120px',
                height: '120px',
                background: color,
                opacity: isHighlight ? 0.25 : 0.05,
                filter: 'blur(40px)',
                borderRadius: '50%',
                pointerEvents: 'none',
                transition: 'opacity 0.3s'
            }} />

            {/* Top Row: Icon and Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '8px',
                        background: `linear-gradient(135deg, ${color}22, rgba(0,0,0,0.3))`,
                        borderRadius: '10px',
                        border: `1px solid ${color}33`
                    }}>
                        <Icon size={20} color={color} />
                    </div>
                    <span style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: '700'
                    }}>
                        {title}
                    </span>
                </div>

                {/* Highlight Indicator */}
                {isHighlight && (
                    <div style={{
                        background: `${color}22`,
                        color: color,
                        fontSize: '0.65rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${color}80`,
                        animation: 'pulse 1.5s infinite',
                        fontWeight: 'bold',
                        boxShadow: `0 0 10px ${color}66`,
                        letterSpacing: '0.5px'
                    }}>
                        UPDATE
                    </div>
                )}
            </div>

            {/* Bottom Row: Giant Value */}
            <div style={{ marginTop: '1.5rem', zIndex: 1 }}>
                <h3 style={{
                    fontSize: '3rem',
                    fontWeight: '900',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: '1',
                    fontFamily: 'var(--font-mono)',
                    textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                }}>
                    {value}
                </h3>
            </div>
        </div>
    );
};

export default StatCard;
