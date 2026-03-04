import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MOCK_PROJECTS, CATEGORY_ICONS } from '../../constants/mockData';
import { useColorScheme } from '../../hooks/use-color-scheme';

const STATUS_STYLE = {
    'In Progress': { bg: '#00D4AA20', text: '#00D4AA', border: '#00D4AA40' },
    'Completed': { bg: '#10B98120', text: '#10B981', border: '#10B98140' },
    'Delayed': { bg: '#EF444420', text: '#EF4444', border: '#EF444440' },
};

function ProgressBar({ value, color }) {
    return (
        <View className="w-full h-3 bg-[#1F2937] rounded-full overflow-hidden">
            <View
                className="h-full rounded-full"
                style={{ width: `${value}%`, backgroundColor: color }}
            />
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
            <Text className="text-white font-bold text-sm mt-1 text-center" numberOfLines={2}>{value}</Text>
            <Text className="text-[#6B7280] text-xs mt-0.5">{label}</Text>
        </View>
    );
}

export default function ProjectDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const project = MOCK_PROJECTS.find(p => p.id === id) || MOCK_PROJECTS[0];
    const s = STATUS_STYLE[project.status] || STATUS_STYLE['In Progress'];
    const iconName = CATEGORY_ICONS[project.category] || 'construction';
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

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
                        <Text className="text-[#00D4AA] font-semibold">Back</Text>
                    </TouchableOpacity>

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
                            <Text className="text-txtMuted text-sm font-medium">Overall Completion</Text>
                            <Text style={{ color: s.text }} className="text-2xl font-bold">{project.completion}%</Text>
                        </View>
                        <ProgressBar value={project.completion} color={s.text} />
                        <View className="flex-row items-center gap-1 mt-2">
                            <Ionicons name="time-outline" size={11} color={iconDim} />
                            <Text className="text-txtMuted text-xs">Last updated: {project.lastUpdated}</Text>
                        </View>
                    </View>

                    {/* Delay reason */}
                    {project.delayReason && (
                        <View className="bg-[#EF444415] rounded-2xl p-4 border border-[#EF4444]/30 mb-4 flex-row items-start">
                            <Ionicons name="warning" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                            <View className="flex-1">
                                <Text className="text-[#EF4444] font-bold text-sm mb-1">Delay Reason</Text>
                                <Text className="text-[#FCA5A5] text-sm leading-5">{project.delayReason}</Text>
                            </View>
                        </View>
                    )}

                    {/* Quick info grid */}
                    <View className="flex-row mb-3">
                        <InfoCard label="Department" value={project.department} iconName="business-outline" iconType="ion" />
                        <InfoCard label="Budget" value={project.budget} iconName="cash-outline" iconType="ion" />
                    </View>
                    <View className="flex-row mb-4">
                        <InfoCard label="Started" value={project.startDate} iconName="calendar-outline" iconType="ion" />
                        <InfoCard label="Expected" value={project.expectedCompletion} iconName="flag-outline" iconType="ion" />
                    </View>

                    {/* Contractor */}
                    <View className="bg-card rounded-2xl p-3 border border-cardBorder mb-4 flex-row items-center">
                        <Ionicons name="construct-outline" size={20} color={iconDim} style={{ marginRight: 12 }} />
                        <View>
                            <Text className="text-txtMuted text-xs">Contractor</Text>
                            <Text className="text-txt font-semibold text-sm">{project.contractor}</Text>
                        </View>
                    </View>
                </View>

                {/* Civic Impact */}
                <View className="mx-4 mb-4 bg-[#00D4AA15] rounded-3xl p-5 border border-[#00D4AA]/20">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Ionicons name="leaf" size={16} color="#00D4AA" />
                        <Text className="text-[#00D4AA] font-bold text-sm uppercase tracking-wider">Civic Impact</Text>
                    </View>
                    <Text className="text-txt text-sm leading-6 mb-4">{project.civicImpact}</Text>
                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-surface rounded-2xl p-3 items-center">
                            <Text className="text-[#00D4AA] text-lg font-bold">{project.impactStat}</Text>
                            <Text className="text-txtMuted text-xs text-center mt-1">Key Impact</Text>
                        </View>
                        <View className="flex-1 bg-surface rounded-2xl p-3 items-center">
                            <Text className="text-[#00D4AA] text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>{project.beneficiaries}</Text>
                            <Text className="text-txtMuted text-xs text-center mt-1">Beneficiaries</Text>
                        </View>
                    </View>
                </View>

                {/* Timeline */}
                <View className="mx-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="git-branch-outline" size={18} color={iconDim} />
                        <Text className="text-txt font-bold text-base">Project Timeline</Text>
                    </View>
                    <View className="bg-card rounded-3xl border border-cardBorder overflow-hidden">
                        {project.milestones.map((milestone, i) => (
                            <View
                                key={i}
                                className="flex-row items-center p-4"
                                style={{ borderBottomWidth: i < project.milestones.length - 1 ? 1 : 0, borderBottomColor: 'var(--bg-card-border)' }}
                            >
                                <View className="items-center mr-4" style={{ width: 32 }}>
                                    <View
                                        className="w-8 h-8 rounded-full items-center justify-center"
                                        style={{ backgroundColor: milestone.completed ? '#00D4AA20' : 'var(--bg-card)' }}
                                    >
                                        <Ionicons
                                            name={milestone.completed ? 'checkmark-circle' : 'time-outline'}
                                            size={18}
                                            color={milestone.completed ? '#00D4AA' : iconDim}
                                        />
                                    </View>
                                    {i < project.milestones.length - 1 && (
                                        <View className="w-0.5 h-4 mt-1" style={{ backgroundColor: milestone.completed ? '#00D4AA' : 'var(--bg-card-border)' }} />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className={`font-semibold text-sm ${milestone.completed ? 'text-txt' : 'text-txtMuted'}`}>
                                        {milestone.title}
                                    </Text>
                                    <View className="flex-row items-center gap-1 mt-0.5">
                                        <Ionicons name="calendar-outline" size={10} color={iconDim} />
                                        <Text className="text-txtMuted text-xs">{milestone.date}</Text>
                                    </View>
                                </View>
                                {milestone.completed && (
                                    <View className="bg-[#00D4AA] rounded-full px-2 py-0.5">
                                        <Text className="text-main text-xs font-bold">Done</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Map preview */}
                <View className="mx-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Ionicons name="location-outline" size={18} color={iconDim} />
                        <Text className="text-txt font-bold text-base">Location</Text>
                    </View>
                    <View className="bg-card rounded-3xl h-36 border border-cardBorder items-center justify-center overflow-hidden relative">
                        {/* Static Grid Effect for map mock */}
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
                        <Text className="text-txtMuted text-xs mt-2 z-10 bg-main/80 px-2 py-0.5 rounded-full">{project.location}</Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View className="px-4 mb-8 flex-row gap-3">
                    <TouchableOpacity
                        className="flex-1 bg-card rounded-2xl py-4 items-center border border-cardBorder"
                        onPress={() => router.push('/feedback')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="alert-circle-outline" size={22} color="#EF4444" style={{ marginBottom: 4 }} />
                        <Text className="text-txt font-bold text-sm">Report Issue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-[#00D4AA] rounded-2xl py-4 items-center"
                        style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
                        onPress={() => router.push('/feedback')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="chatbubble-outline" size={22} color="#000" style={{ marginBottom: 4 }} />
                        <Text className="text-main font-bold text-sm">Give Feedback</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
