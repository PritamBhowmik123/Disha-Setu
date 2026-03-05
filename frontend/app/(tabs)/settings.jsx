import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { logout as authLogout, fetchMe } from '../../services/authService';
import { disconnectSocket } from '../../services/socketService';

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
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

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
                <Text className="text-txtMuted mt-3 text-sm">Loading profile...</Text>
            </SafeAreaView>
        );
    }

    const displayName = profileData?.name || (profileData?.is_guest ? 'Guest User' : 'DishaSetu User');
    const displaySub = profileData?.phone ? `+91 ${profileData.phone}` : (profileData?.is_guest ? 'Guest session' : 'Logged in');
    const civicLevel = profileData?.civic_level || 'Civic Newcomer';
    const avatarUrl = profileData?.avatar_url;
    
    console.log('[Settings] Rendering with avatar URL:', avatarUrl);
    console.log('[Settings] Profile data:', profileData);

    return (
        <SafeAreaView className="flex-1 bg-main">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-txt text-3xl font-bold mb-6">Settings</Text>
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
                    <Text className="text-txtMuted text-sm font-semibold mb-3 uppercase tracking-wider ml-2">Preferences</Text>
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow
                            icon="notifications"
                            title="Push Notifications"
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
                            title="Location Services"
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
                            title="Dark Mode"
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
                        <SettingRow icon="language" title="Language" value="English" />
                    </View>
                </View>

                {/* Support & Legal */}
                <View className="px-6 mb-8">
                    <Text className="text-txtMuted text-sm font-semibold mb-3 uppercase tracking-wider ml-2">Support & Legal</Text>
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow icon="help-circle" title="Help Center & FAQs" />
                        <SettingRow icon="shield-checkmark" title="Privacy Policy" type="link" />
                        <SettingRow icon="document-text" title="Terms of Service" type="link" />
                    </View>
                </View>

                {/* Account Actions */}
                <View className="px-6 mb-12">
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow
                            icon="log-out"
                            title="Log Out"
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
