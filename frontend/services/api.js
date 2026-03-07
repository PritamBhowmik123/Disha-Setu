/**
 * services/api.js
 * Base HTTP client — all API calls go through here
 * Expo Go compatible with error handling
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Platform-aware API URL
// For Android/iOS: Use your computer's local IP (same network)
// For Web: Use localhost
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:3000/api';
    }
    // For mobile (Android/iOS) - use your computer's IP
    // Find your IP by running: ipconfig (Windows) or ifconfig (Mac/Linux)
    return 'http://192.168.31.95:3000/api';
};

export const BASE_URL = getBaseUrl();

/**
 * Authenticated fetch wrapper.
 * Automatically attaches Bearer token if stored.
 */
export const apiFetch = async (path, options = {}) => {
    try {
        const token = await AsyncStorage.getItem('auth_token').catch(() => null);

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Request failed: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`[API] ${path} error:`, error.message);
        throw error;
    }
};

/**
 * Multipart form upload (for feedback photos)
 */
export const apiUpload = async (path, formData) => {
    try {
        const token = await AsyncStorage.getItem('auth_token').catch(() => null);

        const response = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Upload failed: ${response.status}`);
        return data;
    } catch (error) {
        console.error(`[API Upload] ${path} error:`, error.message);
        throw error;
    }
};
