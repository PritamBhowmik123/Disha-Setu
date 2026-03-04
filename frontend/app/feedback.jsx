import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MOCK_PROJECTS } from '../constants/mockData';
import { useColorScheme } from '../hooks/use-color-scheme';

const CATEGORIES = [
    { id: 'delay', label: 'Delay', icon: 'time-outline' },
    { id: 'safety', label: 'Safety Issue', icon: 'shield-outline' },
    { id: 'noise', label: 'Noise', icon: 'volume-high-outline' },
    { id: 'traffic', label: 'Traffic Issue', icon: 'car-outline' },
    { id: 'corruption', label: 'Corruption Concern', icon: 'eye-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export default function FeedbackScreen() {
    const router = useRouter();
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [description, setDescription] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [ticketId] = useState(`GF-2025-${String(Math.floor(1000 + Math.random() * 9000))}`);
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const bgCard = isDark ? '#111827' : '#FFFFFF';
    const bgCardBorder = isDark ? '#1F2937' : '#E5E7EB';

    const handleSubmit = () => {
        if (selectedProject && selectedCategory && description.trim().length > 10) {
            setSubmitted(true);
        }
    };

    if (submitted) {
        return (
            <SafeAreaView className="flex-1 bg-[#0A0E1A] items-center justify-center px-8">
                <View className="items-center">
                    <View className="w-24 h-24 rounded-full bg-[#10B98120] items-center justify-center mb-6 border border-[#10B981]/30">
                        <Ionicons name="checkmark-circle" size={52} color="#10B981" />
                    </View>
                    <Text className="text-white text-2xl font-bold mb-3">Report Submitted!</Text>
                    <Text className="text-[#9CA3AF] text-base text-center mb-6 leading-6">
                        Your complaint has been recorded. Our team will review it shortly.
                    </Text>

                    <View className="bg-[#111827] rounded-3xl p-5 w-full border border-[#1F2937] mb-8">
                        <Text className="text-[#6B7280] text-xs text-center mb-2">Your Ticket ID</Text>
                        <Text className="text-[#00D4AA] text-2xl font-bold text-center font-mono">{ticketId}</Text>
                        <Text className="text-[#4B5563] text-xs text-center mt-2">Save this ID to track your complaint status</Text>
                    </View>

                    <TouchableOpacity
                        className="w-full bg-[#00D4AA] rounded-2xl py-4 items-center mb-3"
                        style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
                        onPress={() => router.replace('/(tabs)/activity')}
                        activeOpacity={0.85}
                    >
                        <Text className="text-black font-bold text-base">View My Activity</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                        <Text className="text-[#6B7280] text-sm">Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isValid = selectedProject && selectedCategory && description.trim().length > 10;

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View className="px-4 pt-4 pb-4">
                    <TouchableOpacity className="flex-row items-center mb-4 gap-1" onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={20} color="#00D4AA" />
                        <Text className="text-[#00D4AA] font-semibold">Back</Text>
                    </TouchableOpacity>
                    <Text className="text-txt text-2xl font-bold mb-1">
                        Report <Text className="text-[#EF4444]">an Issue</Text>
                    </Text>
                    <Text className="text-txtMuted text-sm">Help us improve civic projects in your area</Text>
                </View>

                {/* Step 1 */}
                <View className="px-4 mb-5">
                    <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider mb-3">1. Select Project</Text>
                    {MOCK_PROJECTS.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            className="flex-row items-center bg-card rounded-2xl p-3.5 mb-2 border"
                            style={{ borderColor: selectedProject === p.id ? '#00D4AA' : bgCardBorder }}
                            onPress={() => setSelectedProject(p.id)}
                            activeOpacity={0.85}
                        >
                            <View
                                className="w-5 h-5 rounded-full mr-3 border-2 items-center justify-center"
                                style={{ borderColor: selectedProject === p.id ? '#00D4AA' : iconDim }}
                            >
                                {selectedProject === p.id && <View className="w-2.5 h-2.5 rounded-full bg-[#00D4AA]" />}
                            </View>
                            <Text className="text-txt text-sm font-medium flex-1" numberOfLines={1}>{p.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Step 2 */}
                <View className="px-4 mb-5">
                    <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider mb-3">2. Issue Category</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                className="flex-row items-center rounded-2xl px-4 py-3 border gap-2"
                                style={{
                                    backgroundColor: selectedCategory === cat.id ? '#EF444420' : bgCard,
                                    borderColor: selectedCategory === cat.id ? '#EF4444' : bgCardBorder,
                                }}
                                onPress={() => setSelectedCategory(cat.id)}
                                activeOpacity={0.85}
                            >
                                <Ionicons name={cat.icon} size={16} color={selectedCategory === cat.id ? '#EF4444' : iconDim} />
                                <Text className={`text-sm font-semibold ${selectedCategory === cat.id ? 'text-[#EF4444]' : 'text-txtMuted'}`}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Step 3 */}
                <View className="px-4 mb-5">
                    <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider mb-3">3. Description</Text>
                    <TextInput
                        className="bg-card text-txt rounded-2xl p-4 border border-cardBorder text-sm leading-6"
                        placeholder="Describe the issue in detail... (min. 10 characters)"
                        placeholderTextColor={iconDim}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        style={{ minHeight: 120 }}
                        value={description}
                        onChangeText={setDescription}
                    />
                    <Text className="text-txtMuted text-xs mt-1 text-right">{description.length} chars</Text>
                </View>

                {/* Step 4: Photo */}
                <View className="px-4 mb-6">
                    <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider mb-3">4. Photo (Optional)</Text>
                    <TouchableOpacity
                        className="bg-card rounded-2xl h-24 items-center justify-center border border-dashed border-cardBorder gap-2"
                        activeOpacity={0.85}
                    >
                        <Ionicons name="camera-outline" size={26} color={iconDim} />
                        <Text className="text-txtMuted text-sm">Tap to add a photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Submit */}
                <View className="px-4 mb-8">
                    <TouchableOpacity
                        className="w-full rounded-2xl py-4 items-center flex-row justify-center gap-2"
                        style={{
                            backgroundColor: isValid ? '#EF4444' : bgCard,
                            shadowColor: isValid ? '#EF4444' : 'transparent',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: isValid ? 8 : 0,
                            borderWidth: isValid ? 0 : 1,
                            borderColor: bgCardBorder
                        }}
                        onPress={handleSubmit}
                        disabled={!isValid}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="send" size={18} color={isValid ? '#fff' : iconDim} />
                        <Text className={`font-bold text-lg ${isValid ? 'text-white' : 'text-txtMuted'}`}>
                            Submit Report
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
