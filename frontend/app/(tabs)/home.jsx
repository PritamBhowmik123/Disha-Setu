/**
 * app/(tabs)/home.jsx — Real project feed from backend
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocation } from '../../hooks/use-location';
import { formatDistance, haversineKm } from '../../utils/distance';
import LocationPickerModal from '../../components/location-picker';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { fetchProjects } from '../../services/projectService';
import { emitLocation } from '../../services/socketService';
import { CATEGORY_ICONS } from '../../constants/mockData';
import { useTranslation } from 'react-i18next';

function ProjectCard({ project, onPress }) {
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const progress = project.progress_percentage ?? project.progress ?? 0;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            className="bg-card rounded-3xl overflow-hidden mb-6 border border-cardBorder"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 }}
        >
            <View className="relative h-48 w-full">
                <Image source={{ uri: project.image_url || project.image }} className="w-full h-full" />
                <View className="absolute inset-0 bg-black/30" />
                <View className="absolute top-4 left-4 flex-row">
                    <View className="bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20 mr-2">
                        <Text className="text-white text-xs font-bold">{project.category}</Text>
                    </View>
                </View>
                <View className="absolute top-4 right-4 bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20 flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-[#00D4AA] mr-2" />
                    <Text className="text-white text-xs font-bold">{project.status}</Text>
                </View>
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <View className="h-full bg-[#00D4AA]" style={{ width: `${progress}%` }} />
                </View>
            </View>

            <View className="p-5">
                <Text className="text-txt text-xl font-bold mb-1" numberOfLines={2}>{project.name}</Text>
                <View className="flex-row items-center mb-4 mt-2">
                    <Ionicons name="location" size={14} color={iconDim} />
                    <Text className="text-txtMuted text-sm ml-1 flex-1" numberOfLines={1}>{project.area}</Text>
                    {project.distance_m != null && (
                        <View className="bg-surface px-2 py-1 rounded-md ml-2 flex-row items-center">
                            <Ionicons name="navigate" size={10} color="#00D4AA" />
                            <Text className="text-[#00D4AA] text-[10px] font-bold ml-1">
                                {project.distance_m < 1000 ? `${project.distance_m}m` : `${(project.distance_m / 1000).toFixed(1)}km`}
                            </Text>
                        </View>
                    )}
                </View>
                <View className="flex-row items-center justify-between pt-4 border-t border-cardBorder">
                    <View>
                        <Text className="text-txtMuted text-xs mb-1 uppercase tracking-wider font-semibold">{t('home.budget')}</Text>
                        <Text className="text-txt font-bold">{project.budget_display || project.budget}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-txtMuted text-xs mb-1 uppercase tracking-wider font-semibold">{t('home.completion')}</Text>
                        <Text className="text-[#00D4AA] font-bold">{project.completion_display || project.expectedCompletion}</Text>
                    </View>
                </View>
                <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-txtMuted text-xs">Dept: {project.department}</Text>
                    <Text className="text-txtMuted text-xs">ID: {project.id?.slice(0, 8)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState('list');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [locationFilter, setLocationFilter] = useState(null); // name of manually-selected location
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const { coords, label, mode, startGPS, setManual, accuracy } = useLocation();

    const loadProjects = useCallback(async (lat, lng) => {
        try {
            const data = await fetchProjects({ lat, lng });
            setProjects(data);
        } catch (err) {
            console.error('[Home] fetchProjects error:', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadProjects(coords?.lat, coords?.lng);
        // Also send location to backend for geo-fencing
        if (coords) emitLocation(coords.lat, coords.lng);
    }, [coords]);

    const onRefresh = () => {
        setRefreshing(true);
        loadProjects(coords?.lat, coords?.lng);
    };

    const handleManualSelection = (lat, lng, name) => {
        setManual({ lat, lng, label: name });
        // Only set a location filter for named preset locations (not 'Custom Location')
        setLocationFilter(name !== 'Custom Location' ? name : null);
        setShowLocationModal(false);
    };

    // Clear the filter when GPS mode is restored
    useEffect(() => {
        if (mode === 'gps') setLocationFilter(null);
    }, [mode]);

    // Apply location filter: when a preset is selected, show ONLY matching projects
    const visibleProjects = useMemo(() => {
        if (!locationFilter) return projects;
        const needle = locationFilter.toLowerCase();
        return projects.filter(p =>
            (p.area && p.area.toLowerCase().includes(needle)) ||
            (p.district && p.district.toLowerCase().includes(needle))
        );
    }, [projects, locationFilter]);

    const nearestProject = visibleProjects.find(p => p.distance_m != null) || null;

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header / Location Picker */}
            <View className="px-5 pt-3 mb-2 z-10">
                <View className="flex-row justify-between items-center bg-card rounded-full px-4 py-2.5 border border-cardBorder">
                    <TouchableOpacity className="flex-row items-center flex-1" onPress={() => setShowLocationModal(true)}>
                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${mode === 'gps' ? 'bg-[#00D4AA]/20' : 'bg-[#6366F1]/20'}`}>
                            <Ionicons name={mode === 'gps' ? "location" : "map"} size={16} color={mode === 'gps' ? "#00D4AA" : "#6366F1"} />
                        </View>
                        <View className="flex-1 justify-center">
                            <Text className="text-txtMuted text-xs font-medium uppercase tracking-wider mb-0.5">
                                {mode === 'gps' ? t('home.current_location', 'Current Location') : t('home.test_location', 'Test Location')}
                            </Text>
                            <View className="flex-row items-center">
                                <Text className="text-txt font-bold text-sm mr-1" numberOfLines={1}>{label}</Text>
                                <Ionicons name="chevron-down" size={14} color={iconDim} />
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-cardBorder overflow-hidden"
                        onPress={() => router.push('/settings')}
                    >
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} className="w-full h-full rounded-full" />
                        ) : (
                            <Ionicons name="person-circle" size={32} color={iconDim} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Mode Banner */}
            {mode === 'manual' && (
                <View className="px-5 mb-3">
                    <View className="bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-lg px-3 py-2 flex-row items-center">
                        <Text className="text-[#6366F1] flex-1 text-xs ml-2">{t('home.sim_active')}</Text>
                        <TouchableOpacity onPress={startGPS}><Text className="text-[#00D4AA] text-xs font-bold">{t('home.use_gps')}</Text></TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Nearest Project Banner */}
            {nearestProject && (
                <TouchableOpacity
                    className="mx-5 mb-4 rounded-2xl p-4 border border-[#00D4AA]/30"
                    style={{ backgroundColor: '#00D4AA10' }}
                    onPress={() => router.push(`/project/${nearestProject.id}`)}
                >
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center bg-[#00D4AA]/20 px-2 py-1 rounded-md">
                            <Ionicons name="flash" size={12} color="#00D4AA" />
                            <Text className="text-[#00D4AA] text-[10px] font-bold ml-1 tracking-wider uppercase">{t('home.nearest_site')}</Text>
                        </View>
                        <Text className="text-[#00D4AA] font-bold text-sm">
                            {nearestProject.distance_m < 1000 ? `${nearestProject.distance_m}m` : `${(nearestProject.distance_m / 1000).toFixed(1)}km`}
                        </Text>
                    </View>
                    <Text className="text-txt font-bold text-base mb-1" numberOfLines={1}>{nearestProject.name}</Text>
                    <Text className="text-txtMuted text-xs" numberOfLines={1}>{nearestProject.area} • {nearestProject.department}</Text>
                </TouchableOpacity>
            )}

            {/* Main Content */}
            <View className="flex-1 bg-card rounded-t-3xl border-t border-cardBorder mt-1 overflow-hidden">
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#00D4AA" />
                        <Text className="text-txtMuted text-sm mt-3">{t('common.loading_projects')}</Text>
                    </View>
                ) : viewMode === 'map' ? (
                    <View className="flex-1 bg-surface relative">
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000' }}
                            className="absolute inset-0 w-full h-full opacity-60"
                            style={{ resizeMode: 'cover' }}
                        />
                        <View className="absolute inset-x-0 bottom-6 items-center">
                            <Text className="text-white font-mono text-xs bg-black/50 px-3 py-1 rounded-full mb-4">
                                {t('home.projects_found', { count: visibleProjects.length, label })}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                    >
                        {projects.length === 0 ? (
                            <View className="items-center justify-center py-20">
                                <Ionicons name="construct-outline" size={48} color={iconDim} />
                                <Text className="text-txt font-bold text-lg mt-4">{t('common.no_projects')}</Text>
                                <Text className="text-txtMuted text-sm mt-2 text-center">{t('common.try_again')}</Text>
                            </View>
                        ) : (
                            visibleProjects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onPress={() => router.push(`/project/${project.id}`)}
                                />
                            ))
                        )}
                    </ScrollView>
                )}

                {/* Floating Map/List Toggle */}
                <View className="absolute bottom-6 left-1/2 -ml-24 flex-row bg-main rounded-full p-1 border border-cardBorder shadow-xl w-48">
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-full ${viewMode === 'map' ? 'bg-card' : ''}`}
                        onPress={() => setViewMode('map')}
                    >
                        <Ionicons name="map" size={16} color={viewMode === 'map' ? '#00D4AA' : iconDim} />
                        <Text className={`ml-2 text-sm font-bold ${viewMode === 'map' ? 'text-[#00D4AA]' : 'text-txtMuted'}`}>{t('home.map')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-full ${viewMode === 'list' ? 'bg-card' : ''}`}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={16} color={viewMode === 'list' ? '#00D4AA' : iconDim} />
                        <Text className={`ml-2 text-sm font-bold ${viewMode === 'list' ? 'text-[#00D4AA]' : 'text-txtMuted'}`}>{t('home.list')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <LocationPickerModal
                visible={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onSelect={handleManualSelection}
            />
        </SafeAreaView>
    );
}
