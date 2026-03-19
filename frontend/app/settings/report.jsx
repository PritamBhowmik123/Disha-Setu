import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportProblemScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isDark } = useColorScheme();
    const insets = useSafeAreaInsets();
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const categories = [
        t('help.categories.status'),
        t('help.categories.map'),
        t('help.categories.bug'),
        t('help.categories.content'),
        t('help.categories.other')
    ];

    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSubmit = () => {
        if (!category || !description) {
            Alert.alert(t('help.missing_info'), t('help.missing_info_desc'));
            return;
        }

        console.log('Reporting problem:', { category, description, image });
        Alert.alert(
            t('help.report_submitted'),
            t('help.report_submitted_desc'),
            [{ text: "OK", onPress: () => router.back() }]
        );
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
                    <Text className="text-txt text-2xl font-bold">{t('help.report')}</Text>
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-6 py-6" style={{ paddingBottom: 100 }}>
                        <Text className="text-txtMuted text-base mb-8">
                            {t('help.report_desc')}
                        </Text>

                        {/* Category Dropdown */}
                        <View className="mb-5 z-10">
                            <Text className="text-txt font-semibold mb-2 ml-1">{t('help.issue_category')}</Text>
                            <TouchableOpacity
                                onPress={() => setShowDropdown(!showDropdown)}
                                className="bg-card rounded-2xl px-4 py-3 border border-cardBorder flex-row items-center justify-between"
                            >
                                <Text className={category ? "text-txt text-base" : "text-txtMuted text-base"}>
                                    {category || t('help.cat_placeholder')}
                                </Text>
                                <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={iconDim} />
                            </TouchableOpacity>

                            {showDropdown && (
                                <View className="mt-2 bg-card rounded-2xl border border-cardBorder overflow-hidden">
                                    {categories.map((cat, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            className="px-4 py-3 border-b border-cardBorder last:border-0"
                                            onPress={() => {
                                                setCategory(cat);
                                                setShowDropdown(false);
                                            }}
                                        >
                                            <Text className="text-txt text-base">{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Description */}
                        <View className="mb-5">
                            <Text className="text-txt font-semibold mb-2 ml-1">{t('help.problem_desc')}</Text>
                            <View className="bg-card rounded-2xl px-4 py-3 border border-cardBorder">
                                <TextInput
                                    className="text-txt text-base"
                                    placeholder={t('help.desc_placeholder')}
                                    placeholderTextColor={iconDim}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                    style={{ height: 120 }}
                                />
                            </View>
                        </View>

                        {/* Image Picker */}
                        <View className="mb-8">
                            <Text className="text-txt font-semibold mb-2 ml-1">{t('help.add_screenshot')}</Text>
                            {image ? (
                                <View className="relative">
                                    <Image
                                        source={{ uri: image }}
                                        className="w-full h-48 rounded-2xl"
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setImage(null)}
                                        className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                                    >
                                        <Ionicons name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={pickImage}
                                    className="bg-card rounded-2xl h-32 border border-dashed border-cardBorder items-center justify-center"
                                >
                                    <View className="bg-surface w-12 h-12 rounded-full items-center justify-center mb-2">
                                        <Ionicons name="camera" size={24} color="#00D4AA" />
                                    </View>
                                    <Text className="text-txtMuted text-sm">{t('help.tap_upload')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            className="bg-[#00D4AA] py-4 rounded-2xl items-center shadow-lg shadow-[#00D4AA30]"
                            onPress={handleSubmit}
                        >
                            <Text className="text-black font-bold text-lg">{t('help.submit_report')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
