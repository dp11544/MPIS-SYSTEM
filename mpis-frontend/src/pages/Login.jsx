import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Activity, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../features/login.css';

const Login = () => {
    // Stage 1: Credentials
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin');

    // Stage 2: OTP
    const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | 'OTP'
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

    // General UI
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, verifyOtp } = useAuth();
    const navigate = useNavigate();

    // OTP Timer countdown
    useEffect(() => {
        let timer;
        if (step === 'OTP' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && step === 'OTP') {
            setError('OTP Expired. Please login again.');
            setStep('CREDENTIALS');
            setOtp('');
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await login(username, password);
            if (result.requiresOtp) {
                setStep('OTP');
                setTimeLeft(120); // Reset visual timer to 2 minutes

                // Demo Mode Injection
                if (result.demoOtp) {
                    setOtp(result.demoOtp);
                } else {
                    setOtp('');
                }
            }
        } catch (err) {
            setError(err.message || 'Invalid ID or Password. Access Denied.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await verifyOtp(username, otp);
            navigate('/dashboard');
        } catch (err) {
            if (err.status === 'OTP_EXPIRED') {
                setError('Session expired. Please login again.');
                setStep('CREDENTIALS');
                setOtp('');
            } else {
                setError(err.message || 'Invalid OTP.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="login-container">
            <div className="login-overlay"></div>

            <div className="login-card glass-panel">
                <div className="login-header">
                    <div className="logo-spinner-container">
                        <Shield className="logo-icon" size={64} color="var(--brand-blue)" />
                        <div className="logo-ring"></div>
                    </div>
                    <h1>MPIS Access</h1>
                    <p>Missing Person Intelligence System</p>
                    <p className="subtitle">RESTRICTED GOVERNMENT SYSTEM</p>
                </div>

                {step === 'CREDENTIALS' ? (
                    <form onSubmit={handleCredentialsSubmit}>
                        <div className="form-group">
                            <label>Officer ID</label>
                            <div className="input-icon-wrapper">
                                <Shield size={18} className="input-icon" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter Badge Number"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Secure Key</label>
                            <div className="input-icon-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter Password"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? (
                                <span className="loading-text">
                                    <Activity className="spin" size={18} /> Authenticating...
                                </span>
                            ) : (
                                "SECURE LOGIN"
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                            <Lock size={32} color="var(--brand-blue)" style={{ margin: '0 auto 10px auto' }} />
                            <p><strong>Two-Factor Authentication</strong></p>
                            <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>
                                A one-time passcode has been sent to your registered device.<br />
                                {otp ? <span style={{ color: 'var(--brand-blue)', fontWeight: 'bold' }}>Demo Mode: OTP Auto-Filled</span> : "Check your device to verify your identity."}
                            </p>
                            <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 30 ? 'var(--status-alert)' : 'var(--text-primary)' }}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>6-Digit OTP</label>
                            <div className="input-icon-wrapper">
                                <Key size={18} className="input-icon" />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter OTP"
                                    disabled={isLoading}
                                    maxLength="6"
                                    pattern="\d{6}"
                                    autoComplete="off"
                                    required
                                    style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.1rem' }}
                                />
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="login-btn" disabled={isLoading || otp.length < 6}>
                            {isLoading ? (
                                <span className="loading-text">
                                    <Activity className="spin" size={18} /> Verifying...
                                </span>
                            ) : (
                                "VERIFY IDENTITY"
                            )}
                        </button>

                        <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', width: '100%', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setStep('CREDENTIALS')}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    </form>
                )}

                <div className="login-footer">
                    <p>UNAUTHORIZED ACCESS IS A CRIMINAL OFFENSE</p>
                    <p>System v2.0 | Connection Secure</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
