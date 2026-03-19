import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { logout as authLogout, fetchMe } from '../../services/authService';
import { disconnectSocket } from '../../services/socketService';
import { useTranslation } from 'react-i18next';

function SettingRow({ icon, title, subtitle, value, type = 'nav', danger, onPress, action }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <TouchableOpacity
            className="flex-row items-center py-4 border-b border-cardBorder last:border-0"
            onPress={onPress}
            disabled={type === 'switch'}
            activeOpacity={0.7}
        >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${danger ? 'bg-[#EF444420]' : 'bg-surface'}`}>
                <Ionicons name={icon} size={20} color={danger ? '#EF4444' : iconDim} />
            </View>
            <View className="flex-1 justify-center">
                <Text className={`text-base font-medium mb-0.5 ${danger ? 'text-[#EF4444]' : 'text-txt'}`}>{title}</Text>
                {subtitle && <Text className="text-txtMuted text-xs">{subtitle}</Text>}
            </View>
            {type === 'nav' && (
                <View className="flex-row items-center">
                    {value && <Text className="text-txtMuted mr-2">{value}</Text>}
                    <Ionicons name="chevron-forward" size={20} color={iconDim} />
                </View>
            )}
            {type === 'switch' && action}
            {type === 'link' && <Ionicons name="open-outline" size={20} color={iconDim} />}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const { isDark, toggleColorScheme } = useColorScheme();
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLangPicker, setShowLangPicker] = useState(false);

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
        // Fetch full user profile from backend
        fetchMe()
            .then(data => {
                console.log('[Settings] Profile data received:', JSON.stringify(data, null, 2));
                console.log('[Settings] Avatar URL:', data?.avatar_url);
                setProfileData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('[Settings] Failed to fetch profile:', err.message);
                // Use fallback data from context if API fails
                console.log('[Settings] Using fallback user data:', user);
                setProfileData(user);
                setLoading(false);
            });
    }, [user]);

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
    const civicLevel = profileData?.civic_level === 'Civic Guardian' ? t('activity.level_guardian') : t('settings.level_newcomer');
    const avatarUrl = profileData?.avatar_url;

    console.log('[Settings] Rendering with avatar URL:', avatarUrl);
    console.log('[Settings] Profile data:', profileData);

    return (
        <SafeAreaView className="flex-1 bg-main">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-txt text-3xl font-bold mb-6">{t('settings.title')}</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View className="mx-6 mb-8 bg-card rounded-3xl p-5 border border-cardBorder flex-row items-center">
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            className="w-16 h-16 rounded-full border-2 border-[#00D4AA]"
                        />
                    ) : (
                        <View className="w-16 h-16 rounded-full border-2 border-[#00D4AA] bg-surface items-center justify-center">
                            <Ionicons name="person" size={32} color="#00D4AA" />
                        </View>
                    )}
                    <View className="ml-4 flex-1">
                        <Text className="text-txt text-lg font-bold">{displayName}</Text>
                        <Text className="text-txtMuted text-sm mb-1">{displaySub}</Text>
                        <View className="bg-[#00D4AA20] self-start px-2 py-0.5 rounded flex-row items-center">
                            <Ionicons name="star" size={10} color="#00D4AA" />
                            <Text className="text-[#00D4AA] text-[10px] font-bold ml-1 uppercase">{civicLevel}</Text>
                        </View>
                    </View>
                    <TouchableOpacity className="p-2 bg-surface rounded-full">
                        <Ionicons name="pencil" size={18} color="#00D4AA" />
                    </TouchableOpacity>
                </View>

                {/* Preferences */}
                <View className="px-6 mb-8">
                    <Text className="text-txtMuted text-sm font-semibold mb-3 uppercase tracking-wider ml-2">{t('settings.preferences')}</Text>
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow
                            icon="notifications"
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
                            icon="location"
                            title={t('settings.location')}
                            subtitle="Required for geo-fencing features"
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
                            icon={isDark ? 'moon' : 'sunny'}
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
                            icon="language"
                            title={t('settings.language')}
                            value={currentLanguageName}
                            onPress={() => setShowLangPicker(!showLangPicker)}
                        />

                        {showLangPicker && (
                            <View className="pb-4 pt-2 border-t border-cardBorder">
                                <View className="flex-row flex-wrap justify-between">
                                    {languages.map((lang) => (
                                        <TouchableOpacity
                                            key={lang.code}
                                            className={`px-3 py-2 rounded-xl mb-2 w-[48%] border ${i18n.language === lang.code ? 'bg-[#00D4AA20] border-[#00D4AA]' : 'bg-surface border-cardBorder'}`}
                                            onPress={() => changeLanguage(lang.code)}
                                        >
                                            <Text className={`text-xs text-center ${i18n.language === lang.code ? 'text-[#00D4AA] font-bold' : 'text-txt'}`}>
                                                {lang.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Admin Section (only visible to admins) */}
                {profileData?.role === 'admin' && (
                    <View className="px-6 mb-8">
                        <Text className="text-txtMuted text-sm font-semibold mb-3 uppercase tracking-wider ml-2">Administration</Text>
                        <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                            <SettingRow
                                icon="shield-checkmark"
                                title="Admin Dashboard"
                                subtitle="Manage feedback, analytics, and navigation"
                                onPress={() => router.push('/admin')}
                            />
                        </View>
                    </View>
                )}

                {/* Support & Legal */}
                <View className="px-6 mb-8">
                    <Text className="text-txtMuted text-sm font-semibold mb-3 uppercase tracking-wider ml-2">{t('settings.support')}</Text>
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow
                            icon="help-circle"
                            title={t('settings.help')}
                            onPress={() => router.push('/settings/help')}
                        />
                        <SettingRow icon="shield-checkmark" title={t('settings.privacy')} type="link" />
                        <SettingRow icon="document-text" title={t('settings.terms')} type="link" />
                    </View>
                </View>

                {/* Account Actions */}
                <View className="px-6 mb-12">
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow
                            icon="log-out"
                            title={t('settings.logout')}
                            danger
                            onPress={handleLogout}
                        />
                    </View>
                    <Text className="text-txtMuted text-center text-xs mt-6">Disha-Setu v1.0.0 (Build 1)</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
