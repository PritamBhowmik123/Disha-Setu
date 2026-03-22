import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { logout as authLogout, fetchMe } from '../../services/authService';
import { disconnectSocket } from '../../services/socketService';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

function SectionHeader({ title }) {
    return <Text className="text-txt text-sm font-semibold mb-2 mt-1">{title}</Text>;
}

function SettingRow({ icon, title, subtitle, value, type = 'nav', danger, onPress, action, isHighlighted }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const highlightAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isHighlighted) {
            Animated.sequence([
                Animated.timing(highlightAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.delay(1400),
                Animated.timing(highlightAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: false,
                })
            ]).start();
        }
    }, [isHighlighted, highlightAnim]);

    const backgroundColor = highlightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(0, 212, 170, 0)', 'rgba(0, 212, 170, 0.2)']
    });

    return (
        <Animated.View style={{ backgroundColor, borderRadius: 8, marginHorizontal: -12, paddingHorizontal: 12 }}>
            <TouchableOpacity
                className={`flex-row items-center py-3.5 border-b border-cardBorder last:border-0`}
                onPress={onPress}
                disabled={type === 'switch'}
                activeOpacity={0.7}
            >
                <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${danger ? 'bg-[#EF4444]/10' : 'bg-surface'}`}>
                    <Ionicons name={icon} size={17} color={danger ? '#EF4444' : iconDim} />
                </View>
                <View className="flex-1 justify-center">
                    <Text className={`text-sm font-medium ${danger ? 'text-[#EF4444]' : 'text-txt'}`}>{title}</Text>
                    {subtitle && <Text className="text-txtMuted text-xs mt-0.5">{subtitle}</Text>}
                </View>
                {type === 'nav' && (
                    <View className="flex-row items-center gap-1">
                        {value && <Text className="text-txtMuted text-sm">{value}</Text>}
                        <Ionicons name="chevron-forward" size={16} color={iconDim} />
                    </View>
                )}
                {type === 'switch' && action}
                {type === 'link' && <Ionicons name="open-outline" size={16} color={iconDim} />}
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const { highlight } = useLocalSearchParams();
    const { isDark, toggleColorScheme } = useColorScheme();
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState(true);
    const [highlightLocation, setHighlightLocation] = useState(false);
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi (हिन्दी)' },
        { code: 'bn', name: 'Bengali (বাংলা)' },
        { code: 'ta', name: 'Tamil (தமிழ்)' },
        { code: 'te', name: 'Telugu (తెలుగు)' },
        { code: 'mr', name: 'Marathi (मराठी)' },
        { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
        { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
        { code: 'ml', name: 'Malayalam (മലയാളം)' },
    ];

    const currentLanguageName = languages.find(l => l.code === i18n.language)?.name || 'English';

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        setShowLangPicker(false);
    };

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        fetchMe()
            .then(data => { setProfileData(data); setLoading(false); })
            .catch(() => { setProfileData(user); setLoading(false); });

        AsyncStorage.getItem('location_permission_enabled').then(val => {
            if (val !== null) setLocationEnabled(val === 'true');
        });
    }, [user]);

    useEffect(() => {
        if (highlight === 'location') {
            setHighlightLocation(true);
            const timer = setTimeout(() => setHighlightLocation(false), 2500);
            return () => clearTimeout(timer);
        }
    }, [highlight]);

    const toggleLocation = async (value) => {
        setLocationEnabled(value);
        try {
            await AsyncStorage.setItem('location_permission_enabled', value.toString());
        } catch (e) {
            console.error('Failed to save location preference', e);
        }
    };

    const handleLogout = async () => {
        disconnectSocket();
        await authLogout();
        logout();
        router.replace('/auth');
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">{t('common.loading')}</Text>
            </SafeAreaView>
        );
    }

    const displayName = profileData?.name || (profileData?.is_guest ? t('settings.guest_user') : t('settings.default_user'));
    const displaySub = profileData?.phone ? `+91 ${profileData.phone}` : (profileData?.is_guest ? t('settings.guest_session') : t('settings.logged_in'));
    const avatarUrl = profileData?.avatar_url;

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header with profile inline */}
            <View className="px-5 pt-5 pb-4 border-b border-cardBorder">
                <Text className="text-txt text-2xl font-bold mb-4">{t('settings.title')}</Text>
                <View className="flex-row items-center gap-3">
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} className="w-12 h-12 rounded-full" />
                    ) : (
                        <View className="w-12 h-12 rounded-full bg-surface border border-cardBorder items-center justify-center">
                            <Ionicons name="person-outline" size={22} color="#00D4AA" />
                        </View>
                    )}
                    <View className="flex-1">
                        <Text className="text-txt text-base font-semibold">{displayName}</Text>
                        <Text className="text-txtMuted text-xs mt-0.5">{displaySub}</Text>
                    </View>
                    <TouchableOpacity
                        className="px-3 py-1.5 rounded-lg border border-cardBorder bg-surface"
                        onPress={() => router.push('/profile')}
                    >
                        <Text className="text-[#00D4AA] text-xs font-medium">Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-5 pt-5 pb-2">
                    {/* Preferences */}
                    <SectionHeader title={t('settings.preferences')} />
                    <View className="bg-card rounded-xl px-4 border border-cardBorder mb-5">
                        <SettingRow
                            icon="notifications-outline"
                            title={t('settings.notifications')}
                            type="switch"
                            action={
                                <Switch
                                    value={true}
                                    onValueChange={() => { }}
                                    trackColor={{ false: '#374151', true: '#00D4AA' }}
                                    thumbColor="#fff"
                                />
                            }
                        />
                        <SettingRow
                            icon="location-outline"
                            title={t('settings.location')}
                            subtitle="Required for geo-fencing and maps"
                            type="switch"
                            isHighlighted={highlightLocation}
                            action={
                                <Switch
                                    value={locationEnabled}
                                    onValueChange={toggleLocation}
                                    trackColor={{ false: '#374151', true: '#00D4AA' }}
                                    thumbColor="#fff"
                                />
                            }
                        />
                        <SettingRow
                            icon={isDark ? 'moon-outline' : 'sunny-outline'}
                            title={t('settings.dark_mode')}
                            type="switch"
                            action={
                                <Switch
                                    value={isDark}
                                    onValueChange={toggleColorScheme}
                                    trackColor={{ false: '#374151', true: '#00D4AA' }}
                                    thumbColor="#fff"
                                />
                            }
                        />
                        <SettingRow
                            icon="language-outline"
                            title={t('settings.language')}
                            value={currentLanguageName}
                            onPress={() => setShowLangPicker(!showLangPicker)}
                        />
                        {showLangPicker && (
                            <View className="pb-3 pt-1 border-t border-cardBorder">
                                <View className="flex-row flex-wrap gap-2 pt-2">
                                    {languages.map((lang) => (
                                        <TouchableOpacity
                                            key={lang.code}
                                            className={`px-3 py-1.5 rounded-lg border ${i18n.language === lang.code ? 'border-[#00D4AA] bg-[#00D4AA]/10' : 'border-cardBorder bg-surface'}`}
                                            onPress={() => changeLanguage(lang.code)}
                                        >
                                            <Text className={`text-xs font-medium ${i18n.language === lang.code ? 'text-[#00D4AA]' : 'text-txt'}`}>
                                                {lang.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Admin */}
                    {profileData?.role === 'admin' && (
                        <>
                            <SectionHeader title="Administration" />
                            <View className="bg-card rounded-xl px-4 border border-cardBorder mb-5">
                                <SettingRow
                                    icon="shield-checkmark-outline"
                                    title="Admin Dashboard"
                                    subtitle="Manage feedback, analytics, and navigation"
                                    onPress={() => router.push('/admin')}
                                />
                            </View>
                        </>
                    )}

                    {/* Support */}
                    <SectionHeader title={t('settings.support')} />
                    <View className="bg-card rounded-xl px-4 border border-cardBorder mb-5">
                        <SettingRow icon="help-circle-outline" title={t('settings.help')} onPress={() => router.push('/settings/help')} />
                        <SettingRow icon="shield-checkmark-outline" title={t('settings.privacy')} type="link" />
                        <SettingRow icon="document-text-outline" title={t('settings.terms')} type="link" />
                    </View>

                    {/* Account */}
                    <View className="bg-card rounded-xl px-4 border border-cardBorder mb-6">
                        <SettingRow icon="log-out-outline" title={t('settings.logout')} danger onPress={handleLogout} />
                    </View>

                    <Text className="text-txtMuted text-center text-xs mb-8">Disha-Setu v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
