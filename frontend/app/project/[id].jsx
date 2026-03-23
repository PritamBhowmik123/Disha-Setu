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
import { formatDate } from '../../utils/dateFormatter';

import { fetchProjectById, fetchProjectUpdates, fetchProjectFeedback } from '../../services/projectService';

import { fetchProjectById, fetchProjectUpdates, fetchNewsImpact } from '../../services/projectService';

import { fetchBuildings } from '../../services/indoorNavigationService';
import { CATEGORY_ICONS } from '../../constants/mockData';
import { subscribeToProject, unsubscribeFromProject, onProjectUpdate } from '../../services/socketService';
import NewsImpactCard from '../../components/NewsImpactCard';

const STATUS_STYLE = {
    'In Progress': { bg: '#00D4AA18', text: '#00D4AA', border: '#00D4AA35' },
    'Completed': { bg: '#10B98118', text: '#10B981', border: '#10B98135' },
    'Delayed': { bg: '#EF444418', text: '#EF4444', border: '#EF444435' },
    'Planned': { bg: '#6366F118', text: '#6366F1', border: '#6366F135' },
};

function ProgressBar({ value, color }) {
    return (
        <View className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        </View>
    );
}

function InfoRow({ label, value, iconName, iconType = 'ion' }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    return (
        <View className="flex-row items-center py-3 border-b border-cardBorder last:border-0">
            <View className="w-8 h-8 rounded-lg bg-surface items-center justify-center mr-3">
                {iconType === 'ion'
                    ? <Ionicons name={iconName} size={16} color={iconDim} />
                    : <MaterialIcons name={iconName} size={16} color={iconDim} />
                }
            </View>
            <Text className="text-txtMuted text-xs flex-1">{label}</Text>
            <Text className="text-txt text-sm font-semibold ml-2 text-right" numberOfLines={2} style={{ maxWidth: '55%' }}>{value || '–'}</Text>
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

    const [reviews, setReviews] = useState([]);

    const [newsImpactData, setNewsImpactData] = useState(null);

    const [loading, setLoading] = useState(true);
    const [liveUpdate, setLiveUpdate] = useState(null);
    const [building, setBuilding] = useState(null);

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
                if (supported) return Linking.openURL(url);
                return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${project.lat},${project.lng}`);
            })
            .catch(() => Alert.alert('Error', 'Could not open navigation'));
    };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [proj, upds, revs] = await Promise.all([
                fetchProjectById(id),
                fetchProjectUpdates(id),
                fetchProjectFeedback(id)
            ]);
            setProject(proj);
            setUpdates(upds);

            setReviews(revs);


            // Transform official database updates and civic impact into "articles" for the NLP engine
            const officialArticles = [];
            if (proj.civic_impact) {
                officialArticles.push({
                    title: `Official Project Impact Overview`,
                    content: `${proj.civic_impact}. Capacity: ${proj.beneficiaries || ''} ${proj.impact_stat || ''}`,
                    url: null
                });
            }
            if (upds && upds.length > 0) {
                upds.forEach(u => {
                    officialArticles.push({
                        title: `Official Status Update: ${u.title}`,
                        content: u.body,
                        url: null
                    });
                });
            }

            fetchNewsImpact(proj.id, proj.name, proj.area, officialArticles)
                .then(res => {
                    setNewsImpactData(res || { found: false, articles: [] });
                })
                .catch(err => console.log('NLP Engine Error:', err));


            try {
                const buildings = await fetchBuildings();
                const projectBuilding = buildings.find(b => b.project_id === id);
                if (projectBuilding) setBuilding(projectBuilding);
            } catch { }
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to load project');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
        subscribeToProject(id);
        const unsubscribe = onProjectUpdate((payload) => {
            if (payload.projectId === id) {
                setLiveUpdate(payload);
                fetchProjectById(id).then(setProject).catch(() => { });
            }
        });
        return () => { unsubscribeFromProject(id); if (unsubscribe) unsubscribe(); };
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
                <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

                {/* Back nav */}
                <View className="px-4 pt-4 pb-2 flex-row items-center gap-1">
                    <TouchableOpacity className="flex-row items-center gap-1 py-1" onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={18} color={iconDim} />
                        <Text className="text-txtMuted font-medium text-sm">{t('common.back')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Live update strip */}
                {liveUpdate && (
                    <View className="mx-4 mb-3 flex-row items-center gap-2 bg-[#00D4AA]/8 border border-[#00D4AA]/25 rounded-xl px-4 py-2.5">
                        <View className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
                        <Text className="text-[#00D4AA] text-xs font-semibold flex-1">{liveUpdate.title}</Text>
                    </View>
                )}

                {/* Project header */}
                <View className="px-4 pb-4">
                    <View className="flex-row items-start gap-3 mb-4">
                        <View className="w-14 h-14 rounded-xl bg-card items-center justify-center border border-cardBorder">
                            <MaterialIcons name={iconName} size={28} color={s.text} />
                        </View>
                        <View className="flex-1">
                            <View
                                className="self-start flex-row items-center gap-1 rounded-md px-2.5 py-1 mb-2"
                                style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border }}
                            >
                                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.text }} />
                                <Text style={{ color: s.text }} className="text-xs font-bold">{project.status}</Text>
                            </View>
                            <Text className="text-txt text-lg font-bold leading-6">{project.name}</Text>
                        </View>
                    </View>

                    {/* Progress card */}
                    <View className="bg-card rounded-xl p-4 border border-cardBorder mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-txtMuted text-sm">{t('project.overall_completion')}</Text>
                            <Text style={{ color: s.text }} className="text-xl font-bold">{progress}%</Text>
                        </View>
                        <ProgressBar value={progress} color={s.text} />
                        <View className="flex-row items-center gap-1 mt-2">
                            <Ionicons name="time-outline" size={11} color={iconDim} />
                            <Text className="text-txtMuted text-xs">
                                {t('project.last_updated')}: {formatDate(project.last_updated)}
                            </Text>
                        </View>
                    </View>

                    {/* Delay reason */}
                    {project.delay_reason && (
                        <View className="bg-[#EF4444]/8 rounded-xl p-4 border border-[#EF4444]/25 mb-4 flex-row items-start gap-3">
                            <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginTop: 1 }} />
                            <View className="flex-1">
                                <Text className="text-[#EF4444] font-semibold text-sm mb-1">{t('project.delay_reason')}</Text>
                                <Text className="text-[#FCA5A5] text-sm leading-5">{project.delay_reason}</Text>
                            </View>
                        </View>
                    )}

                    {/* Info grid — now horizontal list rows */}
                    <View className="bg-card rounded-xl px-4 border border-cardBorder mb-4">
                        <InfoRow label={t('project.department')} value={project.department} iconName="business-outline" iconType="ion" />
                        <InfoRow label={t('project.budget')} value={project.budget_display} iconName="cash-outline" iconType="ion" />
                        <InfoRow label={t('project.started')} value={formatDate(project.start_date)} iconName="calendar-outline" iconType="ion" />
                        <InfoRow label={t('project.expected')} value={project.completion_display} iconName="flag-outline" iconType="ion" />
                        <InfoRow label={t('project.contractor')} value={project.contractor} iconName="construct-outline" iconType="ion" />
                    </View>
                </View>

                {/* Civic Impact */}
                {project.civic_impact && (
                    <View className="mx-4 mb-4 bg-card rounded-xl p-4 border border-l-2 border-cardBorder" style={{ borderLeftColor: '#00D4AA', borderLeftWidth: 3 }}>
                        <View className="flex-row items-center gap-2 mb-2">
                            <Ionicons name="leaf-outline" size={15} color="#00D4AA" />
                            <Text className="text-[#00D4AA] font-semibold text-sm">{t('project.civic_impact')}</Text>
                        </View>
                        <Text className="text-txt text-sm leading-6 mb-3">{project.civic_impact}</Text>
                        <View className="flex-row gap-3">
                            <View className="flex-1 bg-surface rounded-lg p-3 items-center">
                                <Text className="text-[#00D4AA] text-base font-bold">{project.impact_stat || '–'}</Text>
                                <Text className="text-txtMuted text-[10px] text-center mt-0.5">Key Impact</Text>
                            </View>
                            <View className="flex-1 bg-surface rounded-lg p-3 items-center">
                                <Text className="text-[#00D4AA] text-base font-bold" numberOfLines={1} adjustsFontSizeToFit>{project.beneficiaries || '–'}</Text>
                                <Text className="text-txtMuted text-[10px] text-center mt-0.5">{t('project.beneficiaries')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* --- AI News Impact Extraction Engine --- */}
                {newsImpactData && <NewsImpactCard data={newsImpactData} />}

                {/* Timeline */}
                {milestones.length > 0 && (
                    <View className="mx-4 mb-4">
                        <View className="flex-row items-center gap-2 mb-3">
                            <Text className="text-txt font-bold text-base">{t('project.timeline')}</Text>
                        </View>
                        <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                            {milestones.map((m, i) => (
                                <View
                                    key={m.id || i}
                                    className="flex-row items-center px-4 py-3"
                                    style={{ borderBottomWidth: i < milestones.length - 1 ? 1 : 0, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' }}
                                >
                                    <View className="items-center mr-3">
                                        <View className="w-7 h-7 rounded-lg items-center justify-center"
                                            style={{ backgroundColor: m.completed ? '#00D4AA18' : (isDark ? '#1F2937' : '#F3F4F6') }}>
                                            <Ionicons
                                                name={m.completed ? 'checkmark-circle-outline' : 'time-outline'}
                                                size={16}
                                                color={m.completed ? '#00D4AA' : iconDim}
                                            />
                                        </View>
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-sm font-medium ${m.completed ? 'text-txt' : 'text-txtMuted'}`}>{m.title}</Text>
                                        <Text className="text-txtMuted text-xs mt-0.5">{formatDate(m.date || m.target_date)}</Text>
                                    </View>
                                    {m.completed && (
                                        <View className="border border-[#00D4AA]/50 rounded-md px-2 py-0.5">
                                            <Text className="text-[#00D4AA] text-[10px] font-bold">Done</Text>
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
                        <Text className="text-txt font-bold text-base mb-3">{t('project.recent_updates')}</Text>
                        <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                            {updates.slice(0, 3).map((u, i) => (
                                <View key={u.id} className="px-4 py-3"
                                    style={{ borderBottomWidth: i < Math.min(updates.length, 3) - 1 ? 1 : 0, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' }}>
                                    <Text className="text-txt font-semibold text-sm mb-1">{u.title}</Text>
                                    {u.body && <Text className="text-txtMuted text-xs leading-5">{u.body}</Text>}
                                    <Text className="text-txtMuted text-[10px] mt-1.5">{formatDate(u.created_at)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Location */}
                <View className="mx-4 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-txt font-bold text-base">{t('project.location')}</Text>
                        {distance !== null && (
                            <View className="flex-row items-center gap-1 bg-[#00D4AA]/10 px-2.5 py-1 rounded-md">
                                <Ionicons name="navigate-outline" size={12} color="#00D4AA" />
                                <Text className="text-[#00D4AA] text-xs font-semibold">
                                    {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`} away
                                </Text>
                            </View>
                        )}
                    </View>
                    {/* Simplified location card */}
                    <View className="bg-card rounded-xl p-4 border border-cardBorder mb-3">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-lg bg-[#00D4AA]/10 items-center justify-center">
                                <MaterialIcons name={iconName} size={20} color="#00D4AA" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-txt font-semibold text-sm">{project.area}</Text>
                                {project.lat && project.lng && (
                                    <Text className="text-txtMuted text-xs mt-0.5 font-mono">{project.lat.toFixed(5)}, {project.lng.toFixed(5)}</Text>
                                )}
                            </View>
                        </View>
                    </View>


                    {building && (
                        <TouchableOpacity
                            className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-xl py-3 items-center flex-row justify-center gap-2 mb-3"
                            onPress={() => router.push(`/indoor/${building.id}`)}
                            activeOpacity={0.85}
                        >
                            <MaterialIcons name="map" size={18} color="#8B5CF6" />
                            <Text className="text-[#8B5CF6] font-semibold text-sm">Indoor Navigation</Text>
                        </TouchableOpacity>
                    )}


                    <TouchableOpacity
                        className="bg-[#4285F4] rounded-xl py-3 items-center flex-row justify-center gap-2"
                        onPress={openNavigation}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="navigate-outline" size={18} color="#FFF" />
                        <Text className="text-white font-semibold text-sm">{t('project.get_directions')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Public Reviews */}
                <View className="mx-4 mb-4">
                    <Text className="text-txt font-bold text-base mb-3">{t('project.public_reviews', 'Public Reviews')}</Text>
                    {reviews.length > 0 ? (
                        <View className="bg-card rounded-xl border border-cardBorder overflow-hidden">
                            {reviews.map((r, i) => {
                                let st = { bg: '#6B728018', text: '#6B7280', border: '#6B728035' }; // Pending / Default
                                if (r.status === 'Resolved') st = { bg: '#10B98118', text: '#10B981', border: '#10B98135' };
                                else if (r.status === 'Under Review') st = { bg: '#F59E0B18', text: '#F59E0B', border: '#F59E0B35' };

                                const icon = CATEGORY_ICONS[r.category] || 'report-problem';
                                return (
                                    <View key={r.ticket_id} className="p-4" style={{ borderBottomWidth: i < reviews.length - 1 ? 1 : 0, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' }}>
                                        <View className="flex-row items-start justify-between mb-2">
                                            <View className="flex-row items-center gap-2">
                                                <MaterialIcons name={icon} size={16} color={iconDim} />
                                                <Text className="text-txt font-semibold text-sm capitalize">{r.category}</Text>
                                            </View>
                                            <View className="flex-row items-center gap-1.5 rounded-md px-2 py-0.5 border" style={{ backgroundColor: st.bg, borderColor: st.border }}>
                                                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.text }} />
                                                <Text style={{ color: st.text }} className="text-[10px] font-bold">{r.status}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-txtMuted text-sm leading-5 mb-2">{r.description}</Text>
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-txtMuted text-[10px]">{formatDate(r.created_at)}</Text>
                                            {r.user_name && <Text className="text-txtMuted text-[10px] font-medium text-right capitalize">By {r.user_name}</Text>}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="bg-card rounded-xl border border-cardBorder p-6 items-center justify-center">
                            <Ionicons name="chatbubbles-outline" size={24} color={iconDim} />
                            <Text className="text-txtMuted text-sm mt-2 text-center">No reviews yet for this project</Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View className="px-4 flex-row gap-3">
                    <TouchableOpacity
                        className="flex-1 bg-card rounded-xl py-3.5 items-center border border-cardBorder flex-row justify-center gap-2"
                        onPress={() => router.push({ pathname: '/feedback', params: { projectId: project.id, projectName: project.name } })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                        <Text className="text-txt font-semibold text-sm">{t('project.report_issue')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-[#00D4AA] rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                        onPress={() => router.push({ pathname: '/feedback', params: { projectId: project.id, projectName: project.name } })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color="#000" />
                        <Text className="text-black font-semibold text-sm">{t('project.give_feedback')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
