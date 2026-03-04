import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOCK_PROJECTS } from '../../constants/mockData';
import { useLocation } from '../../hooks/use-location';
import { formatDistance, haversineKm } from '../../utils/distance';
import LocationPickerModal from '../../components/location-picker';
import { useColorScheme } from '../../hooks/use-color-scheme';

function ProjectCard({ project, onPress }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            className="bg-card rounded-3xl overflow-hidden mb-6 border border-cardBorder"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 }}
        >
            {/* Image Section */}
            <View className="relative h-48 w-full">
                <Image source={{ uri: project.image }} className="w-full h-full" />
                <View className="absolute inset-0 bg-black/30" />

                {/* Badges */}
                <View className="absolute top-4 left-4 flex-row">
                    <View className="bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20 mr-2">
                        <Text className="text-white text-xs font-bold">{project.category}</Text>
                    </View>
                </View>

                {/* Status Indicator */}
                <View className="absolute top-4 right-4 bg-black/60 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20 flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-[#00D4AA] mr-2" />
                    <Text className="text-white text-xs font-bold">{project.status}</Text>
                </View>

                {/* Progress Bar overlay */}
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <View className="h-full bg-[#00D4AA]" style={{ width: `${project.progress}%` }} />
                </View>
            </View>

            {/* Content Section */}
            <View className="p-5">
                <Text className="text-txt text-xl font-bold mb-1" numberOfLines={2}>
                    {project.name}
                </Text>

                <View className="flex-row items-center mb-4 mt-2">
                    <Ionicons name="location" size={14} color={iconDim} />
                    <Text className="text-txtMuted text-sm ml-1 flex-1" numberOfLines={1}>{project.area}</Text>
                    {project.distance !== undefined && (
                        <View className="bg-surface px-2 py-1 rounded-md ml-2 flex-row items-center">
                            <Ionicons name="navigate" size={10} color="#00D4AA" />
                            <Text className="text-[#00D4AA] text-[10px] font-bold ml-1">{formatDistance(project.distance)}</Text>
                        </View>
                    )}
                </View>

                <View className="flex-row items-center justify-between pt-4 border-t border-cardBorder">
                    <View>
                        <Text className="text-txtMuted text-xs mb-1 uppercase tracking-wider font-semibold">Budget</Text>
                        <Text className="text-txt font-bold">{project.budget}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-txtMuted text-xs mb-1 uppercase tracking-wider font-semibold">Completion</Text>
                        <Text className="text-[#00D4AA] font-bold">{project.expectedCompletion}</Text>
                    </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-txtMuted text-xs">Dept: {project.department}</Text>
                    <Text className="text-txtMuted text-xs">ID: {project.id}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
    const [showLocationModal, setShowLocationModal] = useState(false);
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    // Get location state from our custom hook
    const { coords, label, mode, startGPS, setManual, accuracy } = useLocation();

    // Calculate distance for all projects
    const projectsWithDistance = MOCK_PROJECTS.map(project => {
        // Very rough mock calculation: assumes 1 degree = ~111km for testing
        // Real app would use actual project coordinates
        let mockDistance = null;
        if (coords) {
            // Create a fake coordinate for the project based on its ID for demonstration
            const idNum = parseInt(project.id.replace(/\D/g, '')) || Math.random() * 100;
            const projLat = 12.9716 + (idNum * 0.01 - 0.05);
            const projLng = 77.5946 + (idNum * 0.01 - 0.05);
            mockDistance = haversineKm(coords.lat, coords.lng, projLat, projLng);
        }
        return { ...project, distance: mockDistance };
    });

    // Sort projects by distance
    const sortedProjects = [...projectsWithDistance].sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
    });

    const nearestProject = sortedProjects[0]?.distance !== null ? sortedProjects[0] : null;

    const handleManualSelection = (lat, lng, name) => {
        setManual(lat, lng, name);
        setShowLocationModal(false);
    };

    const handleGPSReset = async () => {
        await startGPS();
    };

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header / Location Picker */}
            <View className="px-5 pt-3 mb-2 z-10">
                <View className="flex-row justify-between items-center bg-card rounded-full px-4 py-2.5 border border-cardBorder">
                    <TouchableOpacity
                        className="flex-row items-center flex-1"
                        onPress={() => setShowLocationModal(true)}
                    >
                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${mode === 'gps' ? 'bg-[#00D4AA]/20' : 'bg-[#6366F1]/20'}`}>
                            <Ionicons
                                name={mode === 'gps' ? "location" : "map"}
                                size={16}
                                color={mode === 'gps' ? "#00D4AA" : "#6366F1"}
                            />
                        </View>
                        <View className="flex-1 justify-center">
                            <Text className="text-txtMuted text-xs font-medium uppercase tracking-wider mb-0.5">
                                {mode === 'gps' ? 'Current Location' : 'Test Location'}
                            </Text>
                            <View className="flex-row items-center">
                                <Text className="text-txt font-bold text-sm mr-1" numberOfLines={1}>
                                    {label}
                                </Text>
                                <Ionicons name="chevron-down" size={14} color={iconDim} />
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-cardBorder"
                        onPress={() => router.push('/settings')}
                    >
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/100?img=11' }}
                            className="w-full h-full rounded-full"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Mode Banner */}
            {mode === 'manual' && (
                <View className="px-5 mb-3">
                    <View className="bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-lg px-3 py-2 flex-row items-center">
                        <Ionicons name="construct" size={14} color="#6366F1" className="mr-2" />
                        <Text className="text-[#6366F1] flex-1 text-xs ml-2">Location simulation active for testing.</Text>
                        <TouchableOpacity onPress={handleGPSReset}>
                            <Text className="text-[#00D4AA] text-xs font-bold">Use GPS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Nearest Project Banner */}
            {nearestProject && (
                <TouchableOpacity
                    className="mx-5 mb-4 bg-gradient-to-r from-[#00D4AA]/20 to-main rounded-2xl p-4 border border-[#00D4AA]/30"
                    onPress={() => router.push(`/project/${nearestProject.id}`)}
                >
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center bg-[#00D4AA]/20 px-2 py-1 rounded-md">
                            <Ionicons name="flash" size={12} color="#00D4AA" />
                            <Text className="text-[#00D4AA] text-[10px] font-bold ml-1 tracking-wider uppercase">Nearest Site</Text>
                        </View>
                        <Text className="text-[#00D4AA] font-bold text-sm">{formatDistance(nearestProject.distance)}</Text>
                    </View>
                    <Text className="text-txt font-bold text-base mb-1" numberOfLines={1}>{nearestProject.name}</Text>
                    <Text className="text-txtMuted text-xs" numberOfLines={1}>{nearestProject.area} • {nearestProject.department}</Text>
                </TouchableOpacity>
            )}

            {/* Main Content Area */}
            <View className="flex-1 bg-card rounded-t-3xl border-t border-cardBorder mt-1 overflow-hidden">
                {viewMode === 'map' ? (
                    <View className="flex-1 bg-surface relative">
                        {/* Mapbox Static Image as mock Map Component */}
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000' }}
                            className="absolute inset-0 w-full h-full opacity-60"
                            style={{ resizeMode: 'cover' }}
                        />

                        {/* Status Overlay */}
                        <View className="absolute inset-x-0 bottom-6 items-center pointer-events-none">
                            <Text className="text-white font-mono text-xs bg-black/50 px-3 py-1 rounded-full mb-4">
                                Simulated Map View ({label})
                            </Text>
                            <View className="flex-row gap-2 pb-24">
                                {sortedProjects.slice(0, 3).map((p, i) => (
                                    <View key={p.id} className="bg-card px-3 py-2 rounded-xl border border-[#00D4AA]/30 shadow-lg" style={{ opacity: 1 - (i * 0.2) }}>
                                        <Text className="text-[#00D4AA] text-[10px] font-bold">{formatDistance(p.distance)}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* User Location Indicator */}
                        {coords && (
                            <View className="absolute top-1/2 left-1/2 -ml-3 -mt-3">
                                <View className="w-6 h-6 rounded-full bg-[#00D4AA]/30 absolute inset-0 animate-pulse border border-[#00D4AA]/50"
                                    style={{ transform: [{ scale: 1.5 + (accuracy ? accuracy / 100 : 0) }] }} />
                                <View className="w-4 h-4 rounded-full bg-[#00D4AA] border-2 border-white shadow-lg z-10 relative left-1 top-1" />
                            </View>
                        )}
                    </View>
                ) : (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                        {sortedProjects.map((project) => (
                            <ProjectCard key={project.id} project={project} onPress={() => router.push(`/project/${project.id}`)} />
                        ))}
                    </ScrollView>
                )}

                {/* Floating Map/List Toggle */}
                <View className="absolute bottom-6 left-1/2 -ml-24 flex-row bg-main rounded-full p-1 border border-cardBorder shadow-xl w-48">
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-full ${viewMode === 'map' ? 'bg-card' : ''}`}
                        onPress={() => setViewMode('map')}
                    >
                        <Ionicons name="map" size={16} color={viewMode === 'map' ? '#00D4AA' : iconDim} />
                        <Text className={`ml-2 text-sm font-bold ${viewMode === 'map' ? 'text-[#00D4AA]' : 'text-txtMuted'}`}>Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-full ${viewMode === 'list' ? 'bg-card' : ''}`}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={16} color={viewMode === 'list' ? '#00D4AA' : iconDim} />
                        <Text className={`ml-2 text-sm font-bold ${viewMode === 'list' ? 'text-[#00D4AA]' : 'text-txtMuted'}`}>List</Text>
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
