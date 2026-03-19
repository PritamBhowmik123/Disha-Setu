/**
 * app/(tabs)/notifications.jsx — Real notifications from backend with Socket.io live updates
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { fetchNotifications, markNotificationsRead } from '../../services/notificationService';
import { onNewNotification, onGeoAlert } from '../../services/socketService';

const NOTIFICATION_ICONS = {
    new_project: { icon: 'add-circle', color: '#6366F1' },
    status_change: { icon: 'reload-circle', color: '#F59E0B' },
    completed: { icon: 'checkmark-circle', color: '#10B981' },
    delay: { icon: 'warning', color: '#EF4444' },
    geo_fence_alert: { icon: 'location', color: '#00D4AA' },
};

function NotifCard({ notif }) {
    const { isDark } = useColorScheme();
    const meta = NOTIFICATION_ICONS[notif.type] || { icon: 'notifications', color: '#9CA3AF' };
    return (
        <View className={`mb-3 rounded-2xl p-4 border ${!notif.read ? 'bg-[#00D4AA08] border-[#00D4AA30]' : 'bg-card border-cardBorder'}`}>
            <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: `${meta.color}20` }}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-txt font-bold text-sm flex-1 leading-5 mr-2" numberOfLines={2}>{notif.title}</Text>
                        {!notif.read && <View className="w-2 h-2 rounded-full bg-[#00D4AA]" />}
                    </View>
                    <Text className="text-txtMuted text-sm leading-5 mb-2">{notif.message}</Text>
                    <Text className="text-[#6B7280] text-xs">
                        {notif.projectName && <Text className="font-semibold">{notif.projectName} · </Text>}
                        {notif.time ? new Date(notif.time).toLocaleString() : ''}
                    </Text>
                </View>
            </View>
        </View>
    );
}

export default function NotificationsScreen() {
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

        // Real-time: new notification arrived
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

        // Real-time: geo alert
        const unsubGeo = onGeoAlert((payload) => {
            setGeoAlert(payload);
        });

        return () => {
            if (unsubNotif) unsubNotif();
            if (unsubGeo) unsubGeo();
        };
    }, []);

    const handleMarkAllRead = async () => {
        await markNotificationsRead([]);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const onRefresh = () => {
        setRefreshing(true);
        load(true);
    };

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
                <View>
                    <Text className="text-txt text-2xl font-bold">{t('notif.title')}</Text>
                    {unreadCount > 0 && (
                        <Text className="text-[#00D4AA] text-sm font-semibold mt-0.5">{unreadCount} {t('notif.unread')}</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity className="bg-card rounded-xl px-4 py-2 border border-cardBorder" onPress={handleMarkAllRead}>
                        <Text className="text-[#00D4AA] text-sm font-semibold">{t('notif.mark_all')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Geo Alert Banner */}
            {geoAlert && (
                <View className="mx-5 mb-3 bg-[#00D4AA]/10 border border-[#00D4AA]/30 rounded-2xl p-4 flex-row items-center">
                    <Ionicons name="location" size={24} color="#00D4AA" style={{ marginRight: 12 }} />
                    <View className="flex-1">
                        <Text className="text-[#00D4AA] font-bold text-sm">{t('notif.near_site')}</Text>
                        <Text className="text-txtMuted text-xs mt-0.5">
                            {geoAlert.projectName} — {geoAlert.distanceM < 1000 ? `${geoAlert.distanceM}m` : `${(geoAlert.distanceM / 1000).toFixed(1)}km`} away
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setGeoAlert(null)}>
                        <Ionicons name="close" size={18} color={iconDim} />
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00D4AA" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                >
                    {notifications.length === 0 ? (
                        <View className="items-center justify-center py-20">
                            <Ionicons name="notifications-off-outline" size={48} color={iconDim} />
                            <Text className="text-txt font-bold text-lg mt-4">{t('notif.no_notifs')}</Text>
                            <Text className="text-txtMuted text-sm mt-2 text-center">{t('notif.caught_up')}</Text>
                        </View>
                    ) : (
                        notifications.map(n => <NotifCard key={n.id} notif={n} />)
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
