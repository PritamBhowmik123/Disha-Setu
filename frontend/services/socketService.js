/**
 * services/socketService.js
 * Socket.io client for DishaSetu real-time events
 * Uses socket.io-client with Expo Go compatibility
 */
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Platform-aware Socket URL
const getSocketUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:3000';
    }
    // For mobile - use your computer's IP address
    return 'http://192.168.31.95:3000';
};

const SOCKET_URL = getSocketUrl();

let socket = null;
let isInitialized = false;

export const connectSocket = async () => {
    if (socket?.connected) return socket;

    try {
        // Wait for AsyncStorage to be ready (Expo Go compatibility)
        const token = await AsyncStorage.getItem('auth_token').catch(() => null);

        socket = io(SOCKET_URL, {
            auth: token ? { token } : {},
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            // Increase timeout for Expo Go
            timeout: Platform.OS === 'web' ? 10000 : 20000,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
            isInitialized = true;
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
            // Don't throw error on mobile to prevent app crash
            if (Platform.OS === 'web') {
                // Web can handle this better
            }
        });

        return socket;
    } catch (error) {
        console.warn('[Socket] Initialization error:', error.message);
        // Return null on error instead of crashing
        return null;
    }
};

export const getSocket = () => socket;

export const isSocketReady = () => socket?.connected || false;

export const disconnectSocket = () => {
    try {
        if (socket) {
            socket.disconnect();
            socket = null;
            isInitialized = false;
        }
    } catch (error) {
        console.warn('[Socket] Disconnect error:', error.message);
    }
};

export const subscribeToProject = (projectId) => {
    try {
        if (socket?.connected) {
            socket.emit('subscribe_project', projectId);
        }
    } catch (error) {
        console.warn('[Socket] Subscribe error:', error.message);
    }
};

export const unsubscribeFromProject = (projectId) => {
    try {
        if (socket?.connected) {
            socket.emit('unsubscribe_project', projectId);
        }
    } catch (error) {
        console.warn('[Socket] Unsubscribe error:', error.message);
    }
};

export const emitLocation = (lat, lng) => {
    try {
        if (socket?.connected) {
            socket.emit('update_location', { lat, lng });
        }
    } catch (error) {
        console.warn('[Socket] Emit location error:', error.message);
    }
};

export const onProjectUpdate = (callback) => {
    try {
        socket?.on('project_update', callback);
        return () => socket?.off('project_update', callback);
    } catch (error) {
        console.warn('[Socket] Project update listener error:', error.message);
        return () => {}; // Return empty cleanup function
    }
};

export const onNewNotification = (callback) => {
    try {
        socket?.on('new_notification', callback);
        return () => socket?.off('new_notification', callback);
    } catch (error) {
        console.warn('[Socket] Notification listener error:', error.message);
        return () => {};
    }
};

export const onGeoAlert = (callback) => {
    try {
        socket?.on('geo_alert', callback);
        return () => socket?.off('geo_alert', callback);
    } catch (error) {
        console.warn('[Socket] Geo alert listener error:', error.message);
        return () => {};
    }
};
