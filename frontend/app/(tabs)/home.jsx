/**
 * app/(tabs)/home.jsx — Real project feed from backend
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocation } from '../../hooks/use-location';
import LocationPickerModal from '../../components/location-picker';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { fetchProjects } from '../../services/projectService';
import { emitLocation } from '../../services/socketService';
import { CATEGORY_ICONS } from '../../constants/mockData';
import { useTranslation } from 'react-i18next';
import MapView, { Marker } from '../../components/ProjectMap';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const STATUS_COLOR = {
    'In Progress': '#00D4AA',
    'Completed': '#10B981',
    'Delayed': '#EF4444',
    'Planned': '#6366F1',
};

function ProjectCard({ project, onPress }) {
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const progress = project.progress_percentage ?? project.progress ?? 0;
    const statusColor = STATUS_COLOR[project.status] || '#6B7280';

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            className="bg-card rounded-2xl overflow-hidden mb-4 border border-cardBorder"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
        >
            {/* Image */}
            <View className="relative h-44 w-full">
                <Image source={{ uri: project.image_url || project.image }} className="w-full h-full" />
                <View className="absolute inset-0 bg-black/20" />
                {/* Category label — subtle, bottom-left */}
                <View className="absolute bottom-3 left-3 flex-row items-center gap-1.5">
                    <View className="bg-black/50 rounded-md px-2.5 py-1">
                        <Text className="text-white text-xs font-semibold">{project.category}</Text>
                    </View>
                    <View className="flex-row items-center bg-black/50 rounded-md px-2.5 py-1 gap-1">
                        <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                        <Text className="text-white text-xs font-semibold">{project.status}</Text>
                    </View>
                </View>
                {/* Progress stripe */}
                <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
                    <View className="h-full" style={{ width: `${progress}%`, backgroundColor: statusColor }} />
                </View>
            </View>

            {/* Content */}
            <View className="p-4">
                <Text className="text-txt text-base font-bold mb-1 leading-5" numberOfLines={2}>{project.name}</Text>
                <View className="flex-row items-center mb-3">
                    <Ionicons name="location-outline" size={13} color={iconDim} />
                    <Text className="text-txtMuted text-xs ml-1 flex-1" numberOfLines={1}>{project.area}</Text>
                    {project.distance_m != null && (
                        <Text className="text-[#00D4AA] text-xs font-semibold ml-2">
                            {project.distance_m < 1000 ? `${project.distance_m}m` : `${(project.distance_m / 1000).toFixed(1)}km`}
                        </Text>
                    )}
                </View>
                <View className="flex-row items-center justify-between pt-3 border-t border-cardBorder">
                    <View>
                        <Text className="text-txtMuted text-[10px] mb-0.5">{t('home.budget')}</Text>
                        <Text className="text-txt text-sm font-bold">{project.budget_display || project.budget}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-txtMuted text-[10px] mb-0.5">{t('home.completion')}</Text>
                        <Text className="text-txt text-sm font-bold">{project.completion_display || project.expectedCompletion}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-txtMuted text-[10px] mb-0.5">Progress</Text>
                        <Text className="text-sm font-bold" style={{ color: statusColor }}>{progress}%</Text>
                    </View>
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
    const [locationFilter, setLocationFilter] = useState(null);
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const { coords, label, mode, startGPS, setManual } = useLocation();

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
        if (coords) emitLocation(coords.lat, coords.lng);
    }, [coords]);

    const onRefresh = () => {
        setRefreshing(true);
        loadProjects(coords?.lat, coords?.lng);
    };

    const handleManualSelection = (lat, lng, name) => {
        setManual({ lat, lng, label: name });
        setLocationFilter(name !== 'Custom Location' ? name : null);
        setShowLocationModal(false);
    };

    useEffect(() => {
        if (mode === 'gps') setLocationFilter(null);
    }, [mode]);

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
            {/* Header */}
            <View className="px-4 pt-3 pb-2">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity className="flex-row items-center flex-1 gap-2" onPress={() => setShowLocationModal(true)}>
                        <View className={`w-7 h-7 rounded-lg items-center justify-center ${mode === 'gps' ? 'bg-[#00D4AA]/15' : 'bg-[#6366F1]/15'}`}>
                            <Ionicons name={mode === 'gps' ? 'location' : 'map'} size={15} color={mode === 'gps' ? '#00D4AA' : '#6366F1'} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-txtMuted text-[10px] font-medium mb-0.5">
                                {mode === 'gps' ? t('home.current_location', 'Current Location') : t('home.test_location', 'Test Location')}
                            </Text>
                            <View className="flex-row items-center gap-1">
                                <Text className="text-txt font-semibold text-sm" numberOfLines={1}>{label}</Text>
                                <Ionicons name="chevron-down" size={12} color={iconDim} />
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* View Mode toggle — inline, no floating pill */}
                    <View className="flex-row items-center bg-surface rounded-lg p-0.5 border border-cardBorder mr-3">
                        <TouchableOpacity
                            className={`px-3 py-1.5 rounded-md ${viewMode === 'list' ? 'bg-card' : ''}`}
                            onPress={() => setViewMode('list')}
                        >
                            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#00D4AA' : iconDim} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`px-3 py-1.5 rounded-md ${viewMode === 'map' ? 'bg-card' : ''}`}
                            onPress={() => setViewMode('map')}
                        >
                            <Ionicons name="map-outline" size={16} color={viewMode === 'map' ? '#00D4AA' : iconDim} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        className="w-9 h-9 rounded-full bg-surface items-center justify-center border border-cardBorder overflow-hidden"
                        onPress={() => router.push('/settings')}
                    >
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} className="w-full h-full rounded-full" />
                        ) : (
                            <Ionicons name="person-outline" size={18} color={iconDim} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Mode Banner */}
            {mode === 'manual' && (
                <View className="px-4 mb-2">
                    <View className="flex-row items-center gap-2 px-3 py-2 rounded-lg border border-[#6366F1]/30 bg-[#6366F1]/8">
                        <Ionicons name="information-circle-outline" size={14} color="#6366F1" />
                        <Text className="text-[#6366F1] flex-1 text-xs">{t('home.sim_active')}</Text>
                        <TouchableOpacity onPress={startGPS}>
                            <Text className="text-[#00D4AA] text-xs font-semibold">{t('home.use_gps')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Nearest Project Banner */}
            {nearestProject && (
                <TouchableOpacity
                    className="mx-4 mb-3 rounded-xl p-3 border-l-4 border-[#00D4AA] bg-card border border-cardBorder"
                    style={{ borderLeftWidth: 3, borderLeftColor: '#00D4AA' }}
                    onPress={() => router.push(`/project/${nearestProject.id}`)}
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-txtMuted text-[10px] font-semibold uppercase mb-0.5">{t('home.nearest_site')}</Text>
                            <Text className="text-txt font-semibold text-sm" numberOfLines={1}>{nearestProject.name}</Text>
                            <Text className="text-txtMuted text-xs mt-0.5">{nearestProject.area}</Text>
                        </View>
                        <View className="items-end ml-3">
                            <Text className="text-[#00D4AA] font-bold text-sm">
                                {nearestProject.distance_m < 1000 ? `${nearestProject.distance_m}m` : `${(nearestProject.distance_m / 1000).toFixed(1)}km`}
                            </Text>
                            <Ionicons name="arrow-forward" size={14} color={iconDim} style={{ marginTop: 4 }} />
                        </View>
                    </View>
                </TouchableOpacity>
            )}

            {/* Main Content */}
            <View className="flex-1 bg-card rounded-t-2xl border-t border-cardBorder overflow-hidden">
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#00D4AA" />
                        <Text className="text-txtMuted text-sm mt-3">{t('common.loading_projects')}</Text>
                    </View>
                ) : viewMode === 'map' ? (
                    <View className="flex-1 bg-surface relative m-3 mb-20 rounded-2xl overflow-hidden border border-cardBorder">
                        {coords && (
                            <MapView
                                style={{ flex: 1, width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                                userInterfaceStyle="light"
                                initialRegion={{
                                    latitude: coords?.lat || 18.5204,
                                    longitude: coords?.lng || 73.8567,
                                    latitudeDelta: 0.1,
                                    longitudeDelta: 0.1,
                                }}
                                showsUserLocation={true}
                            >
                                {visibleProjects.filter(p => p.lat != null && p.lng != null).map((project) => (
                                    <Marker
                                        key={project.id}
                                        coordinate={{
                                            latitude: parseFloat(project.lat),
                                            longitude: parseFloat(project.lng),
                                        }}
                                        title={project.name}
                                        description={`${project.area} • Tap to view`}
                                        onCalloutPress={() => router.push(`/project/${project.id}`)}
                                    >
                                        <View
                                            className="items-center justify-center rounded-full border-2 border-[#00D4AA]"
                                            style={{ width: 32, height: 32, backgroundColor: '#111827', elevation: 4 }}
                                        >
                                            <MaterialIcons name={CATEGORY_ICONS[project.category] || 'location-on'} size={16} color="#00D4AA" />
                                        </View>
                                    </Marker>
                                ))}
                            </MapView>
                        )}
                        {!coords && (
                            <View className="flex-1 items-center justify-center bg-card">
                                <ActivityIndicator size="small" color="#00D4AA" />
                                <Text className="text-txtMuted text-xs mt-3">{t('home.waiting_location', 'Awaiting location...')}</Text>
                            </View>
                        )}
                        <View className="absolute inset-x-0 bottom-3 items-center">
                            <View className="bg-card/90 border border-cardBorder px-4 py-1.5 rounded-full">
                                <Text className="text-txtMuted text-xs">
                                    {visibleProjects.length} projects near {label}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                    >
                        {projects.length === 0 ? (
                            <View className="items-center justify-center py-20">
                                <Ionicons name="construct-outline" size={44} color={iconDim} />
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
            </View>

            <LocationPickerModal
                visible={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onSelect={handleManualSelection}
            />
        </SafeAreaView>
    );
}
