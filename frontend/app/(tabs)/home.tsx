import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROJECTS, CATEGORY_ICONS, type Project } from '../../constants/mockData';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'In Progress': { bg: '#00D4AA20', text: '#00D4AA' },
  'Completed': { bg: '#10B98120', text: '#10B981' },
  'Delayed': { bg: '#EF444420', text: '#EF4444' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['In Progress'];
  return (
    <View style={{ backgroundColor: s.bg }} className="rounded-full px-3 py-1">
      <Text style={{ color: s.text }} className="text-xs font-bold">{status}</Text>
    </View>
  );
}

function MapPlaceholder({ onToggle }: { onToggle: () => void }) {
  return (
    <View className="mx-4 mb-4 rounded-3xl overflow-hidden" style={{ height: 220, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' }}>
      {/* Fake map grid */}
      <View className="flex-1 relative">
        {[0,1,2,3,4].map(i => (
          <View key={i} style={{ position: 'absolute', top: 0, left: i * 80, width: 1, height: '100%', backgroundColor: '#1F2937' }} />
        ))}
        {[0,1,2,3].map(i => (
          <View key={i} style={{ position: 'absolute', left: 0, top: i * 55, width: '100%', height: 1, backgroundColor: '#1F2937' }} />
        ))}

        {/* Road lines */}
        <View style={{ position: 'absolute', top: 110, left: 0, right: 0, height: 3, backgroundColor: '#374151' }} />
        <View style={{ position: 'absolute', left: 160, top: 0, bottom: 0, width: 3, backgroundColor: '#374151' }} />

        {/* Project markers */}
        <TouchableOpacity style={{ position: 'absolute', top: 80, left: 120 }} className="items-center">
          <View className="w-10 h-10 rounded-full bg-[#00D4AA] items-center justify-center" style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 8 }}>
            <Text style={{ fontSize: 18 }}>🌉</Text>
          </View>
          <View className="bg-[#00D4AA] rounded-full px-2 py-0.5 mt-1">
            <Text className="text-black text-xs font-bold">0.4km</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={{ position: 'absolute', top: 50, left: 220 }} className="items-center">
          <View className="w-10 h-10 rounded-full bg-[#6366F1] items-center justify-center">
            <Text style={{ fontSize: 18 }}>🚇</Text>
          </View>
          <View className="bg-[#6366F1] rounded-full px-2 py-0.5 mt-1">
            <Text className="text-white text-xs font-bold">1.2km</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={{ position: 'absolute', top: 130, left: 60 }} className="items-center">
          <View className="w-10 h-10 rounded-full bg-[#EF4444] items-center justify-center">
            <Text style={{ fontSize: 18 }}>🏥</Text>
          </View>
          <View className="bg-[#EF4444] rounded-full px-2 py-0.5 mt-1">
            <Text className="text-white text-xs font-bold">2.1km</Text>
          </View>
        </TouchableOpacity>

        {/* Location pin */}
        <View style={{ position: 'absolute', top: 88, left: 148 }} className="items-center">
          <View className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white" style={{ shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 6 }} />
        </View>

        {/* Map label */}
        <View className="absolute top-3 right-3 bg-[#0A0E1A]/80 rounded-xl px-3 py-1.5 border border-[#1F2937]">
          <Text className="text-white text-xs font-medium">📍 Hebbal, Bangalore</Text>
        </View>
      </View>
      <TouchableOpacity
        className="absolute bottom-3 right-3 bg-[#00D4AA] rounded-xl px-3 py-1.5"
        onPress={onToggle}
      >
        <Text className="text-black text-xs font-bold">📋 List View</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const icon = CATEGORY_ICONS[project.category] || '🏗️';
  const s = STATUS_STYLE[project.status] || STATUS_STYLE['In Progress'];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mx-4 mb-3 bg-[#111827] rounded-3xl p-4 border border-[#1F2937]"
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: '#1A2035' }}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-white font-bold text-base flex-1 mr-2" numberOfLines={1}>
              {project.name}
            </Text>
            <StatusBadge status={project.status} />
          </View>
          <Text className="text-[#6B7280] text-xs mb-2" numberOfLines={1}>{project.department}</Text>

          {/* Progress bar */}
          <View className="flex-row items-center gap-3 mb-2">
            <View className="flex-1 h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{ width: `${project.completion}%`, backgroundColor: s.text }}
              />
            </View>
            <Text style={{ color: s.text }} className="text-xs font-bold">{project.completion}%</Text>
          </View>

          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <Text className="text-[#9CA3AF] text-xs">📍 {project.distance}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-[#9CA3AF] text-xs">📅 {project.expectedCompletion}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-[#9CA3AF] text-xs">💰 {project.budget}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [filter, setFilter] = useState<string>('All');

  const FILTERS = ['All', 'In Progress', 'Completed', 'Delayed'];
  const filtered = filter === 'All' ? MOCK_PROJECTS : MOCK_PROJECTS.filter(p => p.status === filter);

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A]">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center gap-2 mb-1">
              <Text style={{ fontSize: 14 }}>📍</Text>
              <Text className="text-[#9CA3AF] text-sm font-medium">Hebbal, Bangalore</Text>
            </View>
            <Text className="text-white text-2xl font-bold">
              Projects <Text className="text-[#00D4AA]">Near You</Text>
            </Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="w-10 h-10 rounded-2xl bg-[#111827] items-center justify-center border border-[#1F2937]"
              onPress={() => router.push('/analytics')}
            >
              <Text style={{ fontSize: 16 }}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 rounded-2xl bg-[#111827] items-center justify-center border border-[#1F2937]"
              onPress={() => router.push('/updates')}
            >
              <Text style={{ fontSize: 16 }}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
          {[
            { label: 'Active', value: '12', icon: '🏗️', color: '#00D4AA' },
            { label: 'Completed', value: '4', icon: '✅', color: '#10B981' },
            { label: 'Delayed', value: '2', icon: '⚠️', color: '#EF4444' },
            { label: 'Budget', value: '₹1.2k Cr', icon: '💰', color: '#F59E0B' },
          ].map((stat) => (
            <View key={stat.label}
              className="bg-[#111827] rounded-2xl px-4 py-3 mr-3 items-center border border-[#1F2937]"
              style={{ minWidth: 90 }}
            >
              <Text style={{ fontSize: 20 }}>{stat.icon}</Text>
              <Text style={{ color: stat.color }} className="text-lg font-bold mt-1">{stat.value}</Text>
              <Text className="text-[#6B7280] text-xs">{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* View toggle */}
        <View className="flex-row mx-4 mb-4 bg-[#111827] rounded-2xl p-1 border border-[#1F2937]">
          <TouchableOpacity
            className="flex-1 py-2 rounded-xl items-center"
            style={{ backgroundColor: viewMode === 'map' ? '#00D4AA' : 'transparent' }}
            onPress={() => setViewMode('map')}
          >
            <Text className={`font-bold text-sm ${viewMode === 'map' ? 'text-black' : 'text-[#6B7280]'}`}>🗺️ Map View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-2 rounded-xl items-center"
            style={{ backgroundColor: viewMode === 'list' ? '#00D4AA' : 'transparent' }}
            onPress={() => setViewMode('list')}
          >
            <Text className={`font-bold text-sm ${viewMode === 'list' ? 'text-black' : 'text-[#6B7280]'}`}>📋 List View</Text>
          </TouchableOpacity>
        </View>

        {/* Map or List */}
        {viewMode === 'map' && <MapPlaceholder onToggle={() => setViewMode('list')} />}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              className="mr-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: filter === f ? '#00D4AA' : '#111827', borderWidth: 1, borderColor: filter === f ? '#00D4AA' : '#1F2937' }}
              onPress={() => setFilter(f)}
            >
              <Text className={`text-sm font-semibold ${filter === f ? 'text-black' : 'text-[#9CA3AF]'}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Projects list */}
        <Text className="text-white font-bold text-base px-4 mb-3">
          {filtered.length} project{filtered.length !== 1 ? 's' : ''} found
        </Text>
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onPress={() => router.push(`/project/${p.id}`)} />
        ))}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
