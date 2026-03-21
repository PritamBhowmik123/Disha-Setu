/**
 * app/updates.jsx — Real project updates feed from backend
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/use-color-scheme';
import { fetchProjects, fetchProjectUpdates } from '../services/projectService';
import { formatDate } from '../utils/dateFormatter';
import { onProjectUpdate } from '../services/socketService';

const STATUS_COLORS = {
    'In Progress': '#00D4AA',
    'Completed': '#10B981',
    'Delayed': '#EF4444',
    'Planned': '#6366F1',
};

export default function UpdatesScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Load updates for all projects
    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const projects = await fetchProjects();
            const allUpdates = [];
            // Fetch updates for first 5 projects to avoid overloading
            const top5 = projects.slice(0, 5);
            await Promise.all(top5.map(async (proj) => {
                try {
                    const upds = await fetchProjectUpdates(proj.id);
                    upds.forEach(u => allUpdates.push({
                        ...u,
                        projectName: proj.name,
                        projectId: proj.id,
                        projectArea: proj.area,
                        status: proj.status,
                    }));
                } catch (_) { }
            }));
            // Sort by newest first
            allUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setUpdates(allUpdates);
        } catch (err) {
            console.error('[Updates]', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Real-time: prepend new updates as they come in
        const unsubscribe = onProjectUpdate((payload) => {
            setUpdates(prev => [{
                id: Date.now().toString(),
                title: payload.title,
                body: payload.body,
                update_type: payload.updateType,
                new_status: payload.newStatus,
                created_at: payload.createdAt || new Date().toISOString(),
                projectName: payload.projectName,
                projectId: payload.projectId,
                status: payload.newStatus,
            }, ...prev]);
        });
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    const onRefresh = () => { setRefreshing(true); load(true); };

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            <View className="flex-row items-center px-5 pt-4 pb-3">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={22} color="#00D4AA" />
                </TouchableOpacity>
                <View>
                    <Text className="text-txt text-xl font-bold">Project Updates</Text>
                    <Text className="text-txtMuted text-xs">Live civic activity feed</Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00D4AA" />
                    <Text className="text-txtMuted text-sm mt-3">Loading updates...</Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />}
                >
                    {updates.length === 0 ? (
                        <View className="items-center py-20">
                            <Ionicons name="pulse-outline" size={48} color={iconDim} />
                            <Text className="text-txt font-bold text-lg mt-4">No updates yet</Text>
                            <Text className="text-txtMuted text-sm mt-2 text-center">Project activity will appear here.</Text>
                        </View>
                    ) : (
                        updates.map((u, i) => (
                            <TouchableOpacity
                                key={u.id || i}
                                className="bg-card rounded-2xl p-4 mb-3 border border-cardBorder"
                                onPress={() => u.projectId && router.push(`/project/${u.projectId}`)}
                                activeOpacity={0.85}
                            >
                                <View className="flex-row items-start mb-2">
                                    <View className="w-2 h-2 rounded-full mt-1.5 mr-2" style={{ backgroundColor: STATUS_COLORS[u.new_status || u.status] || '#9CA3AF' }} />
                                    <Text className="text-txt font-bold text-sm flex-1">{u.title}</Text>
                                </View>
                                {u.body && <Text className="text-txtMuted text-sm leading-5 mb-2 ml-4">{u.body}</Text>}
                                <View className="flex-row items-center justify-between ml-4">
                                    <Text className="text-[#00D4AA] text-xs font-semibold" numberOfLines={1}>{u.projectName}</Text>
                                    <Text className="text-[#6B7280] text-xs">{formatDate(u.created_at)}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
