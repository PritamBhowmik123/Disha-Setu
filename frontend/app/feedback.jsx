/**
 * app/feedback.jsx — Real feedback submission to backend
 */
import { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Image, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import InlineCropEditor from '../components/InlineCropEditor';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
import { submitFeedback } from '../services/feedbackService';
import { detectAIImage } from '../utils/aiImageDetector';

const CATEGORIES = [
    { id: 'delay', labelKey: 'feedback.categories.delay', icon: 'time-outline', color: '#F59E0B' },
    { id: 'safety', labelKey: 'feedback.categories.safety', icon: 'shield-outline', color: '#EF4444' },
    { id: 'noise', labelKey: 'feedback.categories.noise', icon: 'volume-high-outline', color: '#8B5CF6' },
    { id: 'traffic', labelKey: 'feedback.categories.traffic', icon: 'car-outline', color: '#F97316' },
    { id: 'corruption', labelKey: 'feedback.categories.corruption', icon: 'alert-circle-outline', color: '#EC4899' },
    { id: 'other', labelKey: 'feedback.categories.other', icon: 'help-circle-outline', color: '#6B7280' },
];

export default function FeedbackScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { projectId, projectName } = useLocalSearchParams();
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const [step, setStep] = useState(1); // 1=category, 2=description, 3=success
    const [category, setCategory] = useState(null);
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [ticket, setTicket] = useState(null);

    // ── Crop & Adjust state ──────────────────────────────────────────────────
    // pendingPhoto: raw asset from picker — when set, shows inline crop editor
    const [pendingPhoto, setPendingPhoto] = useState(null);
    // photoAspect: aspect ratio (w/h) of the confirmed/cropped photo
    const [photoAspect, setPhotoAspect] = useState(null);

    // ── AI validation state ─────────────────────────────────────────────────
    // null = no photo yet | 'checking' | 'real' | 'ai' | 'uncertain'
    const [aiValidation, setAiValidation] = useState(null);

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('settings.simulation_active')); // Generic permission message might need a key
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,  // full quality — manipulator compresses on confirm
            exif: true,    // for AI detector
        });
        if (!result.canceled) {
            // Clear any confirmed photo and show the inline crop editor
            setPhoto(null);
            setPhotoAspect(null);
            setAiValidation(null);
            setPendingPhoto(result.assets[0]);
        }
    };

    /** Called by InlineCropEditor when user taps Done */
    const handleEditConfirm = async ({ uri: processedUri, width: pw, height: ph }) => {
        const asset = pendingPhoto;
        setPendingPhoto(null);
        setPhoto({ uri: processedUri, name: `report_${Date.now()}.jpg`, type: 'image/jpeg' });
        setPhotoAspect(pw > 0 && ph > 0 ? pw / ph : null);

        // Trigger AI detection on the processed image
        setAiValidation('checking');
        const verdict = await detectAIImage({ ...asset, uri: processedUri });
        setAiValidation(verdict === 'uncertain' ? 'real' : verdict);
    };

    /** Called by InlineCropEditor when user taps Cancel */
    const handleEditCancel = () => {
        setPendingPhoto(null);
    };

    const handleSubmit = async () => {
        if (!category) return Alert.alert(t('feedback.issue_type'), t('feedback.placeholder_desc'));
        if (description.trim().length < 10) return Alert.alert(t('feedback.description'), t('feedback.placeholder_desc'));

        // ── Double-check AI validation before API call ──────────────────────
        if (photo && aiValidation === 'ai') {
            return Alert.alert(
                t('feedback.ai_detected'),
                t('feedback.ai_detected')
            );
        }

        setLoading(true);
        try {
            const data = await submitFeedback({
                project_id: projectId || '00000000-0000-0000-0000-000000000001',
                category,
                description,
                photo,
            });
            setTicket(data.ticketId);
            setStep(3);
        } catch (err) {
            Alert.alert(t('common.error'), err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    // Submit is blocked if: loading, no category, desc too short, OR photo is confirmed AI
    const submitDisabled = loading || !category || description.trim().length < 10 || aiValidation === 'ai';

    return (
        <SafeAreaView className="flex-1 bg-main" edges={['top', 'bottom']}>
            {/* Header */}
            <View className="flex-row items-center px-5 py-4 border-b border-cardBorder">
                <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color={iconDim} />
                </TouchableOpacity>
                <Text className="text-txt text-lg font-bold">
                    {step === 3 ? t('feedback.submitted_title') : t('feedback.title')}
                </Text>
            </View>

            {step === 3 ? (
                // Success screen
                <View className="flex-1 items-center justify-center px-8">
                    <View className="w-24 h-24 rounded-full bg-[#00D4AA20] items-center justify-center mb-6">
                        <Ionicons name="checkmark-circle" size={48} color="#00D4AA" />
                    </View>
                    <Text className="text-txt text-2xl font-bold mb-3 text-center">{t('feedback.thank_you')}</Text>
                    <Text className="text-txtMuted text-center text-sm leading-6 mb-8">
                        {t('feedback.success_msg')}
                    </Text>
                    <View className="bg-card rounded-2xl p-5 w-full border border-cardBorder mb-8">
                        <Text className="text-txtMuted text-xs text-center mb-2">{t('feedback.ticket_id')}</Text>
                        <Text className="text-[#00D4AA] text-3xl font-bold text-center tracking-widest">{ticket}</Text>
                        <Text className="text-txtMuted text-xs text-center mt-2">{t('feedback.save_id')}</Text>
                    </View>
                    <TouchableOpacity
                        className="w-full bg-[#00D4AA] rounded-2xl py-4 items-center mb-4"
                        onPress={() => router.back()}
                    >
                        <Text className="text-main font-bold text-base">{t('feedback.back_to_project')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setStep(1); setCategory(null); setDescription(''); setPhoto(null); setPhotoAspect(null); setAiValidation(null); }}>
                        <Text className="text-txtMuted text-sm">{t('feedback.submit_another')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {projectName && (
                        <View className="bg-card rounded-2xl p-4 border border-cardBorder mb-6">
                            <Text className="text-txtMuted text-xs mb-1">{t('feedback.reporting_for')}</Text>
                            <Text className="text-txt font-bold" numberOfLines={1}>{projectName}</Text>
                        </View>
                    )}

                    {/* Step 1: Category */}
                    <Text className="text-txt font-bold text-base mb-4">{t('feedback.issue_type')}</Text>
                    <View className="flex-row flex-wrap gap-3 mb-8">
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                className="flex-row items-center rounded-xl px-4 py-3 border"
                                style={{
                                    backgroundColor: category === cat.id ? `${cat.color}20` : isDark ? '#111827' : '#fff',
                                    borderColor: category === cat.id ? cat.color : isDark ? '#1F2937' : '#E5E7EB',
                                }}
                                onPress={() => setCategory(cat.id)}
                            >
                                <Ionicons name={cat.icon} size={16} color={category === cat.id ? cat.color : iconDim} />
                                <Text className="ml-2 font-semibold text-sm" style={{ color: category === cat.id ? cat.color : isDark ? '#9CA3AF' : '#6B7280' }}>
                                    {t(cat.labelKey)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Step 2: Description */}
                    <Text className="text-txt font-bold text-base mb-4">{t('feedback.description')}</Text>
                    <TextInput
                        className="bg-card border border-cardBorder rounded-2xl p-4 text-txt text-sm leading-6 mb-6"
                        style={{ minHeight: 120, textAlignVertical: 'top' }}
                        placeholder={t('feedback.placeholder_desc')}
                        placeholderTextColor={iconDim}
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />

                    {/* Photo attachment */}
                    <Text className="text-txt font-bold text-base mb-4">{t('feedback.photo_optional')}</Text>

                    {pendingPhoto ? (
                        /* ── Inline crop editor — appears in place of the picker ── */
                        <InlineCropEditor
                            uri={pendingPhoto.uri}
                            origWidth={pendingPhoto.width || 1000}
                            origHeight={pendingPhoto.height || 1000}
                            onConfirm={handleEditConfirm}
                            onCancel={handleEditCancel}
                        />
                    ) : (
                        <TouchableOpacity
                            className="bg-card border border-dashed border-cardBorder rounded-2xl p-6 items-center mb-2"
                            onPress={handlePickPhoto}
                        >
                            {photo ? (
                                <View className="w-full">
                                    {/* Full natural-ratio image — entire cropped photo visible */}
                                    <Image
                                        source={{ uri: photo.uri }}
                                        style={{
                                            width: '100%',
                                            aspectRatio: photoAspect ?? 4 / 3,
                                            borderRadius: 12,
                                        }}
                                        resizeMode="contain"
                                    />
                                    <TouchableOpacity
                                        onPress={() => { setPhoto(null); setPhotoAspect(null); setAiValidation(null); }}
                                        className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                                    >
                                        <Ionicons name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                    <Text className="text-[#00D4AA] text-sm text-center mt-3 font-semibold">{t('feedback.tap_change')}</Text>
                                </View>
                            ) : (
                                <>
                                    <Ionicons name="camera-outline" size={32} color={iconDim} />
                                    <Text className="text-txtMuted text-sm mt-3">{t('feedback.tap_attach')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* ── AI Validation Feedback (inline, below photo area) ── */}
                    {aiValidation === 'checking' && (
                        <Text className="text-[#F59E0B] text-xs mb-6 text-center italic">
                            {t('feedback.ai_checking')}
                        </Text>
                    )}
                    {aiValidation === 'real' && (
                        <Text className="text-[#10B981] text-xs mb-6 text-center font-semibold">
                            ✔ {t('feedback.ai_real')}
                        </Text>
                    )}
                    {aiValidation === 'ai' && (
                        <Text className="text-[#EF4444] text-xs mb-6 text-center font-semibold">
                            ❌ {t('feedback.ai_detected')}
                        </Text>
                    )}
                    {/* ─────────────────────────────────────────────────────── */}

                    {/* Submit */}
                    <TouchableOpacity
                        className="bg-[#00D4AA] rounded-2xl py-4 items-center"
                        style={{
                            shadowColor: '#00D4AA',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: submitDisabled ? 0.2 : 0.4,
                            shadowRadius: 12,
                            elevation: 8,
                            opacity: submitDisabled ? 0.55 : 1,
                        }}
                        activeOpacity={0.7}
                        onPress={handleSubmit}
                        disabled={submitDisabled}
                    >
                        {loading ? <ActivityIndicator color="#000" /> : <Text className="text-main font-bold text-base">{t('feedback.submit_btn')}</Text>}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}