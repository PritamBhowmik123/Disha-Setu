/**
 * app/(tabs)/notifications.jsx — Real notifications from backend with Socket.io live updates
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { fetchNotifications, markNotificationsRead } from '../../services/notificationService';
import { formatDateTime } from '../../utils/dateFormatter';
import { onNewNotification, onGeoAlert } from '../../services/socketService';

const NOTIFICATION_ICONS = {
    new_project: { icon: 'add-circle-outline', color: '#6366F1' },
    status_change: { icon: 'sync-outline', color: '#F59E0B' },
    completed: { icon: 'checkmark-circle-outline', color: '#10B981' },
    delay: { icon: 'warning-outline', color: '#EF4444' },
    geo_fence_alert: { icon: 'location-outline', color: '#00D4AA' },
};

function NotifCard({ notif, isLast, onPress }) {
    const meta = NOTIFICATION_ICONS[notif.type] || { icon: 'notifications-outline', color: '#9CA3AF' };
    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
            className={`flex-row items-start px-4 py-3.5 ${!isLast ? 'border-b border-cardBorder' : ''}`}
        >
            {/* Unread strip */}
            {!notif.read && (
                <View className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[#00D4AA]" />
            )}
            <View className="w-9 h-9 rounded-lg items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: `${meta.color}15` }}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <View className="flex-1">
                <View className="flex-row items-start justify-between gap-2">
                    <Text className="text-txt font-semibold text-sm flex-1 leading-5" numberOfLines={2}>{notif.title}</Text>
                    {!notif.read && <View className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] mt-1.5 shrink-0" />}
                </View>
                <Text className="text-txtMuted text-xs leading-5 mt-0.5">{notif.message}</Text>
                <Text className="text-txtMuted text-[10px] mt-1.5">
                    {notif.projectName && <Text className="font-medium">{notif.projectName} · </Text>}
                    {notif.time ? formatDateTime(notif.time) : ''}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [geoAlert, setGeoAlert] = useState(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { notifications: list, unreadCount: count } = await fetchNotifications();
            setNotifications(list);
            setUnreadCount(count);
        } catch (err) {
            console.error('[Notifications]', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const unsubNotif = onNewNotification((payload) => {
            setNotifications(prev => [{
                id: Date.now().toString(),
                type: payload.type,
                title: payload.title,
                message: payload.message,
                projectId: payload.projectId,
                read: false,
                time: new Date().toISOString(),
            }, ...prev]);
            setUnreadCount(c => c + 1);
        });
        const unsubGeo = onGeoAlert((payload) => { setGeoAlert(payload); });
        return () => {
            if (unsubNotif) unsubNotif();
            if (unsubGeo) unsubGeo();
        };
    }, []);

    const handleMarkRead = async (id) => {
        const notif = notifications.find(n => n.id === id);
        if (!notif || notif.read) return;

        try {
            await markNotificationsRead([id]);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch (err) {
            console.error('[Notifications] Mark read error:', err.message);
        }
    };

    const handleMarkAllRead = async () => {
        await markNotificationsRead([]);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const onRefresh = () => { setRefreshing(true); load(true); };

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-5 pb-4 flex-row items-center justify-between border-b border-cardBorder">
                <View>
                    <Text className="text-txt text-2xl font-bold">{t('notif.title')}</Text>
                    {unreadCount > 0 && (
                        <Text className="text-txtMuted text-xs mt-0.5">{unreadCount} unread</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text className="text-[#00D4AA] text-sm font-semibold">{t('notif.mark_all')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Geo Alert — slim banner */}
            {geoAlert && (
                <TouchableOpacity 
                    onPress={() => {
                        if (geoAlert.projectId) {
                            router.push(`/project/${geoAlert.projectId}`);
                        }
                    }}
                    activeOpacity={0.8}
                    className="mx-4 mt-3 flex-row items-center gap-3 bg-[#00D4AA]/8 border border-[#00D4AA]/25 rounded-xl px-4 py-3"
                >
                    <Ionicons name="location-outline" size={18} color="#00D4AA" />
                    <View className="flex-1">
                        <Text className="text-[#00D4AA] font-semibold text-xs">{t('notif.near_site')}</Text>
                        <Text className="text-txtMuted text-xs mt-0.5">
                            {geoAlert.projectName} — {geoAlert.distanceM < 1000 ? `${geoAlert.distanceM}m` : `${(geoAlert.distanceM / 1000).toFixed(1)}km`} away
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setGeoAlert(null)}>
                        <Ionicons name="close" size={16} color={iconDim} />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00D4AA" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 90 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                >
                    {notifications.length === 0 ? (
                        <View className="items-center justify-center py-20">
                            <Ionicons name="notifications-off-outline" size={44} color={iconDim} />
                            <Text className="text-txt font-bold text-lg mt-4">{t('notif.no_notifs')}</Text>
                            <Text className="text-txtMuted text-sm mt-2 text-center">{t('notif.caught_up')}</Text>
                        </View>
                    ) : (
                        <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                            {notifications.map((n, idx) => (
                                <NotifCard 
                                    key={n.id} 
                                    notif={n} 
                                    isLast={idx === notifications.length - 1} 
                                    onPress={() => {
                                        handleMarkRead(n.id);
                                        if (n.projectId) {
                                            router.push(`/project/${n.projectId}`);
                                        }
                                    }}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
