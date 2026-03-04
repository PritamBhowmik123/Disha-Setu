import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROJECTS } from '../constants/mockData';

const CATEGORIES = [
  { id: 'delay', label: 'Delay', icon: '⏱️' },
  { id: 'safety', label: 'Safety Issue', icon: '⚠️' },
  { id: 'noise', label: 'Noise', icon: '🔊' },
  { id: 'traffic', label: 'Traffic Issue', icon: '🚦' },
  { id: 'corruption', label: 'Corruption Concern', icon: '🔍' },
  { id: 'other', label: 'Other', icon: '📋' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ticketId] = useState(`GF-2025-${String(Math.floor(1000 + Math.random() * 9000))}`);

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
            <Text style={{ fontSize: 48 }}>✅</Text>
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
    <SafeAreaView className="flex-1 bg-[#0A0E1A]" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="px-4 pt-4 pb-4">
          <TouchableOpacity className="flex-row items-center mb-4" onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-[#00D4AA] text-lg mr-2">←</Text>
            <Text className="text-[#00D4AA] font-semibold">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold mb-1">Report <Text className="text-[#EF4444]">an Issue</Text></Text>
          <Text className="text-[#9CA3AF] text-sm">Help us improve civic projects in your area</Text>
        </View>

        {/* Step 1: Select Project */}
        <View className="px-4 mb-5">
          <Text className="text-[#9CA3AF] text-xs font-bold uppercase tracking-wider mb-3">1. Select Project</Text>
          {MOCK_PROJECTS.map(p => (
            <TouchableOpacity
              key={p.id}
              className="flex-row items-center bg-[#111827] rounded-2xl p-3.5 mb-2 border"
              style={{ borderColor: selectedProject === p.id ? '#00D4AA' : '#1F2937' }}
              onPress={() => setSelectedProject(p.id)}
              activeOpacity={0.85}
            >
              <View
                className="w-5 h-5 rounded-full mr-3 border-2 items-center justify-center"
                style={{ borderColor: selectedProject === p.id ? '#00D4AA' : '#374151' }}
              >
                {selectedProject === p.id && <View className="w-2.5 h-2.5 rounded-full bg-[#00D4AA]" />}
              </View>
              <Text className="text-white text-sm font-medium flex-1" numberOfLines={1}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 2: Category */}
        <View className="px-4 mb-5">
          <Text className="text-[#9CA3AF] text-xs font-bold uppercase tracking-wider mb-3">2. Issue Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                className="flex-row items-center rounded-2xl px-4 py-3 border"
                style={{
                  backgroundColor: selectedCategory === cat.id ? '#EF444420' : '#111827',
                  borderColor: selectedCategory === cat.id ? '#EF4444' : '#1F2937',
                }}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 16 }} className="mr-2">{cat.icon}</Text>
                <Text className={`text-sm font-semibold ${selectedCategory === cat.id ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 3: Description */}
        <View className="px-4 mb-5">
          <Text className="text-[#9CA3AF] text-xs font-bold uppercase tracking-wider mb-3">3. Description</Text>
          <TextInput
            className="bg-[#111827] text-white rounded-2xl p-4 border border-[#1F2937] text-sm leading-6"
            placeholder="Describe the issue in detail... (min. 10 characters)"
            placeholderTextColor="#4B5563"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={{ minHeight: 120 }}
            value={description}
            onChangeText={setDescription}
          />
          <Text className="text-[#4B5563] text-xs mt-1 text-right">{description.length} chars</Text>
        </View>

        {/* Step 4: Photo optional */}
        <View className="px-4 mb-6">
          <Text className="text-[#9CA3AF] text-xs font-bold uppercase tracking-wider mb-3">4. Photo (Optional)</Text>
          <TouchableOpacity
            className="bg-[#111827] rounded-2xl h-24 items-center justify-center border border-dashed border-[#374151]"
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 24 }} className="mb-1">📷</Text>
            <Text className="text-[#6B7280] text-sm">Tap to add a photo</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <View className="px-4 mb-8">
          <TouchableOpacity
            className="w-full rounded-2xl py-4 items-center"
            style={{
              backgroundColor: isValid ? '#EF4444' : '#1F2937',
              shadowColor: isValid ? '#EF4444' : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: isValid ? 8 : 0,
            }}
            onPress={handleSubmit}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text className={`font-bold text-lg ${isValid ? 'text-white' : 'text-[#4B5563]'}`}>
              🚨 Submit Report
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
