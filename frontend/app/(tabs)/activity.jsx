import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { formatRelativeTime } from '../../utils/dateFormatter';
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

function ActivityItem({ report, isLast, onPress }) {
    const color = CATEGORY_COLORS[report.category] || '#6366F1';
    const statusColor = STATUS_COLORS[report.status] || '#9CA3AF';
    const timeAgo = formatRelativeTime(report.created_at);

    return (
        <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.7}
            className={`py-4 flex-row items-start ${!isLast ? 'border-b border-cardBorder' : ''}`}
        >
            <View className="w-9 h-9 rounded-lg items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: `${color}18` }}>
                <Ionicons name="chatbubble-outline" size={17} color={color} />
            </View>
            <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-txt font-semibold text-sm capitalize">{report.category} issue</Text>
                    <View className="flex-row items-center gap-2">
                        <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: `${statusColor}18` }}>
                            <Text className="text-[10px] font-bold capitalize" style={{ color: statusColor }}>{report.status}</Text>
                        </View>
                    </View>
                </View>
                <Text className="text-txtMuted text-xs leading-5" numberOfLines={2}>{report.description}</Text>
                <View className="flex-row items-center justify-between mt-1.5">
                    {report.ticket_id && (
                        <Text className="text-[#00D4AA] text-[10px] font-mono">#{report.ticket_id}</Text>
                    )}
                    <Text className="text-txtMuted text-[10px] ml-auto">{timeAgo}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function ActivityScreen() {
    const router = useRouter();
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

    useEffect(() => { loadReports(); }, []);

    const onRefresh = () => { setRefreshing(true); loadReports(); };

    const resolvedCount = reports.filter(r => r.status === 'resolved').length;

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="px-5 pt-5 pb-4 border-b border-cardBorder">
                <Text className="text-txt text-2xl font-bold">{t('activity.title')}</Text>
                <Text className="text-txtMuted text-xs mt-1">{t('activity.subtitle')}</Text>
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
                    {/* Stats row */}
                    <View className="flex-row px-5 pt-5 mb-5 gap-3">
                        <View className="flex-1 bg-card rounded-xl p-4 border border-cardBorder flex-row items-center gap-3">
                            <View className="w-9 h-9 rounded-lg bg-[#00D4AA]/10 items-center justify-center">
                                <Ionicons name="chatbubbles-outline" size={18} color="#00D4AA" />
                            </View>
                            <View>
                                <Text className="text-txt text-xl font-bold">{reports.length}</Text>
                                <Text className="text-txtMuted text-xs">{t('activity.reports')}</Text>
                            </View>
                        </View>
                        <View className="flex-1 bg-card rounded-xl p-4 border border-cardBorder flex-row items-center gap-3">
                            <View className="w-9 h-9 rounded-lg bg-[#6366F1]/10 items-center justify-center">
                                <Ionicons name="checkmark-done-circle-outline" size={18} color="#6366F1" />
                            </View>
                            <View>
                                <Text className="text-txt text-xl font-bold">{resolvedCount}</Text>
                                <Text className="text-txtMuted text-xs">{t('activity.resolved')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Badges */}
                    {(reports.length >= 1 || resolvedCount >= 5) && (
                        <View className="px-5 mb-5">
                            <Text className="text-txtMuted text-xs font-semibold mb-3">Recognition</Text>
                            <View className="flex-col gap-2">
                                {resolvedCount >= 5 && (
                                    <View className="flex-row items-center gap-3 bg-card border-l-2 border-[#00D4AA] border border-cardBorder rounded-xl px-4 py-3">
                                        <Ionicons name="ribbon-outline" size={16} color="#00D4AA" />
                                        <Text className="text-txt text-sm font-medium">Top Contributor</Text>
                                    </View>
                                )}
                                {reports.length >= 1 && (
                                    <View className="flex-row items-center gap-3 bg-card border-l-2 border-[#6366F1] border border-cardBorder rounded-xl px-4 py-3">
                                        <Ionicons name="shield-checkmark-outline" size={16} color="#6366F1" />
                                        <Text className="text-txt text-sm font-medium">Verified Reporter</Text>
                                    </View>
                                )}
                                {reports.length >= 3 && (
                                    <View className="flex-row items-center gap-3 bg-card border-l-2 border-[#F59E0B] border border-cardBorder rounded-xl px-4 py-3">
                                        <Ionicons name="people-outline" size={16} color="#F59E0B" />
                                        <Text className="text-txt text-sm font-medium">Active Citizen</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Impact */}
                    <View className="px-5 mb-5">
                        <Text className="text-txtMuted text-xs font-semibold mb-3">Your Impact</Text>
                        <View className="bg-card border border-cardBorder rounded-xl p-4">
                            <View className="flex-row items-center gap-3">
                                <View className="w-9 h-9 rounded-lg bg-[#10B981]/10 items-center justify-center">
                                    <Ionicons name="checkmark-done-circle-outline" size={18} color="#10B981" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-txt text-sm font-semibold">
                                        {resolvedCount} {resolvedCount === 1 ? 'report' : 'reports'} resolved
                                    </Text>
                                    <Text className="text-txtMuted text-xs mt-0.5">
                                        {resolvedCount > 0
                                            ? `${resolvedCount} of your reports were acted upon.`
                                            : 'Your reports are being reviewed.'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            className="bg-card border border-[#00D4AA]/40 rounded-xl p-4 mt-3 flex-row items-center gap-3"
                            onPress={() => router.push('/feedback')}
                        >
                            <View className="w-9 h-9 rounded-lg bg-[#00D4AA]/10 items-center justify-center">
                                <Ionicons name="megaphone-outline" size={18} color="#00D4AA" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-txt font-semibold text-sm">Report an Issue</Text>
                                <Text className="text-txtMuted text-xs mt-0.5">Help improve your community</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={16} color="#00D4AA" />
                        </TouchableOpacity>
                    </View>

                    {/* History */}
                    <View className="px-5 mb-8">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-txt text-base font-bold">{t('activity.history')}</Text>
                            <Text className="text-txtMuted text-xs">{reports.length} {reports.length !== 1 ? 'reports' : 'report'}</Text>
                        </View>

                        {reports.length === 0 ? (
                            <View className="bg-card rounded-xl p-8 border border-cardBorder items-center">
                                <Ionicons name="document-text-outline" size={40} color={iconDim} />
                                <Text className="text-txt font-bold text-base mt-4">{t('activity.no_activity')}</Text>
                                <Text className="text-txtMuted text-xs mt-2 text-center">{t('activity.start_contributing')}</Text>
                            </View>
                        ) : (
                            <View className="bg-card rounded-xl px-4 border border-cardBorder">
                                {reports.map((report, index) => (
                                    <ActivityItem
                                        key={report.id}
                                        report={report}
                                        isLast={index === reports.length - 1}
                                        onPress={() => {
                                            if (report.project_id) {
                                                router.push(`/project/${report.project_id}`);
                                            }
                                        }}
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
