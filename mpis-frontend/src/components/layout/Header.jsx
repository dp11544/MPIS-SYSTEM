import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut, AlertTriangle, Clock, MapPin, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import StatusIndicator from '../widgets/StatusIndicator';
import webSocketService from '../../services/WebSocketService';
import api from '../../api/axios';
const BASE_URL = import.meta.env.VITE_API_URL;

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [wsConnected, setWsConnected] = useState(false);
    const [wsConnecting, setWsConnecting] = useState(true);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [latestAlerts, setLatestAlerts] = useState([]);
    const [alertCount, setAlertCount] = useState(0);

    useEffect(() => {
        // Use stable ID so we don't overwrite other page listeners
        const unsubscribe = webSocketService.setConnectionListener((isConnected) => {
            setWsConnected(isConnected);
            setWsConnecting(false);
        }, 'header');
        return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }, []);

    // Fetch latest alerts
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await api.get('/alerts');
                const sorted = res.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setLatestAlerts(sorted.slice(0, 5));
                setAlertCount(sorted.length > 0 ? Math.min(sorted.length, 5) : 0);
            } catch (err) {
                console.error("Failed to fetch alerts", err);
            }
        };
        fetchAlerts();
        
        // Refresh every 10 seconds
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getTitle = (path) => {
        switch (path) {
            case '/dashboard': return 'MISSING PERSON INTELLIGENCE SYSTEM';
            case '/register': return 'Register Missing Person';
            case '/alerts': return 'Historical Alert Logs';
            case '/live': return 'Real-Time Surveillance';
            case '/status': return 'System Diagnostics';
            default: return 'MPIS Dashboard';
        }
    };

    // Simulated Officer Details for the prototype
    const officerDetails = {
        name: user?.username || 'A. DURGA PRASAD',
        rank: 'Sub-Inspector',
        badgeId: user?.batchId || 'AP-84920',
        clearance: user?.role || 'LEVEL 4 CLEARANCE',
        phone: '+91 93816 15617',
        jurisdiction: 'Bhimavaram 1 Town P.S.',
        status: 'Active Duty'
    };

    return (
        <header style={{
            height: '75px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            background: 'var(--bg-secondary)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 100, // Increased z-index for dropdown
            position: 'relative'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: '800',
                    margin: 0
                }}>
                    {getTitle(location.pathname)}
                </h2>
                <div style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <StatusIndicator
                        status={wsConnecting ? 'warning' : wsConnected ? 'online' : 'error'}
                        label={wsConnecting ? 'CONNECTING...' : wsConnected ? 'LIVE FEED CONNECTED' : 'RECONNECTING...'}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                {/* Notification Bell with Dropdown */}
                <div style={{ position: 'relative' }}>
                    <div 
                        style={{ position: 'relative', cursor: 'pointer', padding: '8px' }}
                        onClick={() => { setNotificationOpen(!notificationOpen); setDropdownOpen(false); }}
                    >
                        <Bell size={22} color={notificationOpen ? 'var(--brand-blue)' : 'var(--text-secondary)'} style={{ transition: 'color 0.2s' }} />
                        {alertCount > 0 && (
                            <span style={{
                                position: 'absolute', top: 2, right: 2,
                                background: 'var(--status-alert)', 
                                minWidth: '18px', height: '18px', 
                                borderRadius: '9px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', fontWeight: 'bold', color: 'white',
                                boxShadow: '0 0 8px var(--status-alert)', 
                                animation: 'pulse 2s infinite'
                            }}>{alertCount}</span>
                        )}
                    </div>

                    {/* Notifications Dropdown */}
                    {notificationOpen && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                onClick={() => setNotificationOpen(false)}
                            ></div>

                            <div style={{
                                position: 'absolute', top: '120%', right: '0', width: '380px',
                                background: 'rgba(10, 25, 47, 0.98)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.6)', zIndex: 100,
                                animation: 'slideDown 0.2s ease-out', overflow: 'hidden'
                            }}>
                                {/* Header */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(255,77,77,0.15), rgba(255,77,77,0.05))',
                                    padding: '15px 20px',
                                    borderBottom: '1px solid rgba(255,77,77,0.2)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertTriangle size={18} color="var(--status-alert)" />
                                        <span style={{ color: 'white', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                            LATEST ALERTS
                                        </span>
                                    </div>
                                    <span style={{ 
                                        background: 'var(--status-alert)', 
                                        color: 'white', 
                                        padding: '3px 10px', 
                                        borderRadius: '12px', 
                                        fontSize: '11px', 
                                        fontWeight: 'bold' 
                                    }}>
                                        {latestAlerts.length} NEW
                                    </span>
                                </div>

                                {/* Alert List */}
                                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {latestAlerts.length > 0 ? (
                                        latestAlerts.map((alert, index) => (
                                            <div 
                                                key={alert.id || index}
                                                style={{
                                                    padding: '15px 20px',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'flex-start'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
                                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                onClick={() => {
                                                    setNotificationOpen(false);
                                                    navigate('/alerts');
                                                }}
                                            >
                                                {/* Photo or Icon */}
                                                <div style={{
                                                    width: '45px', height: '45px', borderRadius: '8px',
                                                    background: 'rgba(255,77,77,0.15)',
                                                    border: '2px solid rgba(255,77,77,0.4)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    overflow: 'hidden', flexShrink: 0
                                                }}>
                                                    {alert.photoPath ? (
                                                        <img 
                                                           src={`${BASE_URL}/${alert.photoPath}`}
                                                            alt=""
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <User size={20} color="var(--status-alert)" />
                                                    )}
                                                </div>

                                                {/* Alert Details */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center',
                                                        marginBottom: '4px'
                                                    }}>
                                                        <span style={{ 
                                                            color: 'white', 
                                                            fontWeight: 'bold', 
                                                            fontSize: '14px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {alert.personName || 'Unknown'}
                                                        </span>
                                                        <span style={{
                                                            background: alert.confidence >= 70 ? 'var(--status-alert)' : 
                                                                       alert.confidence >= 50 ? '#ffa500' : '#666',
                                                            color: 'white',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            flexShrink: 0
                                                        }}>
                                                            {alert.confidence?.toFixed(1) || 0}%
                                                        </span>
                                                    </div>
                                                    
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '12px',
                                                        marginBottom: '3px'
                                                    }}>
                                                        <MapPin size={12} />
                                                        <span>{alert.cameraId || alert.location || 'Unknown Location'}</span>
                                                    </div>
                                                    
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '11px'
                                                    }}>
                                                        <Clock size={11} />
                                                        <span>
                                                            {alert.timestamp ? new Date(alert.timestamp).toLocaleString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : 'Just now'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ 
                                            padding: '40px 20px', 
                                            textAlign: 'center', 
                                            color: 'var(--text-secondary)' 
                                        }}>
                                            <Bell size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                            <p>No recent alerts</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer - View All */}
                                <div 
                                    style={{
                                        padding: '12px 20px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(100,255,218,0.1)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                                    onClick={() => {
                                        setNotificationOpen(false);
                                        navigate('/alerts');
                                    }}
                                >
                                    <span style={{ color: 'var(--brand-blue)', fontWeight: 'bold', fontSize: '13px' }}>
                                        VIEW ALL ALERTS
                                    </span>
                                    <ChevronRight size={16} color="var(--brand-blue)" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '15px',
                    borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '25px',
                    position: 'relative'
                }}>
                    <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => { setDropdownOpen(!dropdownOpen); setNotificationOpen(false); }}>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {officerDetails.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                            {officerDetails.rank}
                        </div>
                    </div>

                    <div
                        onClick={() => { setDropdownOpen(!dropdownOpen); setNotificationOpen(false); }}
                        style={{
                            width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
                            background: 'linear-gradient(135deg, var(--brand-blue), var(--bg-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(100, 255, 218, 0.4)', boxShadow: '0 0 10px rgba(100,255,218,0.2)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <User size={20} color="white" />
                    </div>

                    {/* Officer Profile Dropdown */}
                    {dropdownOpen && (
                        <>
                            {/* Invisible overlay to catch outside clicks */}
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                onClick={() => setDropdownOpen(false)}
                            ></div>

                            <div style={{
                                position: 'absolute', top: '120%', right: '0', width: '300px',
                                background: 'rgba(10, 25, 47, 0.95)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(100, 255, 218, 0.2)', borderRadius: '12px',
                                padding: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 100,
                                animation: 'slideDown 0.2s ease-out'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '15px' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-blue), var(--bg-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(100, 255, 218, 0.5)' }}>
                                        <User size={26} color="white" />
                                    </div>
                                    <div>
                                        <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1.1rem' }}>{officerDetails.name}</h4>
                                        <span style={{ color: 'var(--brand-blue)', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(0, 123, 255, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                                            {officerDetails.rank}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Badge ID:</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'monospace' }}>{officerDetails.badgeId}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Clearance:</span>
                                        <span style={{ color: 'var(--status-alert)', fontWeight: 'bold' }}>{officerDetails.clearance}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Contact:</span>
                                        <span style={{ color: 'var(--text-primary)' }}>{officerDetails.phone}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Jurisdiction:</span>
                                        <span style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '140px' }}>{officerDetails.jurisdiction}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                                        <span style={{ color: 'var(--status-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-success)', animation: 'pulse 2s infinite' }}></div>
                                            {officerDetails.status}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        width: '100%', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)',
                                        color: 'var(--status-alert)', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = 'var(--status-alert)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'; e.currentTarget.style.color = 'var(--status-alert)'; }}
                                >
                                    <LogOut size={16} /> SIGN OFF DUTY
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
