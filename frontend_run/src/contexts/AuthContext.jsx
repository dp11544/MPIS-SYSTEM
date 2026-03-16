import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Step 1: Validate Officer ID & Password
    const login = async (batchId, password) => {
        try {
            const formData = new URLSearchParams();
            formData.append('batchId', batchId);
            formData.append('password', password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.data.status === 'OTP_REQUIRED') {
                return {
                    success: true,
                    requiresOtp: true,
                    message: response.data.message,
                    demoOtp: response.data.data?.demoOtp
                };
            }
            throw new Error(response.data.message || 'Unexpected authentication response');
        } catch (error) {
            console.error('Login error:', error);
            const status = error.response?.data?.status;
            const msg = error.response?.data?.message || 'Invalid ID or Password. Access Denied.';
            throw { status: status || 'ERROR', message: msg };
        }
    };

    // Step 2: Validate OTP
    const verifyOtp = async (batchId, otp) => {
        try {
            const formData = new URLSearchParams();
            formData.append('batchId', batchId);
            formData.append('otp', otp);

            const response = await api.post('/auth/otp/verify', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.data.status === 'SUCCESS' && response.data.data?.token) {
                const userData = { batchId, role: 'OFFICER' };
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('token', response.data.data.token);
                setUser(userData);
                return { success: true };
            }
            throw new Error(response.data.message || 'Invalid OTP');
        } catch (error) {
            console.error('OTP Verification error:', error);
            const status = error.response?.data?.status;
            const msg = error.response?.data?.message || 'Invalid or Expired OTP.';
            throw { status: status || 'ERROR', message: msg };
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, verifyOtp, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
