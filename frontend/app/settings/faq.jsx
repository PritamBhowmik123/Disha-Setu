import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

function FAQItem({ question, answer, isOpen, onToggle, searchQuery }) {
    const { isDark } = useColorScheme();

    // Highlight search results in question
    const highlightTarget = (text, query) => {
        if (!query) return <Text className="text-txt font-bold flex-1 mr-4">{text}</Text>;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <Text className="text-txt font-bold flex-1 mr-4">
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase()
                        ? <Text key={i} className="bg-[#00D4AA] text-black">{part}</Text>
                        : <Text key={i}>{part}</Text>
                )}
            </Text>
        );
    };

    return (
        <View className="mb-3 bg-card rounded-2xl border border-cardBorder overflow-hidden">
            <TouchableOpacity
                className="p-4 flex-row items-center justify-between"
                onPress={onToggle}
                activeOpacity={0.7}
            >
                {highlightTarget(question, searchQuery)}
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#00D4AA" />
            </TouchableOpacity>
            {isOpen && (
                <View className="px-4 pb-4">
                    <View className="h-[1px] bg-cardBorder mb-4" />
                    <Text className="text-txtMuted text-sm leading-6">{answer}</Text>
                </View>
            )}
        </View>
    );
}

export default function FAQScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const FAQ_DATA = t('help.faqs', { returnObjects: true }) || [];
    const { isDark } = useColorScheme();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [openId, setOpenId] = useState(null);

    const toggleItem = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpenId(openId === id ? null : id);
    };

    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    // Filter FAQ data based on search
    const filteredData = Array.isArray(FAQ_DATA) ? FAQ_DATA.map(group => ({
        ...group,
        questions: group.questions.filter(faq =>
            faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(group => group.questions.length > 0) : [];

    return (
        <View className="flex-1 bg-main" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-card items-center justify-center border border-cardBorder mr-4"
                >
                    <Ionicons name="arrow-back" size={24} color="#00D4AA" />
                </TouchableOpacity>
                <Text className="text-txt text-2xl font-bold">{t('help.faq')}</Text>
            </View>

            {/* Search Bar */}
            <View className="px-6 mb-6">
                <View className="flex-row items-center bg-card rounded-2xl px-4 py-3 border border-cardBorder">
                    <Ionicons name="search" size={20} color={iconDim} />
                    <TextInput
                        className="flex-1 text-txt text-base ml-3"
                        placeholder={t('help.search_placeholder')}
                        placeholderTextColor={iconDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={iconDim} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-6 mb-8">
                    {filteredData.length > 0 ? (
                        filteredData.map(group => (
                            <View key={group.category} className="mb-6">
                                <Text className="text-txtMuted text-xs font-bold uppercase tracking-widest mb-3 ml-2">
                                    {group.category}
                                </Text>
                                {group.questions.map(faq => (
                                    <FAQItem
                                        key={faq.id}
                                        question={faq.q}
                                        answer={faq.a}
                                        searchQuery={searchQuery}
                                        isOpen={openId === faq.id}
                                        onToggle={() => toggleItem(faq.id)}
                                    />
                                ))}
                            </View>
                        ))
                    ) : (
                        <View className="items-center py-10">
                            <Ionicons name="help-circle-outline" size={64} color={iconDim} />
                            <Text className="text-txtMuted text-center mt-4">{t('help.no_results')}</Text>
                        </View>
                    )}
                </View>

                {/* Contact CTA */}
                <View className="px-6 mb-12">
                    <Text className="text-txtMuted text-center mb-4">{t('help.still_questions')}</Text>
                    <TouchableOpacity
                        className="bg-card py-4 rounded-2xl border border-cardBorder items-center flex-row justify-center"
                        onPress={() => router.push('/settings/contact')}
                    >
                        <Ionicons name="mail" size={20} color="#00D4AA" />
                        <Text className="text-[#00D4AA] font-bold ml-2">{t('help.contact')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
