import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROJECTS, CATEGORY_ICONS, type Project } from '../constants/mockData';

const STATUS_STYLE: Record<string, { text: string }> = {
  'In Progress': { text: '#00D4AA' },
  'Completed': { text: '#10B981' },
  'Delayed': { text: '#EF4444' },
};

const UPDATE_SECTIONS = [
  {
    title: 'Recently Updated',
    icon: '🔄',
    color: '#6366F1',
    date: 'Today',
    gradient: '#6366F1',
    projects: [MOCK_PROJECTS[0], MOCK_PROJECTS[1]],
  },
  {
    title: 'Newly Added',
    icon: '🆕',
    color: '#00D4AA',
    date: 'This Week',
    gradient: '#00D4AA',
    projects: [MOCK_PROJECTS[4]],
  },
  {
    title: 'Marked Complete',
    icon: '✅',
    color: '#10B981',
    date: 'Feb 2025',
    gradient: '#10B981',
    projects: [MOCK_PROJECTS[3]],
  },
];

function SmallProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const s = STATUS_STYLE[project.status] || STATUS_STYLE['In Progress'];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="bg-[#1A2035] rounded-2xl p-3.5 mb-2.5 flex-row items-center border border-[#1F2937]"
    >
      <View className="w-10 h-10 rounded-xl bg-[#111827] items-center justify-center mr-3">
        <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[project.category] || '🏗️'}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-semibold text-sm mb-0.5" numberOfLines={1}>{project.name}</Text>
        <View className="flex-row items-center gap-2">
          <Text style={{ color: s.text }} className="text-xs font-bold">● {project.status}</Text>
          <Text className="text-[#6B7280] text-xs">{project.completion}%</Text>
          <Text className="text-[#6B7280] text-xs">📍 {project.distance}</Text>
        </View>
      </View>
      <Text className="text-[#4B5563]">›</Text>
    </TouchableOpacity>
  );
}

export default function UpdatesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A]" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pt-4 pb-4 flex-row items-center">
          <TouchableOpacity className="flex-row items-center mr-4" onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-[#00D4AA] text-lg mr-2">←</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-white text-2xl font-bold">Real-Time <Text className="text-[#6366F1]">Updates</Text></Text>
            <Text className="text-[#9CA3AF] text-sm">Latest project activity near you</Text>
          </View>
        </View>

        {/* Live indicator */}
        <View className="mx-4 mb-4 flex-row items-center bg-[#6366F115] rounded-2xl px-4 py-3 border border-[#6366F1]/20">
          <View className="w-2 h-2 rounded-full bg-[#6366F1] mr-2 opacity-100" />
          <Text className="text-[#6366F1] font-semibold text-sm">Live • {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </View>

        {/* Sections */}
        {UPDATE_SECTIONS.map(section => (
          <View key={section.title} className="px-4 mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: section.color + '20' }}>
                <Text style={{ fontSize: 16 }}>{section.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">{section.title}</Text>
                <Text className="text-[#6B7280] text-xs">{section.date}</Text>
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

        {/* Activity summary */}
        <View className="mx-4 mb-8 bg-[#111827] rounded-3xl p-5 border border-[#1F2937]">
          <Text className="text-white font-bold text-base mb-4">📈 This Month</Text>
          {[
            { label: 'Projects Updated', value: '8', color: '#6366F1' },
            { label: 'Milestones Reached', value: '14', color: '#00D4AA' },
            { label: 'Projects Completed', value: '1', color: '#10B981' },
            { label: 'New Projects Added', value: '3', color: '#F59E0B' },
          ].map(stat => (
            <View key={stat.label} className="flex-row items-center justify-between py-2.5 border-b border-[#1F2937] last:border-0">
              <Text className="text-[#9CA3AF] text-sm">{stat.label}</Text>
              <Text style={{ color: stat.color }} className="text-base font-bold">{stat.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
