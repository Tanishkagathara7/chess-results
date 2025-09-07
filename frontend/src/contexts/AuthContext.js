import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('chess_admin_token'));

    // Configure axios interceptor to add token to requests
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Check if user is authenticated on app load
    useEffect(() => {
        const checkAuth = async () => {
            console.log('🔍 Checking authentication:', { token: token ? 'exists' : 'none', backendUrl: API });
            if (token) {
                try {
                    const response = await axios.get(`${API}/auth/verify`);
                    console.log('✅ Auth verification successful:', response.data);
                    setUser(response.data.user);
                } catch (error) {
                    console.error('❌ Auth verification failed:', {
                        status: error.response?.status,
                        data: error.response?.data,
                        message: error.message
                    });
                    // Token is invalid, clear it
                    localStorage.removeItem('chess_admin_token');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, [token]);

    const login = async (email, password) => {
        console.log('🔐 Login attempt:', { email, backendUrl: API });
        try {
            const response = await axios.post(`${API}/auth/login`, {
                email,
                password
            });
            
            console.log('✅ Login response:', response.data);
            const { token: newToken, user: userData } = response.data;
            
            // Store token
            localStorage.setItem('chess_admin_token', newToken);
            setToken(newToken);
            setUser(userData);
            
            console.log('✅ Login successful, user set:', userData);
            return { success: true };
        } catch (error) {
            console.error('❌ Login failed:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                url: `${API}/auth/login`
            });
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const logout = async () => {
        try {
            await axios.post(`${API}/auth/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage and state regardless of API response
            localStorage.removeItem('chess_admin_token');
            setToken(null);
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
