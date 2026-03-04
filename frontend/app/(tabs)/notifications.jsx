import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { MOCK_NOTIFICATIONS } from '../../constants/mockData';
import { useColorScheme } from '../../hooks/use-color-scheme';

const NOTIF_META = {
    new_project: { icon: 'location', color: '#00D4AA' },
    status_change: { icon: 'refresh-circle', color: '#6366F1' },
    completed: { icon: 'checkmark-circle', color: '#10B981' },
    delay: { icon: 'warning', color: '#EF4444' },
};

export default function NotificationsScreen() {
    const router = useRouter();
    const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
                <View>
                    <Text className="text-txt text-2xl font-bold">Alerts</Text>
                    {unreadCount > 0 && (
                        <Text className="text-txtMuted text-sm">{unreadCount} unread</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <View className="bg-[#00D4AA20] rounded-full px-3 py-1.5 border border-[#00D4AA]/30">
                        <Text className="text-[#00D4AA] text-xs font-bold">{unreadCount} New</Text>
                    </View>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Geo-fence alert banner */}
                <View className="mx-4 mb-4 bg-[#00D4AA15] rounded-3xl p-4 border border-[#00D4AA]/30 flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-[#00D4AA] items-center justify-center mr-3">
                        <Ionicons name="radio" size={20} color="#000" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[#00D4AA] font-bold text-sm">Geo-Fence Active</Text>
                        <Text className="text-txtMuted text-xs mt-0.5">You&apos;ll be alerted when entering project zones</Text>
                    </View>
                </View>

                {/* Notifications list */}
                {MOCK_NOTIFICATIONS.map((notif) => {
                    const meta = NOTIF_META[notif.type] || NOTIF_META.new_project;
                    return (
                        <TouchableOpacity
                            key={notif.id}
                            onPress={() => router.push(`/project/${notif.projectId}`)}
                            activeOpacity={0.85}
                            className="mx-4 mb-3"
                        >
                            <View className={`bg-card rounded-3xl p-4 border ${notif.read ? 'border-cardBorder' : 'border-[#00D4AA]/20'}`}>
                                <View className="flex-row items-start">
                                    <View
                                        className="w-12 h-12 rounded-2xl items-center justify-center mr-3 flex-shrink-0"
                                        style={{ backgroundColor: meta.color + '20' }}
                                    >
                                        <Ionicons name={meta.icon} size={24} color={meta.color} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`font-bold text-sm mb-1 ${notif.read ? 'text-txt' : 'text-[#00D4AA]'}`}>
                                            {notif.title}
                                        </Text>
                                        <Text className="text-txtMuted text-xs leading-5 mb-2">
                                            {notif.message}
                                        </Text>
                                        <View className="flex-row items-center justify-between mt-1">
                                            <View className="flex-row items-center bg-surface px-2 py-1 rounded-full">
                                                <Ionicons name="business" size={10} color={iconDim} />
                                                <Text className="text-txtMuted text-[10px] ml-1 font-medium">{notif.projectName}</Text>
                                            </View>
                                            <Text className="text-txtMuted text-[10px]">{notif.time}</Text>
                                        </View>
                                    </View>
                                    {!notif.read && (
                                        <View className="w-2 h-2 rounded-full bg-[#00D4AA] mt-2" />
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
                <View className="h-10" />
            </ScrollView>
        </SafeAreaView>
    );
}
