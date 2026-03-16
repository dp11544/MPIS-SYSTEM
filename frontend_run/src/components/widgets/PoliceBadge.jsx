import React from 'react';

const PoliceBadge = ({ size = 40 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
            {/* Outer Shield */}
            <path
                d="M50 5 L90 25 L90 55 Q90 80 50 95 Q10 80 10 55 L10 25 Z"
                fill="url(#badgeGradient)"
                stroke="url(#borderGradient)"
                strokeWidth="2"
            />
            
            {/* Inner Shield */}
            <path
                d="M50 12 L82 28 L82 52 Q82 73 50 86 Q18 73 18 52 L18 28 Z"
                fill="rgba(10, 25, 47, 0.9)"
                stroke="rgba(100, 255, 218, 0.3)"
                strokeWidth="1"
            />
            
            {/* Star Badge */}
            <polygon
                points="50,20 53,35 68,35 56,45 60,60 50,52 40,60 44,45 32,35 47,35"
                fill="url(#starGradient)"
                stroke="rgba(255,215,0,0.8)"
                strokeWidth="0.5"
            />
            
            {/* Center Circle */}
            <circle
                cx="50"
                cy="42"
                r="8"
                fill="rgba(10, 25, 47, 0.95)"
                stroke="rgba(100, 255, 218, 0.5)"
                strokeWidth="1"
            />
            
            {/* P Letter */}
            <text
                x="50"
                y="46"
                textAnchor="middle"
                fill="var(--text-accent)"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
            >
                P
            </text>
            
            {/* POLICE Text */}
            <text
                x="50"
                y="72"
                textAnchor="middle"
                fill="rgba(100, 255, 218, 0.9)"
                fontSize="8"
                fontWeight="bold"
                letterSpacing="1"
                fontFamily="monospace"
            >
                POLICE
            </text>
            
            {/* Gradients */}
            <defs>
                <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(0, 123, 255, 0.3)" />
                    <stop offset="50%" stopColor="rgba(10, 25, 47, 0.95)" />
                    <stop offset="100%" stopColor="rgba(0, 123, 255, 0.2)" />
                </linearGradient>
                <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(100, 255, 218, 0.8)" />
                    <stop offset="50%" stopColor="rgba(0, 123, 255, 0.6)" />
                    <stop offset="100%" stopColor="rgba(100, 255, 218, 0.8)" />
                </linearGradient>
                <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255, 215, 0, 0.9)" />
                    <stop offset="50%" stopColor="rgba(255, 180, 0, 0.7)" />
                    <stop offset="100%" stopColor="rgba(255, 215, 0, 0.9)" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default PoliceBadge;
