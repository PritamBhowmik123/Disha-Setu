/**
 * app/profile.jsx
 * User Profile Page — Full DB fields, photo upload, civic level, stats, achievements
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useAuth } from '../context/AuthContext';
import { fetchMe } from '../services/authService';
import { fetchUserFeedback } from '../services/feedbackService';
import { apiFetch, BASE_URL } from '../services/api';
import { formatDate, formatRelativeTime } from '../utils/dateFormatter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Constants ─────────────────────────────────────────────────────
const CATEGORY_COLORS = {
    delay: '#F59E0B', safety: '#EF4444', noise: '#8B5CF6',
    traffic: '#F97316', corruption: '#EC4899', other: '#6B7280',
};

const STATUS_COLORS = {
    pending: { bg: '#F59E0B18', text: '#F59E0B', border: '#F59E0B30' },
    reviewed: { bg: '#6366F118', text: '#6366F1', border: '#6366F130' },
    resolved: { bg: '#10B98118', text: '#10B981', border: '#10B98130' },
    rejected: { bg: '#EF444418', text: '#EF4444', border: '#EF444430' },
};

const CIVIC_LEVEL_COLORS = {
    'Civic Newcomer': { color: '#6B7280', icon: 'person-outline' },
    'Active Reporter': { color: '#6366F1', icon: 'megaphone-outline' },
    'Community Leader': { color: '#F59E0B', icon: 'ribbon-outline' },
    'Civic Champion': { color: '#10B981', icon: 'trophy-outline' },
    'City Guardian': { color: '#00D4AA', icon: 'shield-checkmark-outline' },
};

const BADGES = [
    { id: 'first_report', label: 'First Reporter', icon: 'flag-outline', color: '#00D4AA', condition: (r) => r.length >= 1 },
    { id: 'verified', label: 'Verified Citizen', icon: 'shield-checkmark-outline', color: '#6366F1', condition: (r) => r.length >= 1 },
    { id: 'active', label: 'Active Citizen', icon: 'people-outline', color: '#F59E0B', condition: (r) => r.length >= 3 },
    { id: 'top_contributor', label: 'Top Contributor', icon: 'ribbon-outline', color: '#10B981', condition: (r, res) => res >= 5 },
    { id: 'voice', label: 'Community Voice', icon: 'megaphone-outline', color: '#F97316', condition: (r) => r.length >= 10 },
];

// ── Sub-components ────────────────────────────────────────────────
function StatPill({ icon, label, value, color }) {
    return (
        <View className="flex-1 bg-card rounded-2xl p-4 border border-cardBorder items-center">
            <View className="w-9 h-9 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: `${color}18` }}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text className="text-txt text-xl font-bold">{value}</Text>
            <Text className="text-txtMuted text-[10px] mt-0.5 text-center leading-3">{label}</Text>
        </View>
    );
}

function BadgeCard({ badge, earned }) {
    return (
        <View className="items-center mr-4 w-20" style={{ opacity: earned ? 1 : 0.3 }}>
            <View
                className="w-14 h-14 rounded-2xl items-center justify-center mb-2 border"
                style={{ backgroundColor: earned ? `${badge.color}18` : 'transparent', borderColor: earned ? `${badge.color}40` : '#374151' }}
            >
                <Ionicons name={badge.icon} size={24} color={earned ? badge.color : '#6B7280'} />
            </View>
            <Text className="text-txt text-[10px] font-semibold text-center leading-4">{badge.label}</Text>
        </View>
    );
}

function ReportCard({ report, isLast }) {
    const color = CATEGORY_COLORS[report.category] || '#6366F1';
    const s = STATUS_COLORS[(report.status || 'pending').toLowerCase()] || STATUS_COLORS['pending'];
    return (
        <View className={`py-3.5 flex-row items-start ${!isLast ? 'border-b border-cardBorder' : ''}`}>
            <View className="w-9 h-9 rounded-lg items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: `${color}18` }}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={color} />
            </View>
            <View className="flex-1">
                <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-txt font-semibold text-sm capitalize flex-1 mr-2" numberOfLines={1}>{report.category} issue</Text>
                    <View className="px-2 py-0.5 rounded-md border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
                        <Text className="text-[10px] font-bold capitalize" style={{ color: s.text }}>{report.status}</Text>
                    </View>
                </View>
                <Text className="text-txtMuted text-xs leading-4" numberOfLines={2}>{report.description}</Text>
                <Text className="text-txtMuted text-[10px] mt-1">{formatRelativeTime(report.created_at)}</Text>
            </View>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ProfileScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { user, login } = useAuth();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [profile, setProfile] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Edit state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [me, feedback] = await Promise.all([fetchMe(), fetchUserFeedback()]);
            setProfile(me);
            setReports(feedback);
        } catch (err) {
            console.error('[Profile] Load error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const onRefresh = () => { setRefreshing(true); loadData(); };

    // ── Avatar Upload ─────────────────────────────────────────────
    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Please allow access to your photo library in settings.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setAvatarUploading(true);
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('photo', {
                uri: asset.uri,
                name: 'avatar.jpg',
                type: 'image/jpeg',
            });
            const response = await fetch(`${BASE_URL}/auth/avatar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Upload failed');
            setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
            login({ ...user, avatar_url: data.avatar_url });
        } catch (err) {
            Alert.alert('Upload Failed', err.message);
        } finally {
            setAvatarUploading(false);
        }
    };

    // ── Edit Name (In-place) ──────────────────────────────────────
    const startEditing = () => { setEditName(profile?.name || ''); setIsEditingName(true); };

    const handleSaveName = async () => {
        if (!editName.trim()) return;
        setSaving(true);
        try {
            const updated = await apiFetch('/auth/me', {
                method: 'PATCH',
                body: JSON.stringify({ name: editName.trim() }),
            });
            setProfile(prev => ({ ...prev, name: updated.name }));
            login({ ...user, name: updated.name });
            setIsEditingName(false);
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to update name');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">Loading profile…</Text>
            </SafeAreaView>
        );
    }

    // ── Derived values ────────────────────────────────────────────
    const displayName = profile?.name || (profile?.is_guest ? 'Guest User' : 'DishaSetu User');
    const displayPhone = profile?.phone ? `+91 ${profile.phone}` : null;
    const avatarUrl = profile?.avatar_url;
    const civicLevel = profile?.civic_level || 'Civic Newcomer';
    const civicPoints = profile?.civic_points ?? 0;
    const memberSince = profile?.created_at ? formatDate(profile.created_at) : null;
    const lastUpdated = profile?.updated_at ? formatRelativeTime(profile.updated_at) : null;

    const resolvedCount = reports.filter(r => r.status === 'resolved').length;
    const pendingCount = reports.filter(r => r.status === 'pending').length;

    const lvlMeta = CIVIC_LEVEL_COLORS[civicLevel] || CIVIC_LEVEL_COLORS['Civic Newcomer'];
    const earnedBadges = BADGES.filter(b => b.condition(reports, resolvedCount));

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-cardBorder">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1.5">
                    <Ionicons name="arrow-back" size={20} color={iconDim} />
                    <Text className="text-txtMuted text-sm font-medium">Back</Text>
                </TouchableOpacity>
                <Text className="text-txt text-base font-bold">Profile</Text>
                <View className="w-10" /> 
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                contentContainerStyle={{ paddingBottom: 48 }}
            >
                {/* Hero Card */}
                <View className="mx-5 mt-5 rounded-2xl border border-cardBorder bg-card overflow-hidden">
                    <View style={{ height: 4, backgroundColor: lvlMeta.color }} />
                    <View className="p-5 items-center">
                        {/* Avatar with upload button */}
                        <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} className="relative">
                            {avatarUploading ? (
                                <View className="w-24 h-24 rounded-full items-center justify-center border-2" style={{ backgroundColor: '#00D4AA15', borderColor: '#00D4AA40' }}>
                                    <ActivityIndicator color="#00D4AA" />
                                </View>
                            ) : avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} className="w-24 h-24 rounded-full border-2 border-[#00D4AA]/40" />
                            ) : (
                                <View className="w-24 h-24 rounded-full items-center justify-center border-2" style={{ backgroundColor: `${lvlMeta.color}18`, borderColor: `${lvlMeta.color}40` }}>
                                    <Text style={{ fontSize: 36, color: lvlMeta.color }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            {/* Camera badge */}
                            <View
                                className="absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center border-2 border-card"
                                style={{ backgroundColor: '#00D4AA' }}
                            >
                                <Ionicons name="camera" size={13} color="#000" />
                            </View>
                        </TouchableOpacity>

                        {/* Name Section with In-place Edit */}
                        {isEditingName ? (
                            <View className="flex-row items-center gap-2 mt-4 px-4 w-full justify-center">
                                <TextInput
                                    className="flex-1 bg-surface border border-[#00D4AA]/40 rounded-xl px-4 py-2 text-txt text-lg font-bold text-center"
                                    value={editName}
                                    onChangeText={setEditName}
                                    autoFocus
                                    placeholder="Enter name"
                                    placeholderTextColor="#6B7280"
                                />
                                <TouchableOpacity 
                                    onPress={handleSaveName} 
                                    disabled={saving || !editName.trim()}
                                    className="w-10 h-10 rounded-full bg-[#00D4AA] items-center justify-center shadow-sm"
                                >
                                    {saving ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="checkmark" size={20} color="#000" />}
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setIsEditingName(false)} 
                                    className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-cardBorder shadow-sm"
                                >
                                    <Ionicons name="close" size={20} color={iconDim} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="flex-row items-center gap-2 mt-4">
                                <Text className="text-txt text-xl font-bold">{displayName}</Text>
                                <TouchableOpacity 
                                    onPress={startEditing}
                                    className="w-7 h-7 rounded-full bg-surface items-center justify-center border border-cardBorder shadow-sm"
                                >
                                    <Ionicons name="pencil" size={14} color="#00D4AA" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Phone */}
                        {displayPhone && (
                            <View className="flex-row items-center gap-1.5 mt-1">
                                <Ionicons name="call-outline" size={12} color={iconDim} />
                                <Text className="text-txtMuted text-sm">{displayPhone}</Text>
                            </View>
                        )}

                        {/* Civic Level badge */}
                        <View className="flex-row items-center gap-1.5 mt-3 px-3 py-1 rounded-full border"
                            style={{ backgroundColor: `${lvlMeta.color}18`, borderColor: `${lvlMeta.color}40` }}
                        >
                            <Ionicons name={lvlMeta.icon} size={13} color={lvlMeta.color} />
                            <Text className="text-xs font-bold" style={{ color: lvlMeta.color }}>{civicLevel}</Text>
                        </View>

                        {/* Civic Points */}
                        <View className="flex-row items-center gap-1.5 mt-2">
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text className="text-txtMuted text-xs font-semibold">
                                <Text className="text-txt font-bold">{civicPoints}</Text> civic points
                            </Text>
                        </View>

                        {/* Role & Meta */}
                        <View className="flex-row items-center gap-3 mt-4 pt-4 border-t border-cardBorder w-full justify-center">
                            <View className="flex-row items-center gap-1">
                                <Ionicons name={profile?.role === 'admin' ? 'shield-checkmark' : 'person-circle-outline'} size={13} color={iconDim} />
                                <Text className="text-txtMuted text-xs capitalize">{profile?.role || 'user'}</Text>
                            </View>
                            {memberSince && (
                                <>
                                    <View className="w-0.5 h-3 bg-cardBorder" />
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="calendar-outline" size={13} color={iconDim} />
                                        <Text className="text-txtMuted text-xs">Since {memberSince}</Text>
                                    </View>
                                </>
                            )}
                            {profile?.google_id && (
                                <>
                                    <View className="w-0.5 h-3 bg-cardBorder" />
                                    <View className="flex-row items-center gap-1">
                                        <Text style={{ fontSize: 12, color: '#EA4335', fontWeight: '700' }}>G</Text>
                                        <Text className="text-txtMuted text-xs">Google</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row gap-3 mx-5 mt-4">
                    <StatPill icon="chatbubbles-outline" label="Reports" value={reports.length} color="#6366F1" />
                    <StatPill icon="checkmark-circle-outline" label="Resolved" value={resolvedCount} color="#10B981" />
                    <StatPill icon="star-outline" label="Points" value={civicPoints} color="#F59E0B" />
                </View>

                {/* Achievements / Badges */}
                <View className="mx-5 mt-5">
                    <Text className="text-txtMuted text-xs font-semibold mb-3">ACHIEVEMENTS</Text>
                    <View className="bg-card rounded-2xl border border-cardBorder px-5 py-4">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View className="flex-row">
                                {BADGES.map(badge => (
                                    <BadgeCard
                                        key={badge.id}
                                        badge={badge}
                                        earned={earnedBadges.some(b => b.id === badge.id)}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                        {earnedBadges.length === 0 && (
                            <Text className="text-txtMuted text-xs text-center mt-2">File reports to earn badges!</Text>
                        )}
                    </View>
                </View>

                {/* Civic Impact */}
                <View className="mx-5 mt-5">
                    <Text className="text-txtMuted text-xs font-semibold mb-3">CIVIC IMPACT</Text>
                    <View className="bg-card rounded-2xl border border-cardBorder p-4">
                        <View className="flex-row items-center gap-3 mb-3">
                            <View className="w-10 h-10 rounded-xl bg-[#00D4AA]/10 items-center justify-center">
                                <Ionicons name="earth-outline" size={20} color="#00D4AA" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-txt font-bold text-sm">
                                    {resolvedCount > 0
                                        ? `${resolvedCount} issue${resolvedCount > 1 ? 's' : ''} resolved`
                                        : 'Start making an impact'}
                                </Text>
                                <Text className="text-txtMuted text-xs mt-0.5">
                                    {resolvedCount > 0 ? 'Your reports drive real civic change.' : 'File your first report to begin.'}
                                </Text>
                            </View>
                        </View>
                        {reports.length > 0 && (
                            <>
                                <View className="flex-row justify-between mb-1.5">
                                    <Text className="text-txtMuted text-xs">Resolution rate</Text>
                                    <Text className="text-[#00D4AA] text-xs font-bold">
                                        {Math.round((resolvedCount / reports.length) * 100)}%
                                    </Text>
                                </View>
                                <View className="h-2 bg-surface rounded-full overflow-hidden">
                                    <View
                                        className="h-full rounded-full bg-[#00D4AA]"
                                        style={{ width: `${Math.round((resolvedCount / reports.length) * 100)}%` }}
                                    />
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Recent Reports */}
                <View className="mx-5 mt-5">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-txtMuted text-xs font-semibold">RECENT REPORTS</Text>
                        {reports.length > 4 && (
                            <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
                                <Text className="text-[#00D4AA] text-xs font-semibold">View all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {reports.length === 0 ? (
                        <View className="bg-card rounded-2xl border border-cardBorder py-10 items-center">
                            <Ionicons name="document-text-outline" size={36} color={iconDim} />
                            <Text className="text-txt font-bold text-sm mt-3">No reports yet</Text>
                            <Text className="text-txtMuted text-xs mt-1">Report a civic issue and make your voice heard.</Text>
                            <TouchableOpacity
                                className="mt-4 px-5 py-2.5 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/30"
                                onPress={() => router.push('/feedback')}
                            >
                                <Text className="text-[#00D4AA] text-sm font-semibold">File a Report</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="bg-card rounded-2xl border border-cardBorder px-4">
                            {reports.slice(0, 5).map((r, idx) => (
                                <ReportCard key={r.id} report={r} isLast={idx === Math.min(reports.length, 5) - 1} />
                            ))}
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <View className="mx-5 mt-5">
                    <Text className="text-txtMuted text-xs font-semibold mb-3">QUICK ACTIONS</Text>
                    <View className="bg-card rounded-2xl border border-cardBorder overflow-hidden">
                        {[
                            { icon: 'megaphone-outline', label: 'Submit Feedback', color: '#6366F1', route: '/feedback' },
                            { icon: 'bar-chart-outline', label: 'My Activity', color: '#F59E0B', route: '/(tabs)/activity' },
                            { icon: 'settings-outline', label: 'Settings', color: '#00D4AA', route: '/(tabs)/settings' },
                        ].map((item, idx, arr) => (
                            <TouchableOpacity
                                key={item.route}
                                className={`flex-row items-center px-4 py-4 ${idx !== arr.length - 1 ? 'border-b border-cardBorder' : ''}`}
                                onPress={() => router.push(item.route)}
                                activeOpacity={0.7}
                            >
                                <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${item.color}15` }}>
                                    <Ionicons name={item.icon} size={18} color={item.color} />
                                </View>
                                <Text className="text-txt font-medium text-sm flex-1">{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={iconDim} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Footer meta */}
                {lastUpdated && (
                    <Text className="text-center text-txtMuted text-[10px] mt-5">
                        Last updated {lastUpdated}
                    </Text>
                )}
            </ScrollView>

            {/* Edit modal removed - replaced with in-place editing above */}
        </SafeAreaView>
    );
}
