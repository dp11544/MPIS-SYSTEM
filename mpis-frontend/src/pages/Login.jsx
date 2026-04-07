import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Activity, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../features/login.css';

const Login = () => {

    // 🔥 FIX: use batchId (correct naming)
    const [batchId, setBatchId] = useState('admin');
    const [password, setPassword] = useState('admin');

    // OTP stage
    const [step, setStep] = useState('CREDENTIALS');
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

    // UI
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, verifyOtp } = useAuth();
    const navigate = useNavigate();

    // 🔥 Auto redirect if already logged in
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard');
        }
    }, []);

    // 🔥 OTP Timer
    useEffect(() => {
        let timer;

        if (step === 'OTP' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }

        if (timeLeft === 0 && step === 'OTP') {
            setError('OTP expired. Please login again.');
            setStep('CREDENTIALS');
            setOtp('');
        }

        return () => clearInterval(timer);
    }, [step, timeLeft]);

    // 🔥 LOGIN STEP
    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await login(batchId, password);

            if (result.requiresOtp) {
                setStep('OTP');
                setTimeLeft(120);

                // 🔥 Reset OTP cleanly
                setOtp(result.demoOtp || '');

                // Optional debug
                console.log("OTP sent to:", result.maskedMobile);
            }

        } catch (err) {
            setError(err.message || 'Invalid ID or Password');
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 OTP VERIFY STEP
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await verifyOtp(batchId, otp);

            // 🔥 SUCCESS → redirect
            navigate('/dashboard');

        } catch (err) {
            if (err.status === 'OTP_EXPIRED') {
                setError('Session expired. Please login again.');
                setStep('CREDENTIALS');
                setOtp('');
            } else {
                setError(err.message || 'Invalid OTP');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 Time format
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
                        <Shield className="logo-icon" size={44} color="var(--brand-cyan)" style={{ zIndex: 2, filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.3))' }} />
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
                                    value={batchId}
                                    onChange={(e) => setBatchId(e.target.value)}
                                    placeholder="Enter Badge Number"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
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

                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <Lock size={40} color="var(--brand-cyan)" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.4))', marginBottom: '10px' }} />
                            <p style={{ color: "var(--text-primary)", letterSpacing: "1px" }}><strong>Two-Factor Authentication</strong></p>

                            <div style={{
                                marginTop: '10px',
                                fontSize: '1.2rem',
                                fontWeight: 'bold'
                            }}>
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
                                    required
                                    style={{
                                        letterSpacing: '4px',
                                        textAlign: 'center',
                                        fontSize: '1.1rem'
                                    }}
                                />
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={isLoading || !/^\d{6}$/.test(otp)}
                        >
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
                            className="cancel-btn"
                            onClick={() => {
                                setStep('CREDENTIALS');
                                setOtp('');
                            }}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>

                    </form>
                )}

                <div className="login-footer">
                    <p>UNAUTHORIZED ACCESS IS A CRIMINAL OFFENSE</p>
                    <p>System v2.0 | Secure</p>
                </div>

            </div>
        </div>
    );
};

export default Login;