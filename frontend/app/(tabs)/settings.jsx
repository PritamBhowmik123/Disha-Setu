import { View, Text, ScrollView, TouchableOpacity, Switch, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';

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
                <Text className={`text-base font-medium mb-0.5 ${danger ? 'text-[#EF4444]' : 'text-txt'}`}>
                    {title}
                </Text>
                {subtitle && (
                    <Text className="text-txtMuted text-xs">{subtitle}</Text>
                )}
            </View>

            {type === 'nav' && (
                <View className="flex-row items-center">
                    {value && <Text className="text-txtMuted mr-2">{value}</Text>}
                    <Ionicons name="chevron-forward" size={20} color={iconDim} />
                </View>
            )}

            {type === 'switch' && action}

            {type === 'link' && (
                <Ionicons name="open-outline" size={20} color={iconDim} />
            )}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const { isDark, toggleColorScheme } = useColorScheme();

    const handleLogout = () => {
        // Add logout logic here
        router.replace('/auth');
    };

    return (
        <SafeAreaView className="flex-1 bg-main">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-txt text-3xl font-bold mb-6">Settings</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View className="mx-6 mb-8 bg-card rounded-3xl p-5 border border-cardBorder flex-row items-center">
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/100?img=11' }}
                        className="w-16 h-16 rounded-full border-2 border-[#00D4AA]"
                    />
                    <View className="ml-4 flex-1">
                        <Text className="text-txt text-lg font-bold">Pritam Bhowmik</Text>
                        <Text className="text-txtMuted text-sm mb-1">+91 98765 43210</Text>
                        <View className="bg-[#00D4AA20] self-start px-2 py-0.5 rounded flex-row items-center">
                            <Ionicons name="star" size={10} color="#00D4AA" />
                            <Text className="text-[#00D4AA] text-[10px] font-bold ml-1 uppercase">Civic Guardian</Text>
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
                            icon={isDark ? "moon" : "sunny"}
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
                        <SettingRow
                            icon="language"
                            title="Language"
                            value="English"
                        />
                    </View>
                </View>

                {/* Support & Legal */}
                <View className="px-6 mb-8">
                    <Text className="text-txtMuted text-sm font-semibold mb-3 uppercase tracking-wider ml-2">Support & Legal</Text>
                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SettingRow
                            icon="help-circle"
                            title="Help Center & FAQs"
                        />
                        <SettingRow
                            icon="shield-checkmark"
                            title="Privacy Policy"
                            type="link"
                        />
                        <SettingRow
                            icon="document-text"
                            title="Terms of Service"
                            type="link"
                        />
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
                    <Text className="text-txtMuted text-center text-xs mt-6">Disha-Setu v1.0.0 (Build 42)</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
