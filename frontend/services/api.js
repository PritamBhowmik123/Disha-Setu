/**
 * services/api.js
 * Base HTTP client — all API calls go through here
 * Expo Go compatible with automatic host detection
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BACKEND_PORT = parseInt(process.env.EXPO_PUBLIC_BACKEND_PORT) || 3000;

/**
 * Automatically resolve the backend URL:
 * 1. If EXPO_PUBLIC_API_URL is set (e.g. in .env for production), use it.
 * 2. On web: use localhost.
 * 3. On Android/iOS in Expo Go: extract the host IP from Expo's debugger host
 *    (e.g. "192.168.31.95:8081" → "http://192.168.31.95:3000/api").
 *    This works automatically for every developer on any Wi-Fi network.
 */
const getBaseUrl = () => {
    // 1. Hard override via env (for staged/prod deployments)
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }


    // 2. Web always uses localhost
    if (Platform.OS === 'web') {
        return `http://localhost:${BACKEND_PORT}/api`;
    }

    // 3. Auto-detect from Expo's Metro host (works in Expo Go on any network)
    //    Constants.expoConfig.hostUri looks like "192.168.x.x:8081"
    const expoHost =
        Constants.expoConfig?.hostUri ||       // SDK 46+
        Constants.manifest2?.extra?.expoClient?.hostUri || // older builds
        Constants.manifest?.debuggerHost;      // legacy SDK

    if (expoHost) {
        const ip = expoHost.split(':')[0]; // strip the Metro port
        return `http://${ip}:${BACKEND_PORT}/api`;
    }

    // 4. Last resort fallback (should rarely reach here)
    return `http://localhost:${BACKEND_PORT}/api`;

    // For mobile (Android/iOS) - use your computer's IP
    // Find your IP by running: ipconfig (Windows) or ifconfig (Mac/Linux)
    return 'http://10.198.122.140:3000/api';

};

export const BASE_URL = getBaseUrl();
console.log(`[API] Base URL initialized as: ${BASE_URL}`);

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

        const textResponse = await response.text();
        let data;
        try {
            data = textResponse ? JSON.parse(textResponse) : {};
        } catch (e) {
            data = { error: textResponse || `Request failed: ${response.status}` };
        }

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

        const textResponse = await response.text();
        let data;
        try {
            data = textResponse ? JSON.parse(textResponse) : {};
        } catch (e) {
            data = { error: textResponse || `Upload failed: ${response.status}` };
        }

        if (!response.ok) throw new Error(data.error || `Upload failed: ${response.status}`);
        return data;
    } catch (error) {
        console.error(`[API Upload] ${path} error:`, error.message);
        throw error;
    }
};
