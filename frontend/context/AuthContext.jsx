/**
 * context/AuthContext.jsx
 * Global auth state — token, user, login/logout
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, clearAuth, saveUser } from '../services/authService';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore user from storage on app start
    useEffect(() => {
        getUser().then(u => {
            setUser(u);
            setLoading(false);
            if (u) {
                // Register for push if already logged in
                registerForPushNotificationsAsync().catch(console.error);
            }
        });
    }, []);

    const login = async (userData) => {
        setUser(userData);
        // Persist to AsyncStorage to ensure avatar and other data is saved
        await saveUser(userData);
        // Register token
        registerForPushNotificationsAsync().catch(console.error);
    };

    const logout = async () => {
        await clearAuth();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

