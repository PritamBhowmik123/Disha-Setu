/**
 * app/_layout.jsx
 * Root layout — wraps app in AuthProvider, connects Socket.io
 * Expo Go compatible with delayed socket initialization
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { useEffect } from 'react';
import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../services/socketService';
import Constants from 'expo-constants';
import '../global.css';
import '../i18n';

export const unstable_settings = {
  initialRouteName: 'index',
};

function AppShell() {
  const { isDark } = useColorScheme();
  const { user } = useAuth();

  // Reconnect socket whenever auth state changes (login / logout / guest login)
  // This ensures the socket always carries the latest auth token
  useEffect(() => {
    const connectionDelay = Platform.OS === 'web' ? 0 : 500;

    // Disconnect any existing (unauthenticated) socket first
    disconnectSocket();

    const timer = setTimeout(() => {
      connectSocket()
        .then(() => {
          console.log('[Layout] Socket initialized successfully');
        })
        .catch(err => {
          console.warn('[Layout] Socket connect error:', err?.message || 'Unknown error');
        });
    }, connectionDelay);

    return () => clearTimeout(timer);
  }, [user]); // re-run when user logs in/out

  useEffect(() => {
    // Top-level listener to handle incoming notifications (skip in Expo Go)
    if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
        try {
            const Notifications = require('expo-notifications');
            const listener = Notifications.addNotificationReceivedListener(notification => {
                console.log('[Layout] Notification received in foreground:', notification);
            });
            return () => listener.remove();
        } catch (e) {}
    }
  }, []);

  return (
    <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0A0E1A' : '#FAFAFA'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/help" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/faq" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/contact" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/report" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="feedback" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="updates" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="analytics" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
