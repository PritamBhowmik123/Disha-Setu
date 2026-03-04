import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_ACTIVITY, type ActivityItem } from '../../constants/mockData';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'Pending': { bg: '#F59E0B20', text: '#F59E0B' },
  'Under Review': { bg: '#6366F120', text: '#6366F1' },
  'Resolved': { bg: '#10B98120', text: '#10B981' },
  'Saved': { bg: '#00D4AA20', text: '#00D4AA' },
};

const TYPE_ICONS: Record<ActivityItem['type'], string> = {
  feedback: '💬',
  saved: '🔖',
  reported: '🚨',
};

export default function ActivityScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A]">
      {/* Header */}
      <View className="px-4 pt-4 pb-4">
        <Text className="text-white text-2xl font-bold mb-1">My <Text className="text-[#F59E0B]">Activity</Text></Text>
        <Text className="text-[#9CA3AF] text-sm">Track your feedback and saved projects</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View className="flex-row px-4 gap-3 mb-6">
          {[
            { label: 'Submitted', value: '2', icon: '💬', color: '#6366F1' },
            { label: 'Resolved', value: '1', icon: '✅', color: '#10B981' },
            { label: 'Saved', value: '1', icon: '🔖', color: '#00D4AA' },
          ].map(stat => (
            <View key={stat.label} className="flex-1 bg-[#111827] rounded-2xl p-3 items-center border border-[#1F2937]">
              <Text style={{ fontSize: 20 }}>{stat.icon}</Text>
              <Text style={{ color: stat.color }} className="text-xl font-bold mt-1">{stat.value}</Text>
              <Text className="text-[#6B7280] text-xs">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Activity list */}
        <Text className="text-white font-bold text-base px-4 mb-3">Recent Activity</Text>
        {MOCK_ACTIVITY.map(item => {
          const s = STATUS_STYLE[item.status] || STATUS_STYLE['Pending'];
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/project/${item.type === 'saved' ? '2' : '1'}`)}
              activeOpacity={0.85}
              className="mx-4 mb-3 bg-[#111827] rounded-3xl p-4 border border-[#1F2937]"
            >
              <View className="flex-row items-start">
                <View className="w-12 h-12 rounded-2xl bg-[#1A2035] items-center justify-center mr-3">
                  <Text style={{ fontSize: 22 }}>{TYPE_ICONS[item.type]}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-white font-bold text-sm flex-1 mr-2">{item.title}</Text>
                    <View style={{ backgroundColor: s.bg }} className="rounded-full px-2 py-0.5">
                      <Text style={{ color: s.text }} className="text-xs font-bold">{item.status}</Text>
                    </View>
                  </View>
                  <Text className="text-[#9CA3AF] text-xs mb-1.5">{item.projectName}</Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[#4B5563] text-xs">📅 {item.date}</Text>
                    {item.ticketId && (
                      <View className="bg-[#1A2035] rounded-full px-2 py-0.5">
                        <Text className="text-[#6B7280] text-xs font-mono">{item.ticketId}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* CTA */}
        <View className="mx-4 mt-2 mb-6">
          <TouchableOpacity
            className="bg-[#111827] rounded-3xl p-5 border border-dashed border-[#1F2937] items-center"
            onPress={() => router.push('/feedback')}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 32 }} className="mb-2">📣</Text>
            <Text className="text-white font-bold text-base mb-1">Report an Issue</Text>
            <Text className="text-[#6B7280] text-sm text-center">Spotted a problem? Submit a complaint and track its resolution.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
