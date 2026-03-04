import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import '../global.css';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const { isDark } = useColorScheme();

  return (
    <View style={{ flex: 1 }} className={isDark ? 'dark' : ''}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#0A0E1A' : '#FAFAFA'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="feedback" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="updates" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="analytics" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}
