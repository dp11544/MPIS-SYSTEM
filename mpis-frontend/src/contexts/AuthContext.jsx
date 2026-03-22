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

    // 🔥 STEP 1: LOGIN (FIXED → JSON)
    const login = async (batchId, password) => {
        try {
            const response = await api.post('/auth/login', {
                batchId,
                password
            });

            const data = response.data;

            if (data.status === 'OTP_REQUIRED') {
                return {
                    success: true,
                    requiresOtp: true,
                    message: data.message,
                    demoOtp: data.data?.demoOtp,
                    maskedMobile: data.data?.maskedMobile
                };
            }

            throw new Error(data.message || 'Unexpected response');

        } catch (error) {
            console.error('Login error:', error);

            const status = error.response?.data?.status;
            const msg = error.response?.data?.message || 'Invalid ID or Password';

            throw { status: status || 'ERROR', message: msg };
        }
    };

    // 🔥 STEP 2: OTP VERIFY (FIXED → JSON)
    const verifyOtp = async (batchId, otp) => {
        try {
            const response = await api.post('/auth/otp/verify', {
                batchId,
                otp
            });

            const data = response.data;

            if (data.status === 'SUCCESS' && data.data?.token) {

                const token = data.data.token;

                // 🔥 Store token
                localStorage.setItem('token', token);

                // 🔥 Better user object
                const userData = {
                    batchId,
                    role: data.data?.role || 'OFFICER'
                };

                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);

                return { success: true };
            }

            throw new Error(data.message || 'Invalid OTP');

        } catch (error) {
            console.error('OTP error:', error);

            const status = error.response?.data?.status;
            const msg = error.response?.data?.message || 'Invalid or Expired OTP';

            throw { status: status || 'ERROR', message: msg };
        }
    };

    // 🔥 LOGOUT
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