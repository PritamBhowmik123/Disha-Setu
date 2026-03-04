import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const slides = [
    {
        icon: 'business-outline',
        title: 'What is DishaSetu?',
        subtitle: 'Civic Transparency at Your Fingertips',
        description: "DishaSetu connects citizens with public infrastructure projects happening around them — in real time. Know what's being built, by whom, and when it'll be done.",
        color: '#00D4AA',
    },
    {
        icon: 'map-outline',
        title: 'How It Works',
        subtitle: 'Location-Powered Intelligence',
        description: "Our system detects public development sites within your area. View projects on a live map, track progress milestones, and get instant updates when something changes near you.",
        color: '#6366F1',
    },
    {
        icon: 'notifications-outline',
        title: 'Stay Informed',
        subtitle: 'Feedback. Transparency. Impact.',
        description: "Report issues, give feedback, and track your complaints. When you enter a geo-fenced zone, you'll get instant notifications about what's being built right around you.",
        color: '#F59E0B',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [permissionsStep, setPermissionsStep] = useState(false);
    const scrollRef = useRef(null);

    const goNext = () => {
        if (currentIndex < slides.length - 1) {
            const next = currentIndex + 1;
            scrollRef.current?.scrollTo({ x: next * width, animated: true });
            setCurrentIndex(next);
        } else {
            setPermissionsStep(true);
        }
    };

    if (permissionsStep) {
        return (
            <SafeAreaView className="flex-1 bg-[#0A0E1A]">
                <View className="flex-1 items-center justify-center px-8">
                    <View className="w-24 h-24 rounded-3xl bg-[#111827] items-center justify-center mb-8 border border-[#1F2937]">
                        <Ionicons name="shield-checkmark-outline" size={44} color="#00D4AA" />
                    </View>
                    <Text className="text-white text-3xl font-bold text-center mb-3">Enable Permissions</Text>
                    <Text className="text-[#9CA3AF] text-base text-center leading-6 mb-10">
                        DishaSetu needs access to your location to detect nearby projects and send relevant notifications.
                    </Text>

                    <View className="w-full gap-4 mb-10">
                        <View className="flex-row items-center bg-[#111827] rounded-2xl p-4 border border-[#00D4AA]/30">
                            <View className="w-10 h-10 rounded-xl bg-[#00D4AA20] items-center justify-center mr-4">
                                <Ionicons name="location" size={20} color="#00D4AA" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-semibold text-base">Location Access</Text>
                                <Text className="text-[#9CA3AF] text-sm">Required to detect nearby projects</Text>
                            </View>
                            <View className="w-6 h-6 rounded-full bg-[#00D4AA] items-center justify-center">
                                <Ionicons name="checkmark" size={14} color="#000" />
                            </View>
                        </View>

                        <View className="flex-row items-center bg-[#111827] rounded-2xl p-4 border border-[#1F2937]">
                            <View className="w-10 h-10 rounded-xl bg-[#6366F120] items-center justify-center mr-4">
                                <Ionicons name="notifications-outline" size={20} color="#6366F1" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-semibold text-base">Notifications</Text>
                                <Text className="text-[#9CA3AF] text-sm">Recommended for geo-fence alerts</Text>
                            </View>
                            <View className="w-6 h-6 rounded-full bg-[#6366F1] items-center justify-center">
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        className="w-full bg-[#00D4AA] rounded-2xl py-4 items-center mb-4"
                        style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
                        onPress={() => router.replace('/auth')}
                        activeOpacity={0.85}
                    >
                        <Text className="text-black font-bold text-lg">Enable & Continue</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.replace('/auth')} activeOpacity={0.7}>
                        <Text className="text-[#6B7280] text-sm">Skip for now</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#0A0E1A]">
            <View className="flex-1">
                <TouchableOpacity
                    className="absolute top-4 right-6 z-10 px-4 py-2"
                    onPress={() => router.replace('/auth')}
                    activeOpacity={0.7}
                >
                    <Text className="text-[#6B7280] font-medium">Skip</Text>
                </TouchableOpacity>

                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                >
                    {slides.map((slide, index) => (
                        <View key={index} style={{ width }} className="flex-1 items-center justify-center px-8 pt-16 pb-8">
                            <View
                                className="w-32 h-32 rounded-3xl items-center justify-center mb-8"
                                style={{ backgroundColor: slide.color + '15', borderWidth: 1, borderColor: slide.color + '30' }}
                            >
                                <Ionicons name={slide.icon} size={64} color={slide.color} />
                            </View>
                            <Text style={{ color: slide.color }} className="text-sm font-semibold uppercase tracking-widest mb-3">
                                {slide.subtitle}
                            </Text>
                            <Text className="text-white text-3xl font-bold text-center mb-5 leading-9">
                                {slide.title}
                            </Text>
                            <Text className="text-[#9CA3AF] text-base text-center leading-7">
                                {slide.description}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Bottom controls */}
                <View className="px-8 pb-8 items-center">
                    <View className="flex-row gap-2 mb-8">
                        {slides.map((_, i) => (
                            <View
                                key={i}
                                style={{
                                    width: i === currentIndex ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: i === currentIndex ? slides[currentIndex].color : '#374151',
                                }}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        className="w-full rounded-2xl py-4 items-center"
                        style={{
                            backgroundColor: slides[currentIndex].color,
                            shadowColor: slides[currentIndex].color,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                        onPress={goNext}
                        activeOpacity={0.85}
                    >
                        <Text className="text-black font-bold text-lg">
                            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
