/**
 * app/admin/index.jsx
 * Admin Dashboard Home - Overview with stats and quick actions
 */
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../services/adminService';

const STAT_CONFIG = [
    { key: 'totalFeedback', label: 'Total Feedback', icon: 'chatbubbles-outline', color: '#6366F1', route: '/admin/feedback' },
    { key: 'totalProjects', label: 'Projects', icon: 'construct-outline', color: '#00D4AA', route: null },
    { key: 'totalBuildings', label: 'Buildings', icon: 'business-outline', color: '#8B5CF6', route: '/admin/navigation' },
    { key: 'totalRooms', label: 'Nav Nodes', icon: 'git-network-outline', color: '#F59E0B', route: '/admin/navigation' },
];

const STATUS_COLORS = {
    pending: { bg: '#F59E0B18', text: '#F59E0B', border: '#F59E0B35' },
    'under review': { bg: '#6366F118', text: '#6366F1', border: '#6366F135' },
    resolved: { bg: '#10B98118', text: '#10B981', border: '#10B98135' },
    rejected: { bg: '#EF444418', text: '#EF4444', border: '#EF444435' },
};

function StatCard({ config, value, onPress }) {
    const { isDark } = useColorScheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.75 : 1}
            className="flex-1 bg-card rounded-xl p-4 border border-cardBorder"
        >
            <View className="w-9 h-9 rounded-lg items-center justify-center mb-3" style={{ backgroundColor: `${config.color}18` }}>
                <Ionicons name={config.icon} size={18} color={config.color} />
            </View>
            <Text className="text-txt text-2xl font-bold mb-0.5">{value ?? '–'}</Text>
            <Text className="text-txtMuted text-xs">{config.label}</Text>
            {onPress && (
                <View className="flex-row items-center gap-1 mt-2">
                    <Text className="text-xs font-medium" style={{ color: config.color }}>View</Text>
                    <Ionicons name="arrow-forward" size={11} color={config.color} />
                </View>
            )}
        </TouchableOpacity>
    );
}

function QuickActionRow({ icon, iconColor, title, subtitle, onPress }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            className="flex-row items-center py-4 border-b border-cardBorder last:border-0"
        >
            <View className="w-9 h-9 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: `${iconColor}18` }}>
                <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View className="flex-1">
                <Text className="text-txt font-semibold text-sm">{title}</Text>
                <Text className="text-txtMuted text-xs mt-0.5">{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={iconDim} />
        </TouchableOpacity>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadStats = useCallback(async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role !== 'admin') { router.replace('/'); return; }
        loadStats();
    }, [user]);

    const onRefresh = () => { setRefreshing(true); loadStats(); };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">Loading dashboard…</Text>
            </SafeAreaView>
        );
    }

    const statValues = stats?.stats || {};
    const recentActivity = stats?.recentActivity || [];

    return (
        <SafeAreaView className="flex-1 bg-main">
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Header */}
                <View className="px-5 pt-5 pb-4 border-b border-cardBorder">
                    <View className="flex-row items-center gap-2 mb-1">
                        <View className="w-8 h-8 rounded-lg bg-[#00D4AA]/15 items-center justify-center">
                            <Ionicons name="shield-checkmark-outline" size={17} color="#00D4AA" />
                        </View>
                        <Text className="text-txtMuted text-xs font-semibold">Admin Console</Text>
                    </View>
                    <Text className="text-txt text-2xl font-bold">Dashboard</Text>
                    <Text className="text-txtMuted text-xs mt-0.5">Welcome back, {user?.name || 'Admin'}</Text>
                </View>

                {/* Stats grid */}
                <View className="px-5 pt-5 mb-5">
                    <Text className="text-txtMuted text-xs font-semibold mb-3">Overview</Text>
                    <View className="flex-row gap-3 mb-3">
                        {STAT_CONFIG.slice(0, 2).map(cfg => (
                            <StatCard
                                key={cfg.key}
                                config={cfg}
                                value={statValues[cfg.key]}
                                onPress={cfg.route ? () => router.push(cfg.route) : undefined}
                            />
                        ))}
                    </View>
                    <View className="flex-row gap-3">
                        {STAT_CONFIG.slice(2).map(cfg => (
                            <StatCard
                                key={cfg.key}
                                config={cfg}
                                value={statValues[cfg.key]}
                                onPress={cfg.route ? () => router.push(cfg.route) : undefined}
                            />
                        ))}
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="px-5 mb-5">
                    <Text className="text-txtMuted text-xs font-semibold mb-3">Quick Actions</Text>
                    <View className="bg-card rounded-xl px-4 border border-cardBorder">
                        <QuickActionRow
                            icon="chatbubbles-outline"
                            iconColor="#6366F1"
                            title="Manage Feedback"
                            subtitle="View and respond to citizen reports"
                            onPress={() => router.push('/admin/feedback')}
                        />
                        <QuickActionRow
                            icon="bar-chart-outline"
                            iconColor="#00D4AA"
                            title="View Analytics"
                            subtitle="Complaint trends and insights"
                            onPress={() => router.push('/admin/analytics')}
                        />
                        <QuickActionRow
                            icon="map-outline"
                            iconColor="#8B5CF6"
                            title="Indoor Navigation"
                            subtitle="Manage buildings, rooms and connections"
                            onPress={() => router.push('/admin/navigation')}
                        />
                    </View>
                </View>

                {/* Recent Feedback */}
                {recentActivity.length > 0 && (
                    <View className="px-5">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-txtMuted text-xs font-semibold">Recent Feedback</Text>
                            <TouchableOpacity onPress={() => router.push('/admin/feedback')}>
                                <Text className="text-[#00D4AA] text-xs font-semibold">View all</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                            {recentActivity.slice(0, 5).map((item, idx) => {
                                const s = STATUS_COLORS[(item.status || '').toLowerCase()] || STATUS_COLORS['pending'];
                                const isLast = idx === Math.min(recentActivity.length, 5) - 1;
                                return (
                                    <View
                                        key={item.id}
                                        className={`px-4 py-3 flex-row items-center gap-3 ${!isLast ? 'border-b border-cardBorder' : ''}`}
                                    >
                                        <View className="flex-1">
                                            <Text className="text-txt text-sm font-semibold">{item.ticket_id}</Text>
                                            <Text className="text-txtMuted text-xs mt-0.5 capitalize">{item.category}</Text>
                                        </View>
                                        <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border }}>
                                            <Text className="text-[10px] font-bold capitalize" style={{ color: s.text }}>{item.status}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
