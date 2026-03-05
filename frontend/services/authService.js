/**
 * services/authService.js
 * Authentication API - OTP, Google, Guest, token management
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ── Token helpers ──────────────────────────────────────────────
export const saveToken = async (token) => AsyncStorage.setItem(TOKEN_KEY, token);
export const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);
export const saveUser = async (user) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
export const getUser = async () => {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
};
export const clearAuth = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
};

// ── Auth API calls ─────────────────────────────────────────────
export const sendOTP = async (phone) => {
    return apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
    });
};

export const verifyOTP = async (phone, otp) => {
    const data = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
    });
    if (data.token) {
        await saveToken(data.token);
        await saveUser(data.user);
    }
    return data;
};

export const loginWithGoogle = async (idToken) => {
    console.log('[Auth] loginWithGoogle called with idToken:', idToken ? 'present' : 'MISSING');
    if (!idToken) {
        throw new Error('idToken is required for Google authentication');
    }
    const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
    });
    console.log('[AuthService] Google login response:', JSON.stringify(data, null, 2));
    console.log('[AuthService] User avatar_url from backend:', data.user?.avatar_url);
    if (data.token) {
        await saveToken(data.token);
        await saveUser(data.user);
        console.log('[AuthService] Saved user to storage, avatar_url:', data.user?.avatar_url);
    }
    return data;
};

export const loginAsGuest = async () => {
    const data = await apiFetch('/auth/guest', { method: 'POST' });
    if (data.token) {
        await saveToken(data.token);
        await saveUser(data.user);
    }
    return data;
};

export const fetchMe = async () => apiFetch('/auth/me');

export const registerPushToken = async (token, platform) => {
    return apiFetch('/auth/push-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
    });
};

export const logout = async () => {
    await clearAuth();
};
