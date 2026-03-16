import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    UserPlus,
    History,
    Activity,
    Server,
    Database,
    ScanFace,
    LineChart,
    Map
} from 'lucide-react';
import PoliceBadge from '../widgets/PoliceBadge';

const Sidebar = () => {
    const navItems = [
        { path: '/dashboard', label: 'Command Overview', icon: LayoutDashboard },
        { path: '/register', label: 'Register Case', icon: UserPlus },
        { path: '/registry', label: 'Missing Persons Registry', icon: Database },
        { path: '/alerts', label: 'Alert History', icon: History },
        { path: '/live', label: 'Live Monitor', icon: Activity },
        { path: '/forensic', label: 'Forensic Match', icon: ScanFace },
        { path: '/analytics', label: 'Intelligence Analytics', icon: LineChart },
        { path: '/map', label: 'Deployment Map', icon: Map },
        { path: '/status', label: 'System Status', icon: Server },
    ];

    return (
        <aside style={{
            width: '280px',
            background: 'linear-gradient(180deg, var(--bg-primary) 0%, rgba(10, 25, 47, 0.95) 100%)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
            boxShadow: '4px 0 20px rgba(0,0,0,0.3)'
        }}>
            <div style={{
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.2rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)'
            }}>
                <div style={{ marginRight: '10px' }}>
                    <PoliceBadge size={50} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '2.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>MPIS</h1>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1.5px', fontWeight: 'bold' }}>INTELLIGENCE SYSTEM</span>
                </div>
            </div>

            <nav style={{ flex: 1, padding: '2rem 1rem', overflowY: 'auto' }}>
                <p style={{
                    fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase',
                    letterSpacing: '1.5px', marginBottom: '15px', paddingLeft: '15px', fontWeight: 'bold'
                }}>
                    Main Navigation
                </p>
                <ul style={{ listStyle: 'none' }}>
                    {navItems.map((item) => (
                        <li key={item.path} style={{ marginBottom: '8px' }}>
                            <NavLink
                                to={item.path}
                                style={({ isActive }) => ({
                                    display: 'flex', alignItems: 'center', padding: '12px 18px', borderRadius: '12px',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'rgba(0, 123, 255, 0.15)' : 'transparent',
                                    fontWeight: isActive ? 'bold' : '600',
                                    border: isActive ? '1px solid rgba(0, 123, 255, 0.3)' : '1px solid transparent',
                                    textDecoration: 'none',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                })}
                                onMouseOver={e => {
                                    if (!e.currentTarget.className.includes('active')) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }
                                }}
                                onMouseOut={e => {
                                    if (!e.currentTarget.className.includes('active')) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }
                                }}
                            >
                                <item.icon size={20} style={{
                                    marginRight: '15px',
                                    color: 'inherit',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                }} />
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(35, 53, 84, 0.6), rgba(17, 34, 64, 0.8))',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-accent)', boxShadow: '0 0 8px var(--text-accent)' }}></div>
                        <h4 style={{ color: 'var(--text-accent)', fontSize: '0.85rem', margin: 0, letterSpacing: '0.5px' }}>SECURE LINE</h4>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>End-to-End Encryption (TLS 1.3)</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
