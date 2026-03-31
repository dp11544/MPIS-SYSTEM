import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterCase from './pages/RegisterCase';
import Registry from './pages/Registry';
import Alerts from './pages/Alerts';
import LiveAlerts from './pages/LiveAlerts';
import SystemStatus from './pages/SystemStatus';
import ForensicMatch from './pages/ForensicMatch';
import Analytics from './pages/Analytics';
import DeploymentMap from './pages/DeploymentMap';
import OfficialCaseFile from './pages/OfficialCaseFile';
import Protection from './components/common/Protection';
import { CameraProvider } from './contexts/CameraContext';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <ToastContainer />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    {/* Case File Page - Protected but standalone (no Layout) */}
                    <Route path="/case-file" element={<Protection><OfficialCaseFile /></Protection>} />
                    <Route element={<Protection><CameraProvider><Layout /></CameraProvider></Protection>}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/register" element={<RegisterCase />} />
                        <Route path="/registry" element={<Registry />} />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/live" element={<LiveAlerts />} />
                        <Route path="/forensic" element={<ForensicMatch />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/map" element={<DeploymentMap />} />
                        <Route path="/status" element={<SystemStatus />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
