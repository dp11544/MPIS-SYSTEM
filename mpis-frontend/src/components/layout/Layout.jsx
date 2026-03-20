import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import webSocketService from '../../services/WebSocketService';

const Layout = () => {
    useEffect(() => {
        webSocketService.connect();
        return () => {
            webSocketService.disconnect();
        };
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Header />
                <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
