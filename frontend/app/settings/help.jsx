import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SupportRow({ icon, title, onPress }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <TouchableOpacity
            className="flex-row items-center py-4 border-b border-cardBorder last:border-0"
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-4">
                <Ionicons name={icon} size={20} color="#00D4AA" />
            </View>
            <Text className="flex-1 text-base font-medium text-txt">{title}</Text>
            <Ionicons name="chevron-forward" size={20} color={iconDim} />
        </TouchableOpacity>
    );
}

export default function HelpCenterScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isDark } = useColorScheme();
    const insets = useSafeAreaInsets();

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
                <Text className="text-txt text-2xl font-bold">{t('help.title')}</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-6 py-4">
                    <Text className="text-txtMuted text-sm font-semibold mb-4 uppercase tracking-wider ml-2">{t('help.options')}</Text>

                    <View className="bg-card rounded-3xl px-5 border border-cardBorder">
                        <SupportRow
                            icon="help-circle"
                            title={t('help.faq')}
                            onPress={() => router.push('/settings/faq')}
                        />
                        <SupportRow
                            icon="chatbubbles"
                            title={t('help.contact')}
                            onPress={() => router.push('/settings/contact')}
                        />
                        <SupportRow
                            icon="alert-circle"
                            title={t('help.report')}
                            onPress={() => router.push('/settings/report')}
                        />
                    </View>

                    {/* Quick Help Card */}
                    <View className="mt-8 bg-[#00D4AA20] rounded-3xl p-6 border border-[#00D4AA30]">
                        <Text className="text-txt font-bold text-lg mb-2">{t('help.need_help')}</Text>
                        <Text className="text-txtMuted text-sm mb-4">{t('help.immediate_desc')}</Text>
                        <TouchableOpacity
                            className="bg-[#00D4AA] py-3 rounded-xl items-center"
                            onPress={() => router.push('/settings/contact')}
                        >
                            <Text className="text-black font-bold">{t('help.message_us')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
