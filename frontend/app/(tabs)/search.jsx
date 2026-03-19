/**
 * app/(tabs)/search.jsx — Real project search from backend
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { fetchProjects } from '../../services/projectService';
import { CATEGORY_ICONS } from '../../constants/mockData';
import { useTranslation } from 'react-i18next';

const CATEGORIES = ['All', 'Road', 'Bridge', 'Metro', 'Hospital', 'College', 'Water', 'Park'];

export default function SearchScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [allProjects, setAllProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        fetchProjects().then(list => {
            setAllProjects(list);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const filtered = allProjects.filter(p => {
        const matchQuery = !query.trim() ||
            p.name?.toLowerCase().includes(query.toLowerCase()) ||
            p.area?.toLowerCase().includes(query.toLowerCase()) ||
            p.district?.toLowerCase().includes(query.toLowerCase()) ||
            p.id?.toLowerCase().includes(query.toLowerCase());
        const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchQuery && matchCategory;
    });

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            {/* Search bar */}
            <View className="px-5 pt-4 pb-3">
                <View className="flex-row items-center bg-card rounded-2xl px-4 py-3 border border-cardBorder gap-3">
                    <Ionicons name="search" size={20} color={iconDim} />
                    <TextInput
                        className="flex-1 text-txt text-base"
                        placeholder={t('search.placeholder')}
                        placeholderTextColor={iconDim}
                        value={query}
                        onChangeText={setQuery}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color={iconDim} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category filter */}
            <View className="h-14">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 1, alignItems: 'center' }}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            className="mr-2 px-4 py-2 rounded-full border"
                            style={{
                                backgroundColor: selectedCategory === cat ? '#00D4AA' : isDark ? '#111827' : '#fff',
                                borderColor: selectedCategory === cat ? '#00D4AA' : isDark ? '#1F2937' : '#E5E7EB',
                            }}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text className="font-semibold text-sm" style={{ color: selectedCategory === cat ? '#000' : iconDim }}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Results */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00D4AA" />
                </View>
            ) : (
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    <Text className="text-txtMuted text-sm mb-4">
                        {query && selectedCategory !== 'All'
                            ? t('search.results_query_cat', { count: filtered.length, s: filtered.length !== 1 ? 's' : '', query, category: selectedCategory })
                            : query
                                ? t('search.results_query', { count: filtered.length, s: filtered.length !== 1 ? 's' : '', query })
                                : selectedCategory !== 'All'
                                    ? t('search.results_cat', { count: filtered.length, s: filtered.length !== 1 ? 's' : '', category: selectedCategory })
                                    : t('search.results', { count: filtered.length, s: filtered.length !== 1 ? 's' : '' })
                        }
                    </Text>
                    {filtered.length === 0 ? (
                        <View className="items-center py-16">
                            <Ionicons name="search-outline" size={48} color={iconDim} />
                            <Text className="text-txt font-bold text-lg mt-4">{t('common.no_results')}</Text>
                            <Text className="text-txtMuted text-sm mt-2 text-center">{t('search.try_different', 'Try a different search term or category')}</Text>
                        </View>
                    ) : (
                        filtered.map(project => {
                            const iconName = CATEGORY_ICONS[project.category] || 'construction';
                            const progress = project.progress_percentage ?? project.progress ?? 0;
                            return (
                                <TouchableOpacity
                                    key={project.id}
                                    className="bg-card rounded-2xl p-4 mb-3 border border-cardBorder flex-row items-center"
                                    onPress={() => router.push(`/project/${project.id}`)}
                                    activeOpacity={0.85}
                                >
                                    <View className="w-12 h-12 rounded-xl bg-surface items-center justify-center mr-4 border border-cardBorder">
                                        <MaterialIcons name={iconName} size={22} color={project.status === 'Completed' ? '#10B981' : '#00D4AA'} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-txt font-bold text-sm mb-1" numberOfLines={1}>{project.name}</Text>
                                        <Text className="text-txtMuted text-xs mb-2" numberOfLines={1}>{project.area} · {project.department}</Text>
                                        <View className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                                            <View className="h-full rounded-full bg-[#00D4AA]" style={{ width: `${progress}%` }} />
                                        </View>
                                    </View>
                                    <View className="ml-3 items-end">
                                        <Text className="text-[#00D4AA] font-bold text-sm">{progress}%</Text>
                                        <Text className="text-txtMuted text-xs mt-1">{project.status}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
