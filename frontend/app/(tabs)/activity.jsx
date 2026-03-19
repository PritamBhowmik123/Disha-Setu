import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { fetchUserFeedback } from '../../services/feedbackService';

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
    reviewed: '#6366F1',
    resolved: '#10B981',
};

function ActivityItem({ report, isLast }) {
    const color = CATEGORY_COLORS[report.category] || '#6366F1';
    const statusColor = STATUS_COLORS[report.status] || '#9CA3AF';
    const timeAgo = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <View className="flex-row">
            <View className="items-center mr-4">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Ionicons name="chatbubble" size={20} color={color} />
                </View>
                {!isLast && <View className="w-px h-16 bg-cardBorder my-1" />}
            </View>

            <View className="flex-1 pt-1 pb-6">
                <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-txtMuted text-xs">{timeAgo}</Text>
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusColor}20` }}>
                        <Text className="text-xs font-bold capitalize" style={{ color: statusColor }}>{report.status}</Text>
                    </View>
                </View>
                <Text className="text-txt font-semibold text-base mb-1 capitalize">{report.category} issue</Text>
                <Text className="text-txtMuted text-sm leading-5" numberOfLines={2}>
                    {report.description}
                </Text>
                {report.ticket_id && (
                    <Text className="text-[#00D4AA] text-xs mt-1 font-mono">#{report.ticket_id}</Text>
                )}
            </View>
        </View>
    );
}

export default function ActivityScreen() {
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadReports = useCallback(async () => {
        try {
            const data = await fetchUserFeedback();
            setReports(data);
        } catch (err) {
            console.error('[Activity] Failed to load reports:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadReports();
    };

    const resolvedCount = reports.filter(r => r.status === 'resolved').length;

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="px-6 pt-6 pb-4">
                <Text className="text-txt text-3xl font-bold">{t('activity.title')}</Text>
                <Text className="text-txtMuted text-sm mt-1">{t('activity.subtitle')}</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00D4AA" />
                    <Text className="text-txtMuted mt-3 text-sm">{t('common.loading')}</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                >
                    {/* Stats */}
                    <View className="flex-row px-6 mb-8 gap-3">
                        <View className="flex-1 bg-card rounded-3xl p-4 border border-cardBorder">
                            <View className="w-10 h-10 rounded-full bg-[#00D4AA20] items-center justify-center mb-3">
                                <Ionicons name="chatbubbles" size={20} color="#00D4AA" />
                            </View>
                            <Text className="text-txt text-2xl font-bold mb-1">{reports.length}</Text>
                            <Text className="text-txtMuted text-xs font-medium">{t('activity.reports')}</Text>
                        </View>
                        <View className="flex-1 bg-card rounded-3xl p-4 border border-cardBorder">
                            <View className="w-10 h-10 rounded-full bg-[#6366F120] items-center justify-center mb-3">
                                <Ionicons name="checkmark-done-circle" size={20} color="#6366F1" />
                            </View>
                            <Text className="text-txt text-2xl font-bold mb-1">{resolvedCount}</Text>
                            <Text className="text-txtMuted text-xs font-medium">{t('activity.resolved')}</Text>
                        </View>
                    </View>

                    {/* Level Banner */}
                    <View className="mx-6 mb-8 bg-[#00D4AA] rounded-3xl p-5"
                        style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <View>
                                <Text className="text-black/70 text-sm font-bold uppercase tracking-wider mb-1">{t('activity.current_level')}</Text>
                                <Text className="text-black text-xl font-bold">Civic Guardian</Text>
                            </View>
                            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                                <Ionicons name="star" size={24} color="#000" />
                            </View>
                        </View>
                        <View className="h-2 bg-black/10 rounded-full overflow-hidden mb-2">
                            <View className="w-3/4 h-full bg-black rounded-full" />
                        </View>
                        <Text className="text-black/80 text-xs font-medium">150 pts to next level</Text>
                    </View>

                    {/* Timeline */}
                    <View className="px-6 mb-8">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-txt text-lg font-bold">{t('activity.history')}</Text>
                            <Text className="text-txtMuted text-sm">{t('search.results', { count: reports.length, s: reports.length !== 1 ? 's' : '' })}</Text>
                        </View>

                        {reports.length === 0 ? (
                            <View className="bg-card rounded-3xl p-8 border border-cardBorder items-center">
                                <Ionicons name="document-text-outline" size={48} color={iconDim} />
                                <Text className="text-txt font-bold text-lg mt-4">{t('activity.no_activity')}</Text>
                                <Text className="text-txtMuted text-sm mt-2 text-center">{t('activity.start_contributing')}</Text>
                            </View>
                        ) : (
                            <View className="bg-card rounded-3xl p-5 pt-6 border border-cardBorder">
                                {reports.map((report, index) => (
                                    <ActivityItem
                                        key={report.id}
                                        report={report}
                                        isLast={index === reports.length - 1}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
