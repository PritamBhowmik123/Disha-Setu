import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ContactSupportScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isDark } = useColorScheme();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});

    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const validate = () => {
        let newErrors = {};
        if (!name) newErrors.name = t('help.name_required');
        if (!email) {
            newErrors.email = t('help.email_required');
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('help.email_invalid');
        }
        if (!message) newErrors.message = t('help.message_required');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            console.log('Sending message:', { name, email, message });
            Alert.alert(
                t('help.msg_sent'),
                t('help.msg_sent_desc'),
                [{ text: "OK", onPress: () => router.back() }]
            );
        }
    };

    return (
        <View className="flex-1 bg-main" style={{ paddingTop: insets.top }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-card items-center justify-center border border-cardBorder mr-4"
                    >
                        <Ionicons name="arrow-back" size={24} color="#00D4AA" />
                    </TouchableOpacity>
                    <Text className="text-txt text-2xl font-bold">{t('help.contact')}</Text>
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-6 py-6" style={{ paddingBottom: 40 }}>
                        <Text className="text-txtMuted text-base mb-8">
                            {t('help.contact_desc')}
                        </Text>

                        {/* Name Input */}
                        <View className="mb-5">
                            <Text className="text-txt font-semibold mb-2 ml-1">{t('help.full_name')}</Text>
                            <View className={`bg-card rounded-2xl px-4 py-3 border ${errors.name ? 'border-red-500' : 'border-cardBorder'}`}>
                                <TextInput
                                    className="text-txt text-base"
                                    placeholder={t('help.name_placeholder')}
                                    placeholderTextColor={iconDim}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            {errors.name && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.name}</Text>}
                        </View>

                        {/* Email Input */}
                        <View className="mb-5">
                            <Text className="text-txt font-semibold mb-2 ml-1">{t('help.email_address')}</Text>
                            <View className={`bg-card rounded-2xl px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-cardBorder'}`}>
                                <TextInput
                                    className="text-txt text-base"
                                    placeholder={t('help.email_placeholder')}
                                    placeholderTextColor={iconDim}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            {errors.email && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.email}</Text>}
                        </View>

                        {/* Message Input */}
                        <View className="mb-8">
                            <Text className="text-txt font-semibold mb-2 ml-1">{t('help.message')}</Text>
                            <View className={`bg-card rounded-2xl px-4 py-3 border ${errors.message ? 'border-red-500' : 'border-cardBorder'}`}>
                                <TextInput
                                    className="text-txt text-base"
                                    placeholder={t('help.msg_placeholder')}
                                    placeholderTextColor={iconDim}
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    style={{ height: 120 }}
                                />
                            </View>
                            {errors.message && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.message}</Text>}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            className="bg-[#00D4AA] py-4 rounded-2xl items-center shadow-lg shadow-[#00D4AA30]"
                            onPress={handleSubmit}
                        >
                            <Text className="text-black font-bold text-lg">{t('help.send_msg')}</Text>
                        </TouchableOpacity>

                        {/* Info Footer */}
                        <View className="mt-8 flex-row items-center justify-center">
                            <Ionicons name="time-outline" size={16} color={iconDim} />
                            <Text className="text-txtMuted text-xs ml-2">{t('help.replies_in')}</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
