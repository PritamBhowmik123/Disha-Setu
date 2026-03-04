import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

function ActivityItem({ activity, isLast }) {
    const getIconStatus = () => {
        switch (activity.type) {
            case 'feedback': return { icon: 'chatbubble', color: '#6366F1', bg: '#6366F120' };
            case 'saved': return { icon: 'bookmark', color: '#F59E0B', bg: '#F59E0B20' };
            case 'report': return { icon: 'alert-circle', color: '#EF4444', bg: '#EF444420' };
            default: return { icon: 'time', color: '#9CA3AF', bg: 'var(--bg-surface)' };
        }
    };

    const { icon, color, bg } = getIconStatus();

    return (
        <View className="flex-row">
            <View className="items-center mr-4">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: bg }}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                {!isLast && <View className="w-px h-16 bg-cardBorder my-1" />}
            </View>

            <View className="flex-1 pt-1 pb-6">
                <Text className="text-txtMuted text-xs mb-1">{activity.time}</Text>
                <Text className="text-txt font-semibold text-base mb-1">{activity.title}</Text>
                <Text className="text-txtMuted text-sm leading-5">
                    {activity.project} · {activity.id === '1' ? 'Resolved' : 'Pending'}
                </Text>
            </View>
        </View>
    );
}

export default function ActivityScreen() {
    const activities = [
        { id: '1', type: 'feedback', title: 'Feedback Submitted', project: 'Hebbal Flyover Extension', time: '2 days ago' },
        { id: '2', type: 'saved', title: 'Project Saved', project: 'Silk Board Metro Station', time: '5 days ago' },
        { id: '3', type: 'report', title: 'Pothole Reported', project: 'Outer Ring Road (Sector 4)', time: '1 week ago' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="px-6 pt-6 pb-4">
                <Text className="text-txt text-3xl font-bold">Your Impact</Text>
                <Text className="text-txtMuted text-sm mt-1">Track your civic contributions</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Stats */}
                <View className="flex-row px-6 mb-8 gap-3">
                    <View className="flex-1 bg-card rounded-3xl p-4 border border-cardBorder">
                        <View className="w-10 h-10 rounded-full bg-[#00D4AA20] items-center justify-center mb-3">
                            <Ionicons name="chatbubbles" size={20} color="#00D4AA" />
                        </View>
                        <Text className="text-txt text-2xl font-bold mb-1">12</Text>
                        <Text className="text-txtMuted text-xs font-medium">Feedbacks</Text>
                    </View>
                    <View className="flex-1 bg-card rounded-3xl p-4 border border-cardBorder">
                        <View className="w-10 h-10 rounded-full bg-[#6366F120] items-center justify-center mb-3">
                            <Ionicons name="checkmark-done-circle" size={20} color="#6366F1" />
                        </View>
                        <Text className="text-txt text-2xl font-bold mb-1">8</Text>
                        <Text className="text-txtMuted text-xs font-medium">Resolved</Text>
                    </View>
                </View>

                {/* Level Banner */}
                <View className="mx-6 mb-8 bg-[#00D4AA] rounded-3xl p-5"
                    style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}
                >
                    <View className="flex-row items-center justify-between mb-3">
                        <View>
                            <Text className="text-black/70 text-sm font-bold uppercase tracking-wider mb-1">Current Level</Text>
                            <Text className="text-black text-xl font-bold">Civic Guardian</Text>
                        </View>
                        <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                            <Ionicons name="star" size={24} color="#000" />
                        </View>
                    </View>
                    <View className="h-2 bg-black/10 rounded-full overflow-hidden mb-2">
                        <View className="w-3/4 h-full bg-black rounded-full" />
                    </View>
                    <Text className="text-black/80 text-xs font-medium">150 pts to next level</Text>
                </View>

                {/* Timeline */}
                <View className="px-6 mb-8">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-txt text-lg font-bold">Recent Activity</Text>
                        <TouchableOpacity><Text className="text-[#00D4AA] text-sm font-semibold">View All</Text></TouchableOpacity>
                    </View>

                    <View className="bg-card rounded-3xl p-5 pt-6 border border-cardBorder">
                        {activities.map((activity, index) => (
                            <ActivityItem
                                key={activity.id}
                                activity={activity}
                                isLast={index === activities.length - 1}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
