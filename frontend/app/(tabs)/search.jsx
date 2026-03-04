import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOCK_PROJECTS, CATEGORY_ICONS } from '../../constants/mockData';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function SearchScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const filteredProjects = MOCK_PROJECTS.filter(project => {
        const queryLower = searchQuery.toLowerCase();
        const matchesQuery = !queryLower ||
            project.name.toLowerCase().includes(queryLower) ||
            project.id.toLowerCase().includes(queryLower) ||
            project.area.toLowerCase().includes(queryLower);

        const matchesCategory = activeCategory === 'All' || project.category === activeCategory;

        return matchesQuery && matchesCategory;
    });

    return (
        <SafeAreaView className="flex-1 bg-main">
            <View className="px-6 pt-6 pb-4">
                <Text className="text-txt text-3xl font-bold mb-6">Search Projects</Text>

                {/* Search Bar */}
                <View className="flex-row items-center bg-card rounded-2xl px-4 py-3 border border-cardBorder">
                    <Ionicons name="search" size={20} color={iconDim} />
                    <TextInput
                        className="flex-1 ml-3 text-txt text-base"
                        placeholder="Search by name, ID or locality"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                            <Ionicons name="close-circle" size={18} color={iconDim} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {!searchQuery && (
                    <View className="px-6 mb-8">
                        <Text className="text-txtMuted text-sm font-semibold mb-4 uppercase tracking-wider">Categories</Text>
                        <View className="flex-row flex-wrap gap-3">
                            {['All', 'Infrastructure', 'Transport', 'Utilities', 'Healthcare', 'Education'].map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setActiveCategory(cat)}
                                    className="flex-row items-center px-4 py-2 rounded-full border"
                                    style={{
                                        backgroundColor: activeCategory === cat ? '#00D4AA20' : 'var(--bg-card)',
                                        borderColor: activeCategory === cat ? '#00D4AA' : 'var(--bg-card-border)',
                                    }}
                                >
                                    {cat !== 'All' && CATEGORY_ICONS[cat] && (
                                        <MaterialIcons
                                            name={CATEGORY_ICONS[cat]}
                                            size={14}
                                            color={activeCategory === cat ? '#00D4AA' : iconDim}
                                            style={{ marginRight: 6 }}
                                        />
                                    )}
                                    <Text className={`font-medium ${activeCategory === cat ? 'text-[#00D4AA]' : 'text-txtMuted'}`}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                <View className="px-6 pb-8">
                    {searchQuery && <Text className="text-txtMuted font-medium mb-4">{filteredProjects.length} results found</Text>}

                    {filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                            <TouchableOpacity
                                key={project.id}
                                onPress={() => router.push(`/project/${project.id}`)}
                                className="bg-card rounded-3xl p-4 mb-4 border border-cardBorder flex-row items-center"
                            >
                                <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mr-4">
                                    <MaterialIcons name={CATEGORY_ICONS[project.category] || 'construction'} size={24} color="#00D4AA" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-txt font-bold text-base mb-1" numberOfLines={1}>{project.name}</Text>
                                    <Text className="text-txtMuted text-xs">{project.department} · {project.locality}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={iconDim} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View className="items-center justify-center py-12">
                            <View className="w-20 h-20 rounded-full bg-card items-center justify-center mb-4">
                                <Ionicons name="search" size={32} color={iconDim} />
                            </View>
                            <Text className="text-txt text-lg font-bold">No projects found</Text>
                            <Text className="text-txtMuted text-sm text-center mt-2 px-10">
                                Try adjusting your search query or browsing by category.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
