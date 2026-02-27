import React, { createContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User {
    id: string;
    username: string;
    balance: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
    refreshProfile: async () => {},
    isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            refreshProfile().catch(() => logout());
        }
    }, []);

    const refreshProfile = async () => {
        try {
            const res = await api.get('/users/profile');
            setUser(res.data);
            setIsAuthenticated(true);
        } catch (err) {
            console.error("Error refreshing profile", err);
            // logout(); // Only if token expired
        }
    };

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshProfile, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
