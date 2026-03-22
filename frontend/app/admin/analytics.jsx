/**
 * app/admin/analytics.jsx
 * Admin Analytics - Feedback trends and insights
 */
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateFormatter';
import { getFeedbackAnalytics } from '../../services/adminService';

const CATEGORY_COLORS = {
    delay: '#F59E0B',
    safety: '#EF4444',
    noise: '#8B5CF6',
    traffic: '#F97316',
    corruption: '#EC4899',
    other: '#6B7280',
};

const STATUS_COLORS = {
    pending: '#F59E0B',
    'under review': '#6366F1',
    resolved: '#10B981',
    rejected: '#EF4444',
};

function SectionCard({ title, icon, iconColor, children }) {
    return (
        <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
                <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: `${iconColor}18` }}>
                    <Ionicons name={icon} size={15} color={iconColor} />
                </View>
                <Text className="text-txt font-bold text-sm">{title}</Text>
            </View>
            <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                {children}
            </View>
        </View>
    );
}

function DataRow({ label, value, color, barMax, isLast }) {
    const barWidth = barMax && value ? Math.round((value / barMax) * 100) : 0;
    return (
        <View className={`px-4 py-3 ${!isLast ? 'border-b border-cardBorder' : ''}`}>
            <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-txt text-sm capitalize flex-1" numberOfLines={1}>{label}</Text>
                <Text className="font-bold text-sm ml-3" style={{ color }}>{value}</Text>
            </View>
            {barMax != null && (
                <View className="h-1 bg-surface rounded-full overflow-hidden">
                    <View className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: color }} />
                </View>
            )}
        </View>
    );
}

export default function AdminAnalytics() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadAnalytics = useCallback(async () => {
        try {
            const data = await getFeedbackAnalytics();
            setAnalytics(data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role !== 'admin') { router.replace('/'); return; }
        loadAnalytics();
    }, [user]);

    const onRefresh = () => { setRefreshing(true); loadAnalytics(); };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">Loading analytics…</Text>
            </SafeAreaView>
        );
    }

    const categoryData = analytics?.categoryBreakdown || [];
    const statusData = analytics?.statusData || [];
    const topProjects = analytics?.topProjects || [];
    const trendData = analytics?.trendData || [];

    const categoryMax = Math.max(...categoryData.map(d => Number(d.count) || 0), 1);
    const trendMax = Math.max(...trendData.map(d => Number(d.count) || 0), 1);

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="px-5 pt-5 pb-4 border-b border-cardBorder">
                <TouchableOpacity
                    className="flex-row items-center gap-1 mb-3"
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={18} color={iconDim} />
                    <Text className="text-txtMuted text-sm font-medium">Dashboard</Text>
                </TouchableOpacity>
                <Text className="text-txt text-2xl font-bold">Analytics</Text>
                <Text className="text-txtMuted text-xs mt-0.5">Complaint trends and insights</Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
            >
                {/* Category Breakdown */}
                <SectionCard title="Complaint Categories" icon="pie-chart-outline" iconColor="#8B5CF6">
                    {categoryData.length > 0 ? categoryData.map((item, index) => {
                        const key = item.category?.toLowerCase();
                        const color = CATEGORY_COLORS[key] || '#6B7280';
                        return (
                            <DataRow
                                key={index}
                                label={item.category}
                                value={item.count}
                                color={color}
                                barMax={categoryMax}
                                isLast={index === categoryData.length - 1}
                            />
                        );
                    }) : (
                        <View className="px-4 py-6 items-center">
                            <Text className="text-txtMuted text-sm">No data available</Text>
                        </View>
                    )}
                </SectionCard>

                {/* Status Distribution */}
                <SectionCard title="Status Distribution" icon="checkmark-circle-outline" iconColor="#10B981">
                    {statusData.length > 0 ? statusData.map((item, index) => {
                        const key = (item.status || '').toLowerCase();
                        const color = STATUS_COLORS[key] || '#6B7280';
                        return (
                            <DataRow
                                key={index}
                                label={item.status}
                                value={item.count}
                                color={color}
                                isLast={index === statusData.length - 1}
                            />
                        );
                    }) : (
                        <View className="px-4 py-6 items-center">
                            <Text className="text-txtMuted text-sm">No data available</Text>
                        </View>
                    )}
                </SectionCard>

                {/* Top Reported Locations */}
                <SectionCard title="Most Reported Locations" icon="location-outline" iconColor="#EF4444">
                    {topProjects.length > 0 ? topProjects.map((item, index) => (
                        <DataRow
                            key={index}
                            label={`${item.area}${item.district ? ` · ${item.district}` : ''}`}
                            value={`${item.complaint_count}`}
                            color="#EF4444"
                            isLast={index === topProjects.length - 1}
                        />
                    )) : (
                        <View className="px-4 py-6 items-center">
                            <Text className="text-txtMuted text-sm">No data available</Text>
                        </View>
                    )}
                </SectionCard>

                {/* Recent Trend */}
                <SectionCard title="Last 30 Days" icon="trending-up-outline" iconColor="#00D4AA">
                    {trendData.length > 0 ? trendData.slice(-10).map((item, index, arr) => {
                        const label = formatDate(item.date);
                        return (
                            <DataRow
                                key={index}
                                label={label}
                                value={item.count}
                                color="#00D4AA"
                                barMax={trendMax}
                                isLast={index === arr.length - 1}
                            />
                        );
                    }) : (
                        <View className="px-4 py-6 items-center">
                            <Text className="text-txtMuted text-sm">No data available</Text>
                        </View>
                    )}
                </SectionCard>
            </ScrollView>
        </SafeAreaView>
    );
}
