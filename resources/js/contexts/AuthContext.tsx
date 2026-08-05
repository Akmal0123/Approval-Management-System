import api from '@/lib/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth-token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            checkAuth();
        } else {
            setLoading(false);
        }
    }, [token]);

    const checkAuth = async () => {
        try {
            const response = await api.get('/user');
            setUser(response.data.user);
        } catch (error) {
            localStorage.removeItem('auth-token');
            setToken(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await api.post('/login', { email, password });
        const { user: userData, token: userToken } = response.data;

        localStorage.setItem('auth-token', userToken);
        setToken(userToken);
        setUser(userData);
    };

    const register = async (name: string, email: string, password: string, password_confirmation: string) => {
        const response = await api.post('/register', {
            name,
            email,
            password,
            password_confirmation,
        });
        const { user: userData, token: userToken } = response.data;

        localStorage.setItem('auth-token', userToken);
        setToken(userToken);
        setUser(userData);
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            // Even if logout fails on server, clear local state
        } finally {
            localStorage.removeItem('auth-token');
            setToken(null);
            setUser(null);
        }
    };

    const value = {
        user,
        token,
        login,
        logout,
        register,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
