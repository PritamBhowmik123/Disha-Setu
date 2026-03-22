/**
 * app/admin/feedback.jsx
 * Admin Feedback Management - View and manage all citizen feedback
 */
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getAllFeedback, updateFeedbackStatus, deleteFeedback } from '../../services/adminService';

const STATUS_META = {
    'Pending': { color: '#F59E0B', bg: '#F59E0B18', border: '#F59E0B35', icon: 'time-outline' },
    'Under Review': { color: '#6366F1', bg: '#6366F118', border: '#6366F135', icon: 'eye-outline' },
    'Resolved': { color: '#10B981', bg: '#10B98118', border: '#10B98135', icon: 'checkmark-circle-outline' },
    'Rejected': { color: '#EF4444', bg: '#EF444418', border: '#EF444435', icon: 'close-circle-outline' },
};

const CATEGORY_COLORS = {
    delay: '#F59E0B',
    safety: '#EF4444',
    noise: '#8B5CF6',
    traffic: '#F97316',
    corruption: '#EC4899',
    other: '#6B7280',
};

const FILTER_STATUSES = ['All', 'Pending', 'Under Review', 'Resolved'];

function FeedbackCard({ feedback, onStatusChange, onDelete }) {
    const { isDark } = useColorScheme();
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const s = STATUS_META[feedback.status] || STATUS_META['Pending'];
    const catColor = CATEGORY_COLORS[(feedback.category || '').toLowerCase()] || '#6B7280';

    const handleStatusChange = async (newStatus) => {
        try {
            await updateFeedbackStatus(feedback.id, newStatus);
            onStatusChange();
            setShowStatusPicker(false);
        } catch {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Report',
            `Delete ticket ${feedback.ticket_id}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try { await deleteFeedback(feedback.id); onDelete(); }
                        catch { Alert.alert('Error', 'Failed to delete'); }
                    }
                },
            ]
        );
    };

    return (
        <View className="bg-card rounded-xl border border-cardBorder mb-3 overflow-hidden">
            {/* Card header */}
            <View className="flex-row items-center px-4 py-3 border-b border-cardBorder">
                <Text className="text-txt font-bold text-sm flex-1 font-mono">{feedback.ticket_id}</Text>
                <View
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border }}
                >
                    <Ionicons name={s.icon} size={11} color={s.color} />
                    <Text className="text-[10px] font-bold" style={{ color: s.color }}>{feedback.status}</Text>
                </View>
            </View>

            {/* Body */}
            <View className="px-4 py-3">
                <View className="flex-row items-center gap-2 mb-2">
                    <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: `${catColor}18` }}>
                        <Text className="text-[10px] font-semibold capitalize" style={{ color: catColor }}>{feedback.category}</Text>
                    </View>
                    {feedback.project_area && (
                        <View className="flex-row items-center gap-1 flex-1">
                            <Ionicons name="location-outline" size={11} color={iconDim} />
                            <Text className="text-txtMuted text-[10px] flex-1" numberOfLines={1}>{feedback.project_area}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-txt text-sm leading-5 mb-2" numberOfLines={3}>{feedback.description}</Text>
                {feedback.user_name && (
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="person-outline" size={11} color={iconDim} />
                        <Text className="text-txtMuted text-[10px]">
                            {feedback.user_name}{feedback.user_phone ? ` · ${feedback.user_phone}` : ''}
                        </Text>
                    </View>
                )}
            </View>

            {/* Actions */}
            <View className="px-4 pb-3">
                {!showStatusPicker ? (
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => setShowStatusPicker(true)}
                            className="flex-1 bg-surface border border-cardBorder rounded-lg py-2 items-center flex-row justify-center gap-1.5"
                            activeOpacity={0.75}
                        >
                            <Ionicons name="swap-horizontal-outline" size={14} color={iconDim} />
                            <Text className="text-txt text-xs font-semibold">Change Status</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDelete}
                            className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg py-2 px-3 items-center"
                            activeOpacity={0.75}
                        >
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <Text className="text-txtMuted text-xs mb-2">Select new status:</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {Object.keys(STATUS_META).map(status => {
                                const meta = STATUS_META[status];
                                const active = feedback.status === status;
                                return (
                                    <TouchableOpacity
                                        key={status}
                                        onPress={() => handleStatusChange(status)}
                                        className="py-1.5 px-3 rounded-lg border"
                                        style={{
                                            backgroundColor: active ? meta.bg : 'transparent',
                                            borderColor: active ? meta.border : '#1F2937',
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Text className="text-xs font-semibold" style={{ color: active ? meta.color : '#6B7280' }}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity onPress={() => setShowStatusPicker(false)} className="mt-2 items-center py-1">
                            <Text className="text-txtMuted text-xs">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

export default function AdminFeedbackManagement() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user } = useAuth();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');

    const loadFeedback = useCallback(async () => {
        try {
            const filter = activeFilter !== 'All' ? { status: activeFilter } : {};
            const data = await getAllFeedback(filter);
            setFeedback(data.feedback || []);
        } catch (err) {
            console.error('Failed to load feedback:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter]);

    useEffect(() => {
        if (user?.role !== 'admin') { router.replace('/'); return; }
        loadFeedback();
    }, [user, activeFilter]);

    const onRefresh = () => { setRefreshing(true); loadFeedback(); };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">Loading feedback…</Text>
            </SafeAreaView>
        );
    }

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
                <View className="flex-row items-end justify-between">
                    <View>
                        <Text className="text-txt text-2xl font-bold">Feedback</Text>
                        <Text className="text-txtMuted text-xs mt-0.5">{feedback.length} {feedback.length !== 1 ? 'reports' : 'report'}</Text>
                    </View>
                </View>
            </View>

            {/* Status filter tabs */}
            <View className="flex-row px-5 py-3 border-b border-cardBorder gap-2">
                {FILTER_STATUSES.map(status => {
                    const active = activeFilter === status;
                    const meta = status !== 'All' ? STATUS_META[status] : null;
                    return (
                        <TouchableOpacity
                            key={status}
                            onPress={() => setActiveFilter(status)}
                            className="px-3 py-1.5 rounded-lg border"
                            style={{
                                backgroundColor: active ? (meta ? meta.bg : '#00D4AA18') : 'transparent',
                                borderColor: active ? (meta ? meta.border : '#00D4AA35') : '#1F2937',
                            }}
                            activeOpacity={0.75}
                        >
                            <Text
                                className="text-xs font-semibold"
                                style={{ color: active ? (meta ? meta.color : '#00D4AA') : '#6B7280' }}
                            >
                                {status}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Feedback list */}
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
            >
                {feedback.length === 0 ? (
                    <View className="items-center justify-center py-16">
                        <Ionicons name="document-text-outline" size={44} color={iconDim} />
                        <Text className="text-txt font-bold text-lg mt-4">No feedback found</Text>
                        <Text className="text-txtMuted text-sm mt-2 text-center">
                            {activeFilter !== 'All' ? `No ${activeFilter.toLowerCase()} reports` : 'No reports submitted yet'}
                        </Text>
                    </View>
                ) : (
                    feedback.map(item => (
                        <FeedbackCard
                            key={item.id}
                            feedback={item}
                            onStatusChange={loadFeedback}
                            onDelete={loadFeedback}
                        />
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
