import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOCK_PROJECTS, CATEGORY_ICONS } from '../constants/mockData';
import { useColorScheme } from '../hooks/use-color-scheme';

const STATUS_STYLE = {
    'In Progress': { text: '#00D4AA' },
    'Completed': { text: '#10B981' },
    'Delayed': { text: '#EF4444' },
};

const UPDATE_SECTIONS = [
    {
        title: 'Recently Updated',
        icon: 'refresh-circle',
        color: '#6366F1',
        date: 'Today',
        projects: [MOCK_PROJECTS[0], MOCK_PROJECTS[1]],
    },
    {
        title: 'Newly Added',
        icon: 'add-circle',
        color: '#00D4AA',
        date: 'This Week',
        projects: [MOCK_PROJECTS[4]],
    },
    {
        title: 'Marked Complete',
        icon: 'checkmark-circle',
        color: '#10B981',
        date: 'Feb 2025',
        projects: [MOCK_PROJECTS[3]],
    },
];

const MONTHLY_STATS = [
    { label: 'Projects Updated', value: '8', color: '#6366F1' },
    { label: 'Milestones Reached', value: '14', color: '#00D4AA' },
    { label: 'Projects Completed', value: '1', color: '#10B981' },
    { label: 'New Projects Added', value: '3', color: '#F59E0B' },
];

function SmallProjectCard({ project, onPress }) {
    const s = STATUS_STYLE[project.status] || STATUS_STYLE['In Progress'];
    const iconName = CATEGORY_ICONS[project.category] || 'construction';
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            className="bg-[#1A2035] rounded-2xl p-3.5 mb-2.5 flex-row items-center border border-[#1F2937]"
        >
            <View className="w-10 h-10 rounded-xl bg-[#111827] items-center justify-center mr-3">
                <MaterialIcons name={iconName} size={20} color={s.text} />
            </View>
            <View className="flex-1">
                <Text className="text-white font-semibold text-sm mb-0.5" numberOfLines={1}>{project.name}</Text>
                <View className="flex-row items-center gap-2">
                    <View className="flex-row items-center gap-1">
                        <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.text }} />
                        <Text style={{ color: s.text }} className="text-xs font-bold">{project.status}</Text>
                    </View>
                    <Text className="text-[#6B7280] text-xs">{project.completion}%</Text>
                    <View className="flex-row items-center gap-0.5">
                        <Ionicons name="location-outline" size={10} color="#6B7280" />
                        <Text className="text-[#6B7280] text-xs">{project.distance}</Text>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
        </TouchableOpacity>
    );
}

export default function UpdatesScreen() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-4 pt-4 pb-4 flex-row items-center">
                    <TouchableOpacity className="flex-row items-center mr-4 gap-1" onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={20} color="#00D4AA" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-txt text-2xl font-bold">
                            Real-Time <Text className="text-[#6366F1]">Updates</Text>
                        </Text>
                        <Text className="text-txtMuted text-sm">Latest project activity near you</Text>
                    </View>
                </View>

                {/* Live indicator */}
                <View className="mx-4 mb-4 flex-row items-center bg-[#6366F115] rounded-2xl px-4 py-3 border border-[#6366F1]/20">
                    <View className="w-2 h-2 rounded-full bg-[#6366F1] mr-2" />
                    <Text className="text-[#6366F1] font-semibold text-sm">
                        Live · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                </View>

                {/* Sections */}
                {UPDATE_SECTIONS.map(section => (
                    <View key={section.title} className="px-4 mb-6">
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: section.color + '20' }}>
                                <Ionicons name={section.icon} size={18} color={section.color} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-txt font-bold text-base">{section.title}</Text>
                                <Text className="text-txtMuted text-xs">{section.date}</Text>
                            </View>
                            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: section.color + '20' }}>
                                <Text style={{ color: section.color }} className="text-xs font-bold">{section.projects.length}</Text>
                            </View>
                        </View>
                        {section.projects.map(p => (
                            <SmallProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
                        ))}
                    </View>
                ))}

                {/* Monthly summary */}
                <View className="mx-4 mb-8 bg-card rounded-3xl p-5 border border-cardBorder">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="trending-up" size={18} color={iconDim} />
                        <Text className="text-txt font-bold text-base">This Month</Text>
                    </View>
                    {MONTHLY_STATS.map(stat => (
                        <View key={stat.label} className="flex-row items-center justify-between py-2.5 border-b border-cardBorder last:border-0">
                            <Text className="text-txtMuted text-sm">{stat.label}</Text>
                            <Text style={{ color: stat.color }} className="text-base font-bold">{stat.value}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
