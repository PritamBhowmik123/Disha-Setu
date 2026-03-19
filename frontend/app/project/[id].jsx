/**
 * app/project/[id].jsx — Real project detail from backend + Socket.io live updates
 */
import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useLocation } from '../../hooks/use-location';
import { haversineKm } from '../../utils/distance';
import { fetchProjectById, fetchProjectUpdates } from '../../services/projectService';
import { fetchBuildings } from '../../services/indoorNavigationService';
import { CATEGORY_ICONS } from '../../constants/mockData';
import { subscribeToProject, unsubscribeFromProject, onProjectUpdate } from '../../services/socketService';

const STATUS_STYLE = {
    'In Progress': { bg: '#00D4AA20', text: '#00D4AA', border: '#00D4AA40' },
    'Completed': { bg: '#10B98120', text: '#10B981', border: '#10B98140' },
    'Delayed': { bg: '#EF444420', text: '#EF4444', border: '#EF444440' },
    'Planned': { bg: '#6366F120', text: '#6366F1', border: '#6366F140' },
};

function ProgressBar({ value, color }) {
    return (
        <View className="w-full h-3 bg-[#1F2937] rounded-full overflow-hidden">
            <View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        </View>
    );
}

function InfoCard({ label, value, iconName, iconType = 'ion' }) {
    return (
        <View className="flex-1 bg-[#1A2035] rounded-2xl p-3 items-center mx-1">
            {iconType === 'ion'
                ? <Ionicons name={iconName} size={18} color="#9CA3AF" />
                : <MaterialIcons name={iconName} size={18} color="#9CA3AF" />
            }
            <Text className="text-white font-bold text-sm mt-1 text-center" numberOfLines={2}>{value || '–'}</Text>
            <Text className="text-[#6B7280] text-xs mt-0.5">{label}</Text>
        </View>
    );
}

export default function ProjectDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const { coords } = useLocation();

    const [project, setProject] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveUpdate, setLiveUpdate] = useState(null);
    const [building, setBuilding] = useState(null);

    // Calculate distance from user to project
    const distance = coords && project?.lat && project?.lng
        ? haversineKm(coords.lat, coords.lng, project.lat, project.lng)
        : null;

    const openNavigation = () => {
        if (!project?.lat || !project?.lng) {
            Alert.alert('Location unavailable', 'GPS coordinates not available for this project');
            return;
        }

        const label = encodeURIComponent(project.name);
        const url = Platform.select({
            ios: `maps://app?daddr=${project.lat},${project.lng}&q=${label}`,
            android: `google.navigation:q=${project.lat},${project.lng}`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${project.lat},${project.lng}&destination_place_id=${label}`,
        });

        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    // Fallback to Google Maps web
                    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${project.lat},${project.lng}`;
                    return Linking.openURL(webUrl);
                }
            })
            .catch(() => Alert.alert('Error', 'Could not open navigation'));
    };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [proj, upds] = await Promise.all([
                fetchProjectById(id),
                fetchProjectUpdates(id),
            ]);
            setProject(proj);
            setUpdates(upds);

            // Check if this project has indoor navigation
            try {
                const buildings = await fetchBuildings();
                const projectBuilding = buildings.find(b => b.project_id === id);
                if (projectBuilding) {
                    setBuilding(projectBuilding);
                }
            } catch (err) {
                // Indoor navigation not available, silently ignore
                console.log('Indoor navigation not available for this project');
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to load project');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
        // Subscribe to real-time project updates
        subscribeToProject(id);
        const unsubscribe = onProjectUpdate((payload) => {
            if (payload.projectId === id) {
                setLiveUpdate(payload);
                // Refresh full project after update
                fetchProjectById(id).then(setProject).catch(() => { });
            }
        });
        return () => {
            unsubscribeFromProject(id);
            if (unsubscribe) unsubscribe();
        };
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-3 text-sm">{t('common.loading')}</Text>
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center px-8">
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text className="text-txt font-bold text-lg mt-4">{t('project.not_found')}</Text>
                <TouchableOpacity className="mt-6 bg-card px-6 py-3 rounded-xl border border-cardBorder" onPress={() => router.back()}>
                    <Text className="text-txt font-semibold">{t('common.back')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const s = STATUS_STYLE[project.status] || STATUS_STYLE['In Progress'];
    const iconName = CATEGORY_ICONS[project.category] || 'construction';
    const progress = project.progress_percentage ?? 0;
    const milestones = project.milestones || [];

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-4 pt-4 pb-6">
                    <TouchableOpacity
                        className="flex-row items-center mb-4 gap-1"
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color="#00D4AA" />
                        <Text className="text-[#00D4AA] font-semibold">{t('common.back')}</Text>
                    </TouchableOpacity>

                    {/* Live update banner */}
                    {liveUpdate && (
                        <View className="bg-[#00D4AA]/10 border border-[#00D4AA]/30 rounded-2xl p-3 mb-4 flex-row items-center">
                            <Ionicons name="flash" size={16} color="#00D4AA" style={{ marginRight: 8 }} />
                            <Text className="text-[#00D4AA] text-sm font-semibold flex-1">{liveUpdate.title}</Text>
                        </View>
                    )}

                    <View className="flex-row items-start mb-4">
                        <View className="w-16 h-16 rounded-2xl bg-card items-center justify-center mr-4 border border-cardBorder">
                            <MaterialIcons name={iconName} size={32} color={s.text} />
                        </View>
                        <View className="flex-1">
                            <View style={{ backgroundColor: s.bg, borderColor: s.border, borderWidth: 1 }} className="rounded-full px-3 py-1 self-start mb-2 flex-row items-center gap-1">
                                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.text }} />
                                <Text style={{ color: s.text }} className="text-xs font-bold">{project.status}</Text>
                            </View>
                            <Text className="text-txt text-xl font-bold leading-6">{project.name}</Text>
                        </View>
                    </View>

                    {/* Completion */}
                    <View className="bg-card rounded-2xl p-4 border border-cardBorder mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-txtMuted text-sm font-medium">{t('project.overall_completion')}</Text>
                            <Text style={{ color: s.text }} className="text-2xl font-bold">{progress}%</Text>
                        </View>
                        <ProgressBar value={progress} color={s.text} />
                        <View className="flex-row items-center gap-1 mt-2">
                            <Ionicons name="time-outline" size={11} color={iconDim} />
                            <Text className="text-txtMuted text-xs">{t('project.last_updated')}: {project.last_updated ? new Date(project.last_updated).toLocaleDateString() : '–'}</Text>
                        </View>
                    </View>

                    {/* Delay reason */}
                    {project.delay_reason && (
                        <View className="bg-[#EF444415] rounded-2xl p-4 border border-[#EF4444]/30 mb-4 flex-row items-start">
                            <Ionicons name="warning" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                            <View className="flex-1">
                                <Text className="text-[#EF4444] font-bold text-sm mb-1">{t('project.delay_reason')}</Text>
                                <Text className="text-[#FCA5A5] text-sm leading-5">{project.delay_reason}</Text>
                            </View>
                        </View>
                    )}

                    {/* Quick info grid */}
                    <View className="flex-row mb-3">
                        <InfoCard label={t('project.department')} value={project.department} iconName="business-outline" iconType="ion" />
                        <InfoCard label={t('project.budget')} value={project.budget_display} iconName="cash-outline" iconType="ion" />
                    </View>
                    <View className="flex-row mb-4">
                        <InfoCard label={t('project.started')} value={project.start_date} iconName="calendar-outline" iconType="ion" />
                        <InfoCard label={t('project.expected')} value={project.completion_display} iconName="flag-outline" iconType="ion" />
                    </View>

                    {/* Contractor */}
                    <View className="bg-card rounded-2xl p-3 border border-cardBorder mb-4 flex-row items-center">
                        <Ionicons name="construct-outline" size={20} color={iconDim} style={{ marginRight: 12 }} />
                        <View>
                            <Text className="text-txtMuted text-xs">{t('project.contractor')}</Text>
                            <Text className="text-txt font-semibold text-sm">{project.contractor || '–'}</Text>
                        </View>
                    </View>
                </View>

                {/* Civic Impact */}
                {project.civic_impact && (
                    <View className="mx-4 mb-4 bg-[#00D4AA15] rounded-3xl p-5 border border-[#00D4AA]/20">
                        <View className="flex-row items-center gap-2 mb-3">
                            <Ionicons name="leaf" size={16} color="#00D4AA" />
                            <Text className="text-[#00D4AA] font-bold text-sm uppercase tracking-wider">{t('project.civic_impact')}</Text>
                        </View>
                        <Text className="text-txt text-sm leading-6 mb-4">{project.civic_impact}</Text>
                        <View className="flex-row gap-3">
                            <View className="flex-1 bg-surface rounded-2xl p-3 items-center">
                                <Text className="text-[#00D4AA] text-lg font-bold">{project.impact_stat || '–'}</Text>
                                <Text className="text-txtMuted text-xs text-center mt-1">Key Impact</Text>
                            </View>
                            <View className="flex-1 bg-surface rounded-2xl p-3 items-center">
                                <Text className="text-[#00D4AA] text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>{project.beneficiaries || '–'}</Text>
                                <Text className="text-txtMuted text-xs text-center mt-1">{t('project.beneficiaries')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Timeline (milestones) */}
                {milestones.length > 0 && (
                    <View className="mx-4 mb-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="git-branch-outline" size={18} color={iconDim} />
                            <Text className="text-txt font-bold text-base">{t('project.timeline')}</Text>
                        </View>
                        <View className="bg-card rounded-3xl border border-cardBorder overflow-hidden">
                            {milestones.map((m, i) => (
                                <View
                                    key={m.id || i}
                                    className="flex-row items-center p-4"
                                    style={{ borderBottomWidth: i < milestones.length - 1 ? 1 : 0, borderBottomColor: '#1F2937' }}
                                >
                                    <View className="items-center mr-4" style={{ width: 32 }}>
                                        <View className="w-8 h-8 rounded-full items-center justify-center"
                                            style={{ backgroundColor: m.completed ? '#00D4AA20' : '#1F2937' }}>
                                            <Ionicons
                                                name={m.completed ? 'checkmark-circle' : 'time-outline'}
                                                size={18}
                                                color={m.completed ? '#00D4AA' : iconDim}
                                            />
                                        </View>
                                        {i < milestones.length - 1 && (
                                            <View className="w-0.5 h-4 mt-1" style={{ backgroundColor: m.completed ? '#00D4AA' : '#1F2937' }} />
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`font-semibold text-sm ${m.completed ? 'text-txt' : 'text-txtMuted'}`}>{m.title}</Text>
                                        <View className="flex-row items-center gap-1 mt-0.5">
                                            <Ionicons name="calendar-outline" size={10} color={iconDim} />
                                            <Text className="text-txtMuted text-xs">{m.date || m.target_date}</Text>
                                        </View>
                                    </View>
                                    {m.completed && (
                                        <View className="bg-[#00D4AA] rounded-full px-2 py-0.5">
                                            <Text className="text-main text-xs font-bold">Done</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Recent Updates */}
                {updates.length > 0 && (
                    <View className="mx-4 mb-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="pulse-outline" size={18} color={iconDim} />
                            <Text className="text-txt font-bold text-base">{t('project.recent_updates')}</Text>
                        </View>
                        <View className="bg-card rounded-3xl border border-cardBorder overflow-hidden">
                            {updates.slice(0, 3).map((u, i) => (
                                <View key={u.id} className="p-4" style={{ borderBottomWidth: i < updates.length - 1 ? 1 : 0, borderBottomColor: '#1F2937' }}>
                                    <Text className="text-txt font-semibold text-sm mb-1">{u.title}</Text>
                                    {u.body && <Text className="text-txtMuted text-sm leading-5">{u.body}</Text>}
                                    <Text className="text-[#6B7280] text-xs mt-2">{new Date(u.created_at).toLocaleDateString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Location */}
                <View className="mx-4 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                            <Ionicons name="location-outline" size={18} color={iconDim} />
                            <Text className="text-txt font-bold text-base">{t('project.location')}</Text>
                        </View>
                        {distance !== null && (
                            <View className="bg-[#00D4AA]/20 px-3 py-1 rounded-full flex-row items-center gap-1">
                                <Ionicons name="navigate" size={12} color="#00D4AA" />
                                <Text className="text-[#00D4AA] text-xs font-bold">
                                    {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`} away
                                </Text>
                            </View>
                        )}
                    </View>
                    <View className="bg-card rounded-3xl h-36 border border-cardBorder items-center justify-center overflow-hidden relative mb-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <View key={`v-${i}`} className="absolute top-0 w-px h-full bg-cardBorder" style={{ left: `${(i + 1) * 20}%` }} />
                        ))}
                        {Array.from({ length: 3 }).map((_, i) => (
                            <View key={`h-${i}`} className="absolute left-0 h-px w-full bg-cardBorder" style={{ top: `${(i + 1) * 25}%` }} />
                        ))}
                        <View className="w-10 h-10 rounded-full bg-[#00D4AA] items-center justify-center z-10"
                            style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 }}>
                            <MaterialIcons name={iconName} size={18} color="#000" />
                        </View>
                        <Text className="text-txtMuted text-xs mt-2 z-10 bg-main/80 px-2 py-0.5 rounded-full">{project.area}</Text>
                        {project.lat && project.lng && (
                            <Text className="text-txtMuted text-[10px] mt-1 z-10 font-mono">{project.lat.toFixed(4)}, {project.lng.toFixed(4)}</Text>
                        )}
                    </View>

                    {/* Indoor Navigation Button (if building has indoor maps) */}
                    {building && (
                        <TouchableOpacity
                            className="bg-[#8B5CF6] rounded-2xl py-3 items-center flex-row justify-center gap-2 mt-3"
                            style={{ shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
                            onPress={() => router.push(`/indoor/${building.id}`)}
                            activeOpacity={0.85}
                        >
                            <MaterialIcons name="map" size={20} color="#FFF" />
                            <Text className="text-white font-bold text-sm">Indoor Navigation</Text>
                            <View className="bg-white/20 px-2 py-0.5 rounded-full ml-1">
                                <Text className="text-white text-[10px] font-bold">NEW</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Get Directions Button */}
                    {/* Get Directions Button */}
                    <TouchableOpacity
                        className="bg-[#4285F4] rounded-2xl py-3 items-center flex-row justify-center gap-2"
                        style={{ shadowColor: '#4285F4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
                        onPress={openNavigation}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="navigate" size={20} color="#FFF" />
                        <Text className="text-white font-bold text-sm">{t('project.get_directions')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Actions */}
                <View className="px-4 mb-8 flex-row gap-3">
                    <TouchableOpacity
                        className="flex-1 bg-card rounded-2xl py-4 items-center border border-cardBorder"
                        onPress={() => router.push({ pathname: '/feedback', params: { projectId: project.id, projectName: project.name } })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="alert-circle-outline" size={22} color="#EF4444" style={{ marginBottom: 4 }} />
                        <Text className="text-txt font-bold text-sm">{t('project.report_issue')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-[#00D4AA] rounded-2xl py-4 items-center"
                        style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
                        onPress={() => router.push({ pathname: '/feedback', params: { projectId: project.id, projectName: project.name } })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="chatbubble-outline" size={22} color="#000" style={{ marginBottom: 4 }} />
                        <Text className="text-main font-bold text-sm">{t('project.give_feedback')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
