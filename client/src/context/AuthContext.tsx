import React, { createContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User {
    id: string;
    username: string;
    balance: string;
    is_admin: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>; // Added alias
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            refreshProfile();
        }
    }, []);

    const refreshProfile = async () => {
        try {
            const res = await api.get('/users/profile');
            console.log("Profile refreshed:", res.data);
            setUser(res.data);
            setIsAuthenticated(true);
        } catch (err) {
            console.error("Error refreshing profile", err);
            // logout(); // Only if token expired
            logout();
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
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            refreshProfile, 
            isAuthenticated,
            refreshUser: refreshProfile 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
