/**
 * app/auth.jsx — Real OTP + Google + Guest authentication
 * Google OAuth enabled with expo-auth-session
 */
import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

let GoogleSignin = null;
let statusCodes = null;
try {
    const GoogleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = GoogleModule.GoogleSignin;
    statusCodes = GoogleModule.statusCodes;
} catch (e) {
    console.log('GoogleSignin native module not found. Falling back to web flow.');
}
import { useColorScheme } from '../hooks/use-color-scheme';
import { useAuth } from '../context/AuthContext';
import { sendOTP, verifyOTP, loginWithGoogle, loginAsGuest } from '../services/authService';

// Required for Google Sign-In
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const WEB_CLIENT_ID = '821266969114-kihsrvi0uehnfv265ij0c02av1bl4b5l.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com'; // Create in Google Cloud Console
const IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'; // Create in Google Cloud Console

export default function AuthScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [mode, setMode] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('user');
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const bgCard = isDark ? '#111827' : '#FFFFFF';
    const bgCardBorder = isDark ? '#1F2937' : '#E5E7EB';

    // Configure native Google Signin once if available
    useEffect(() => {
        if (Platform.OS === 'android' && GoogleSignin) {
            GoogleSignin.configure({
                webClientId: WEB_CLIENT_ID,
                offlineAccess: false,
            });
        }
    }, []);

    // Google OAuth hook for Web/Fallback
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: WEB_CLIENT_ID,
        webClientId: WEB_CLIENT_ID,
        androidClientId: WEB_CLIENT_ID,
        iosClientId: WEB_CLIENT_ID,
        redirectUri: Platform.OS === 'web'
            ? 'http://localhost:8081'
            : undefined,
    });

    // Handle Google OAuth response
    useEffect(() => {
        if (response?.type === 'success') {
            console.log('Google OAuth Response:', JSON.stringify(response, null, 2));
            const { authentication, params } = response;

            // For web, the structure might be different
            // Try to get idToken from different possible locations
            let idToken = null;

            if (authentication?.idToken) {
                idToken = authentication.idToken;
                console.log('Found idToken in authentication.idToken');
            } else if (params?.id_token) {
                idToken = params.id_token;
                console.log('Found idToken in params.id_token');
            } else if (authentication?.accessToken) {
                // For web OAuth, we might only get an access token
                // We can use it to fetch user info and create a simple token
                console.log('Only access token available, using alternative auth method');
                handleGoogleAccessToken(authentication.accessToken);
                return;
            }

            if (idToken) {
                console.log('ID Token found, length:', idToken.length);
                handleGoogleSuccess(idToken);
            } else {
                console.error('No idToken or accessToken in response:', response);
                Alert.alert('Authentication Error', 'Could not get authentication token from Google. Please try again.');
            }
        } else if (response?.type === 'error') {
            console.error('Google OAuth Error:', response.error);
            Alert.alert('Sign-In Error', response.error?.message || 'Failed to sign in with Google');
        }
    }, [response]);

    // Alternative: Use access token to get user info then authenticate
    const handleGoogleAccessToken = async (accessToken) => {
        setLoading(true);
        try {
            console.log('Fetching Google user info with access token...');
            // Get user info from Google
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userInfo = await userInfoResponse.json();
            console.log('Google user info:', userInfo);

            // Create a simple token payload (backend will accept this in dev mode)
            const simpleToken = btoa(JSON.stringify({
                sub: userInfo.sub,
                name: userInfo.name,
                picture: userInfo.picture,
                email: userInfo.email,
            }));

            await handleGoogleSuccess(simpleToken);
        } catch (err) {
            console.error('Error fetching Google user info:', err);
            Alert.alert('Authentication Error', 'Failed to get user information from Google');
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (idToken) => {
        setLoading(true);
        try {
            console.log('Sending idToken to backend...');
            const data = await loginWithGoogle(idToken, selectedRole);
            console.log('Backend response:', data);
            login(data.user);
            router.replace('/(tabs)/home');
        } catch (err) {
            console.error('Google sign-in error:', err);
            Alert.alert('Google Sign-In Failed', err.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async () => {
        if (phone.length < 10) return; // Basic guard, backend handles strict validation
        setLoading(true);
        try {
            const response = await sendOTP(phone, selectedRole);
            // In development, the backend returns the OTP for testing (only show if not sent via SMS)
            if (response && response.otp && response.mockMode) {
                Alert.alert(
                    'Mock Mode: OTP Received',
                    `For testing, use code: ${response.otp}\n(SMS not sent via Twilio)`,
                    [{ text: 'OK' }]
                );
            }
            setMode('otp');
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) return;
        setLoading(true);
        try {
            const data = await verifyOTP(phone, code, selectedRole);
            login(data.user);
            router.replace('/(tabs)/home');
        } catch (err) {
            Alert.alert('Invalid OTP', err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In handler
    const handleGoogleSignIn = async () => {
        if (Platform.OS === 'android' && GoogleSignin) {
            try {
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                
                const idToken = userInfo.idToken || userInfo?.data?.idToken;
                if (idToken) {
                    await handleGoogleSuccess(idToken);
                } else {
                    Alert.alert('Error', 'No ID token received securely from Play Services.');
                }
            } catch (error) {
                if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
                    console.log('Google Native Sign-In cancelled');
                } else if (error.code === statusCodes?.IN_PROGRESS) {
                    console.log('Google Native in progress');
                } else if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
                    await promptAsync(); // Web fallback
                } else {
                    Alert.alert('Sign-In Error', error.message || 'Failed natively.');
                }
            }
        } else {
            // Web / Expo Go Fallback flow
            try {
                await promptAsync();
            } catch (err) {
                Alert.alert('Error', 'Failed to open Google Sign-In context');
            }
        }
    };

    const handleGuest = async () => {
        setLoading(true);
        try {
            const data = await loginAsGuest(selectedRole);
            login(data.user);
            router.replace('/(tabs)/home');
        } catch (err) {
            // Show error — don't silently navigate; user won't have a valid session
            Alert.alert(
                'Cannot Connect',
                'Unable to reach the server. Please check your internet connection and try again.\n\n' +
                (err.message || 'Network request failed'),
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-main">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View className="flex-1 px-6 pt-12 pb-8">
                        {/* Header */}
                        <View className="items-center mb-12">
                            <View
                                className="w-16 h-16 rounded-2xl bg-[#00D4AA] items-center justify-center mb-6"
                                style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 }}
                            >
                                <Ionicons name="location" size={28} color="#000" />
                            </View>
                            <Text className="text-txt text-2xl font-bold mb-2">
                                {mode === 'phone' ? 'Welcome to DishaSetu' : 'Verify Your Number'}
                            </Text>
                            <Text className="text-txtMuted text-sm text-center leading-5">
                                {mode === 'phone'
                                    ? 'Sign in to track civic projects near you'
                                    : `We sent a 6-digit OTP to +91 ${phone}`}
                            </Text>
                        </View>

                        {mode === 'phone' ? (
                            <>
                                {/* Role Selector */}
                                <View className="mb-6">
                                    <Text className="text-txtMuted text-sm font-medium mb-2 ml-1">Login As</Text>
                                    <TouchableOpacity
                                        className="flex-row items-center justify-between bg-card rounded-2xl border border-cardBorder px-4 py-4"
                                        onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                                        activeOpacity={0.7}
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <Ionicons
                                                name={selectedRole === 'admin' ? 'shield-checkmark' : 'person'}
                                                size={20}
                                                color={selectedRole === 'admin' ? '#00D4AA' : iconDim}
                                            />
                                            <Text className="text-txt font-semibold text-base">
                                                {selectedRole === 'admin' ? 'Admin' : 'User'}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-down" size={20} color={iconDim} />
                                    </TouchableOpacity>

                                    {/* Dropdown */}
                                    {showRoleDropdown && (
                                        <View className="mt-2 bg-card rounded-2xl border border-cardBorder overflow-hidden">
                                            <TouchableOpacity
                                                className="flex-row items-center px-4 py-3 gap-3"
                                                style={{ backgroundColor: selectedRole === 'user' ? (isDark ? '#1F2937' : '#F3F4F6') : 'transparent' }}
                                                onPress={() => {
                                                    setSelectedRole('user');
                                                    setShowRoleDropdown(false);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="person" size={20} color={iconDim} />
                                                <Text className="text-txt font-medium">User</Text>
                                                {selectedRole === 'user' && <Ionicons name="checkmark" size={20} color="#00D4AA" style={{ marginLeft: 'auto' }} />}
                                            </TouchableOpacity>
                                            <View className="h-px bg-cardBorder" />
                                            <TouchableOpacity
                                                className="flex-row items-center px-4 py-3 gap-3"
                                                style={{ backgroundColor: selectedRole === 'admin' ? (isDark ? '#1F2937' : '#F3F4F6') : 'transparent' }}
                                                onPress={() => {
                                                    setSelectedRole('admin');
                                                    setShowRoleDropdown(false);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="shield-checkmark" size={20} color="#00D4AA" />
                                                <Text className="text-txt font-medium">Admin</Text>
                                                {selectedRole === 'admin' && <Ionicons name="checkmark" size={20} color="#00D4AA" style={{ marginLeft: 'auto' }} />}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Phone input */}
                                <View className="mb-6">
                                    <Text className="text-txtMuted text-sm font-medium mb-2 ml-1">Mobile Number</Text>
                                    <View className="flex-row items-center bg-card rounded-2xl border border-cardBorder overflow-hidden">
                                        <View className="px-4 py-4 border-r border-cardBorder flex-row items-center gap-2">
                                            <Ionicons name="call-outline" size={20} color={iconDim} />
                                        </View>
                                        <TextInput
                                            className="flex-1 text-txt text-base px-4 py-4"
                                            placeholder="e.g. +1 812 516 5247"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={setPhone}
                                        />
                                        {phone.length >= 10 && (
                                            <View className="px-4">
                                                <Ionicons name="checkmark-circle" size={20} color="#00D4AA" />
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className="w-full rounded-2xl py-4 items-center mb-4"
                                    style={{
                                        backgroundColor: phone.length >= 10 ? '#00D4AA' : bgCardBorder,
                                        shadowColor: phone.length >= 10 ? '#00D4AA' : 'transparent',
                                        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
                                        elevation: phone.length >= 10 ? 8 : 0,
                                    }}
                                    onPress={handleSendOTP}
                                    disabled={phone.length < 10 || loading}
                                    activeOpacity={0.85}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#000" />
                                        : <Text className={`font-bold text-lg ${phone.length === 10 ? 'text-white' : 'text-txtMutedAlt'}`}>Send OTP</Text>
                                    }
                                </TouchableOpacity>

                                <View className="flex-row items-center mb-4">
                                    <View className="flex-1 h-px bg-cardBorder" />
                                    <Text className="text-txtMuted mx-4 text-sm">or</Text>
                                    <View className="flex-1 h-px bg-cardBorder" />
                                </View>

                                {/* Google button */}
                                <TouchableOpacity
                                    className="w-full flex-row items-center justify-center bg-card rounded-2xl py-4 mb-6 border border-cardBorder gap-3"
                                    onPress={handleGoogleSignIn}
                                    activeOpacity={0.85}
                                >
                                    <View className="w-5 h-5 rounded-full bg-[#EA4335] items-center justify-center">
                                        <Text className="text-white font-bold text-xs">G</Text>
                                    </View>
                                    <Text className="text-txt font-semibold text-base">Continue with Google</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleGuest} activeOpacity={0.7} className="items-center" disabled={loading}>
                                    <Text className="text-txtMutedAlt text-sm">
                                        Continue as <Text className="text-[#00D4AA] font-semibold">Guest</Text>
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* OTP boxes */}
                                <View className="flex-row justify-between mb-8">
                                    {otp.map((digit, i) => (
                                        <View key={i} className="w-12 h-14 rounded-xl bg-card border items-center justify-center"
                                            style={{ borderColor: digit ? '#00D4AA' : bgCardBorder }}>
                                            <Text className="text-txt text-2xl font-bold">{digit || '–'}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Keypad */}
                                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['back', '0', 'verify']].map((row, ri) => (
                                    <View key={ri} className="flex-row justify-between mb-3">
                                        {row.map((key) => (
                                            <TouchableOpacity
                                                key={key}
                                                className="flex-1 mx-1 h-14 rounded-2xl items-center justify-center"
                                                style={{ backgroundColor: key === 'verify' ? '#00D4AA' : bgCard }}
                                                activeOpacity={0.7}
                                                disabled={loading}
                                                onPress={() => {
                                                    const newOtp = [...otp];
                                                    if (key === 'back') {
                                                        const lastFilled = newOtp.map((d, i) => d ? i : -1).filter(i => i >= 0).pop();
                                                        if (lastFilled !== undefined) { newOtp[lastFilled] = ''; setOtp(newOtp); }
                                                    } else if (key === 'verify') {
                                                        if (otp.every(d => d)) handleVerify();
                                                    } else {
                                                        const firstEmpty = newOtp.findIndex(d => !d);
                                                        if (firstEmpty !== -1) { newOtp[firstEmpty] = key; setOtp(newOtp); }
                                                    }
                                                }}
                                            >
                                                {loading && key === 'verify'
                                                    ? <ActivityIndicator color="#000" />
                                                    : key === 'back'
                                                        ? <Ionicons name="backspace-outline" size={22} color={iconDim} />
                                                        : key === 'verify'
                                                            ? <Ionicons name="checkmark" size={24} color="#000" />
                                                            : <Text className="text-xl font-bold text-txt">{key}</Text>
                                                }
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ))}

                                <TouchableOpacity className="items-center mt-4 flex-row justify-center gap-1" onPress={() => setMode('phone')} activeOpacity={0.7}>
                                    <Ionicons name="arrow-back" size={14} color={iconDim} />
                                    <Text className="text-txtMutedAlt text-sm">Change number</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
