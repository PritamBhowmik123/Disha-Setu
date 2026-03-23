/**
 * services/notificationService.js
 * Notification API calls
 */
import { apiFetch } from './api';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Behavior when received while app is foregrounded
if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
    try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    } catch (e) {
        console.log('[Push] Running in Expo Go, notifications disabled.');
    }
}
export const fetchNotifications = async (limit = 30) => {
    const data = await apiFetch(`/notifications?limit=${limit}`);
    return {
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
    };
};

export const markNotificationsRead = async (ids = []) => {
    return apiFetch('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
};

export async function registerForPushNotificationsAsync() {
    let token;
    const Device = require('expo-device');

    if (Device.isDevice && Constants.appOwnership !== 'expo') {
        const Notifications = require('expo-notifications');
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#00D4AA',
            });
        }
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return null; // Failed to get push token
        }
        
        try {
            const projectId = (await import('expo-constants')).default.expoConfig?.extra?.eas?.projectId 
                ?? (await import('expo-constants')).default.easConfig?.projectId;
            
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e) {
            console.warn('[Push] Error getting expo push token:', e);
            token = (await Notifications.getExpoPushTokenAsync()).data;
        }

        if (token) {
            // Send token to backend
            try {
                await apiFetch('/auth/push-token', {
                    method: 'POST',
                    body: JSON.stringify({ token, platform: Platform.OS }),
                });
                console.log('[Push] Token registered with backend');
            } catch (err) {
                console.error('[Push] Backend token registration failed:', err);
            }
        }
    } else {
        console.log('[Push] Must use physical device for Push Notifications');
    }

    return token;
};
