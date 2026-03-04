import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROJECTS } from '../constants/mockData';

const CATEGORY_STATS = [
  { category: 'Roads', count: 5, budget: '₹88 Cr', color: '#F59E0B', icon: '🛣️' },
  { category: 'Metro', count: 2, budget: '₹840 Cr', color: '#6366F1', icon: '🚇' },
  { category: 'Hospitals', count: 1, budget: '₹45 Cr', color: '#EF4444', icon: '🏥' },
  { category: 'Bridges', count: 2, budget: '₹240 Cr', color: '#00D4AA', icon: '🌉' },
  { category: 'Education', count: 2, budget: '₹62 Cr', color: '#10B981', icon: '🏫' },
];

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <View className="flex-row items-end justify-between h-32 mt-4 mb-2">
      {data.map((d, i) => (
        <View key={i} className="flex-1 items-center mx-1">
          <Text className="text-white text-xs font-bold mb-1">{d.value}</Text>
          <View className="w-full rounded-t-xl" style={{ height: (d.value / max) * 100, backgroundColor: d.color }} />
          <Text className="text-[#6B7280] text-xs mt-1" numberOfLines={1}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function DonutProgress({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  // Simple circle with text — native donut approximation
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 8,
          borderColor: color + '30',
        }}
        className="items-center justify-center absolute"
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 8,
          borderColor: color,
          borderBottomColor: 'transparent',
          borderRightColor: value > 50 ? color : 'transparent',
          transform: [{ rotate: `${(value / 100) * 360 - 90}deg` }],
        }}
        className="absolute"
      />
      <Text style={{ color, fontSize: size / 4 }} className="font-bold">{value}%</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();

  const avgCompletion = Math.round(MOCK_PROJECTS.reduce((s, p) => s + p.completion, 0) / MOCK_PROJECTS.length);
  const inProgress = MOCK_PROJECTS.filter(p => p.status === 'In Progress').length;
  const completed = MOCK_PROJECTS.filter(p => p.status === 'Completed').length;
  const delayed = MOCK_PROJECTS.filter(p => p.status === 'Delayed').length;

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A]" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pt-4 pb-4 flex-row items-center">
          <TouchableOpacity className="flex-row items-center mr-4" onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-[#00D4AA] text-lg mr-2">←</Text>
          </TouchableOpacity>
          <View>
            <Text className="text-white text-2xl font-bold">Civic <Text className="text-[#F59E0B]">Intelligence</Text></Text>
            <Text className="text-[#9CA3AF] text-sm">Bangalore North District · 2025</Text>
          </View>
        </View>

        {/* Overview cards */}
        <View className="flex-row px-4 gap-3 mb-4">
          <View className="flex-1 bg-[#111827] rounded-3xl p-4 items-center border border-[#1F2937]">
            <Text className="text-[#00D4AA] text-3xl font-bold">{MOCK_PROJECTS.length}</Text>
            <Text className="text-[#9CA3AF] text-xs text-center mt-1">Active Projects</Text>
            <Text className="text-[#4B5563] text-xs">in your area</Text>
          </View>
          <View className="flex-1 bg-[#111827] rounded-3xl p-4 items-center border border-[#1F2937]">
            <Text className="text-[#F59E0B] text-3xl font-bold">₹1.2k</Text>
            <Text className="text-[#9CA3AF] text-xs text-center mt-1">Cr Allocated</Text>
            <Text className="text-[#4B5563] text-xs">district budget</Text>
          </View>
        </View>

        {/* Status breakdown */}
        <View className="mx-4 mb-4 bg-[#111827] rounded-3xl p-5 border border-[#1F2937]">
          <Text className="text-white font-bold text-base mb-4">📊 Project Status</Text>
          <View className="flex-row items-center justify-around">
            <View className="items-center">
              <DonutProgress value={Math.round(inProgress / MOCK_PROJECTS.length * 100)} color="#00D4AA" />
              <Text className="text-[#9CA3AF] text-xs mt-2">In Progress</Text>
              <Text className="text-white font-bold">{inProgress}</Text>
            </View>
            <View className="items-center">
              <DonutProgress value={Math.round(completed / MOCK_PROJECTS.length * 100)} color="#10B981" />
              <Text className="text-[#9CA3AF] text-xs mt-2">Completed</Text>
              <Text className="text-white font-bold">{completed}</Text>
            </View>
            <View className="items-center">
              <DonutProgress value={Math.round(delayed / MOCK_PROJECTS.length * 100)} color="#EF4444" />
              <Text className="text-[#9CA3AF] text-xs mt-2">Delayed</Text>
              <Text className="text-white font-bold">{delayed}</Text>
            </View>
          </View>

          {/* Avg Completion */}
          <View className="mt-5 pt-4 border-t border-[#1F2937]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#9CA3AF] text-sm">Average Completion Rate</Text>
              <Text className="text-[#00D4AA] font-bold text-base">{avgCompletion}%</Text>
            </View>
            <View className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
              <View className="h-full rounded-full bg-[#00D4AA]" style={{ width: `${avgCompletion}%` }} />
            </View>
          </View>
        </View>

        {/* Projects by category */}
        <View className="mx-4 mb-4 bg-[#111827] rounded-3xl p-5 border border-[#1F2937]">
          <Text className="text-white font-bold text-base mb-2">🏗️ Projects by Category</Text>
          <BarChart
            data={[
              { label: 'Roads', value: 5, color: '#F59E0B' },
              { label: 'Metro', value: 2, color: '#6366F1' },
              { label: 'Hospital', value: 1, color: '#EF4444' },
              { label: 'Bridge', value: 2, color: '#00D4AA' },
              { label: 'College', value: 2, color: '#10B981' },
            ]}
          />
        </View>

        {/* Budget breakdown */}
        <View className="mx-4 mb-4 bg-[#111827] rounded-3xl p-5 border border-[#1F2937]">
          <Text className="text-white font-bold text-base mb-4">💰 Budget by Category</Text>
          {CATEGORY_STATS.map(cat => (
            <View key={cat.category} className="mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-2">
                  <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                  <Text className="text-[#9CA3AF] text-sm">{cat.category}</Text>
                </View>
                <Text style={{ color: cat.color }} className="font-bold text-sm">{cat.budget}</Text>
              </View>
              <View className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${(parseInt(cat.budget.replace(/[₹,Cr\s]/g, '')) / 940) * 100}%`,
                    backgroundColor: cat.color
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Most delayed */}
        <View className="mx-4 mb-4 bg-[#EF444415] rounded-3xl p-5 border border-[#EF4444]/20">
          <Text className="text-[#EF4444] font-bold text-base mb-3">⚠️ Most Delayed Category</Text>
          <View className="flex-row items-center">
            <Text style={{ fontSize: 32 }} className="mr-4">🏥</Text>
            <View>
              <Text className="text-white font-bold text-base">Healthcare Projects</Text>
              <Text className="text-[#9CA3AF] text-sm">Avg 4.2 months behind schedule</Text>
            </View>
          </View>
        </View>

        {/* Insight card */}
        <View className="mx-4 mb-8 bg-[#00D4AA15] rounded-3xl p-5 border border-[#00D4AA]/20">
          <Text className="text-[#00D4AA] font-bold text-base mb-2">💡 Civic Insight</Text>
          <Text className="text-[#9CA3AF] text-sm leading-6">
            Your district has ₹1.2k Cr in active infrastructure investment. Metro projects account for 70% of total spending,
            while road repairs show the fastest completion rates at 93%.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
