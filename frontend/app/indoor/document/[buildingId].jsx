/**
 * app/indoor/document/[buildingId].jsx
 * Document-Aware Navigation — Upload a prescription/token to get a route
 * EXTENSION ONLY: Does NOT modify any existing screen.
 */
import { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { apiFetch } from '../../../services/api';

const EXAMPLE_INTENTS = [
    'Blood test required. OPD consultation. Pharmacy for medication.',
    'Emergency. Radiology X-Ray. Registration.',
    'Lab sample collection. Ultrasound. Pharmacy prescription.',
];

function DirectionStep({ step, isLast }) {
    const iconMap = {
        entrance: 'enter-outline',
        elevator: 'arrow-up-circle',
        stairs: 'footsteps',
        exit: 'exit-outline',
    };
    const icon = iconMap[step.roomType] || 'arrow-forward';
    return (
        <View className="mb-4">
            <View className="bg-[#1A2035] rounded-2xl p-4 border-l-4 border-[#F59E0B]">
                <View className="flex-row items-start">
                    <View className="w-10 h-10 rounded-full bg-[#F59E0B] items-center justify-center mr-3">
                        <Text className="text-black font-bold">{step.step}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base leading-5 mb-1">{step.instruction}</Text>
                        <View className="flex-row items-center bg-black/30 rounded-lg px-2 py-1 self-start">
                            <Ionicons name={icon} size={14} color="#F59E0B" />
                            <Text className="text-[#E5E7EB] text-xs ml-1">{step.roomName}</Text>
                        </View>
                    </View>
                </View>
            </View>
            {!isLast && <View className="items-center py-0.5"><Ionicons name="chevron-down" size={18} color="#F59E0B" /></View>}
        </View>
    );
}

function StepChip({ step, index }) {
    const TYPE_COLOR = {
        entrance: '#00D4AA', medical: '#EF4444', shop: '#F59E0B',
        reception: '#6366F1', emergency: '#EF4444', office: '#10B981',
        waiting: '#F59E0B', restroom: '#9CA3AF', atm: '#6B7280',
    };
    const color = TYPE_COLOR[step.type] || '#9CA3AF';
    return (
        <View className="flex-row items-center bg-[#1A2035] rounded-full px-3 py-1.5 mr-2 mb-2 border" style={{ borderColor: color + '50' }}>
            <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />
            <Text className="text-white text-xs font-semibold">{step.name}</Text>
        </View>
    );
}

export default function DocumentNavigationScreen() {
    const { buildingId } = useLocalSearchParams();
    const router = useRouter();

    const [mode, setMode] = useState('input'); // 'input' | 'loading' | 'result'
    const [textInput, setTextInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [result, setResult] = useState(null);

    const pickDocument = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain', 'image/*'],
                copyToCacheDirectory: false,
            });
            if (!res.canceled && res.assets?.length) {
                setSelectedFile(res.assets[0]);
                setTextInput('');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not open document picker.');
        }
    };

    const analyze = useCallback(async () => {
        if (!textInput.trim() && !selectedFile) {
            Alert.alert('Input required', 'Type a description or upload a document.');
            return;
        }

        setMode('loading');
        try {
            const apiBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const formData = new FormData();
            formData.append('building_id', buildingId);

            if (selectedFile) {
                if (Platform.OS === 'web' && selectedFile.file instanceof File) {
                    // Web: expo-document-picker gives a native File object — use it directly
                    formData.append('file', selectedFile.file, selectedFile.name);
                } else if (Platform.OS === 'web' && selectedFile.uri?.startsWith('blob:')) {
                    // Web fallback: fetch the blob URI and convert to File
                    const blobRes = await fetch(selectedFile.uri);
                    const blob = await blobRes.blob();
                    formData.append('file', new File([blob], selectedFile.name, {
                        type: selectedFile.mimeType || blob.type || 'text/plain',
                    }));
                } else {
                    // Native (iOS/Android): use the { uri, name, type } pattern
                    formData.append('file', {
                        uri: selectedFile.uri,
                        name: selectedFile.name,
                        type: selectedFile.mimeType || 'application/pdf',
                    });
                }
            } else {
                formData.append('text', textInput);
            }

            const response = await fetch(
                `${apiBase}/api/navigation/analyze-document`,
                { method: 'POST', body: formData }
            );
            const data = await response.json();

            if (response.ok) {
                setResult(data);
                setMode('result');
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'Could not analyze document.');
            setMode('input');
        }
    }, [textInput, selectedFile, buildingId]);

    const reset = () => {
        setMode('input');
        setResult(null);
        setTextInput('');
        setSelectedFile(null);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#0A0F1E]">
            {/* Header */}
            <View className="px-5 py-4 border-b border-[#1F2937]">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#F59E0B" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold">Document Navigation</Text>
                        <Text className="text-[#9CA3AF] text-sm">Upload or describe your needs</Text>
                    </View>
                    {mode === 'result' && (
                        <TouchableOpacity onPress={reset} className="bg-[#1F2937] px-3 py-1 rounded-full">
                            <Text className="text-[#9CA3AF] text-xs font-bold">Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
                {mode === 'input' && (
                    <View>
                        {/* Info Banner */}
                        <View className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl p-4 mb-5 flex-row items-start">
                            <Ionicons name="document-text-outline" size={20} color="#F59E0B" style={{ marginRight: 10, marginTop: 1 }} />
                            <Text className="text-[#FDE68A] text-sm flex-1 leading-5">
                                Describe your visit (blood test, consultation, etc.) or upload a prescription / token, and we'll auto-generate your navigation route.
                            </Text>
                        </View>

                        {/* Text Input */}
                        <Text className="text-white font-bold mb-2">Describe your needs</Text>
                        <TextInput
                            className="bg-[#1A2035] border border-[#2D3548] rounded-2xl p-4 text-white mb-4"
                            style={{ minHeight: 100, textAlignVertical: 'top' }}
                            placeholder="e.g. Blood test required. OPD consultation with doctor. Need pharmacy prescription."
                            placeholderTextColor="#4B5563"
                            multiline
                            value={textInput}
                            onChangeText={setTextInput}
                        />

                        {/* Example Chips */}
                        <Text className="text-[#6B7280] text-xs mb-2">Try an example:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                            {EXAMPLE_INTENTS.map((ex, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setTextInput(ex)}
                                    className="bg-[#1A2035] border border-[#2D3548] rounded-xl px-3 py-2 mr-2"
                                    style={{ maxWidth: 200 }}
                                >
                                    <Text className="text-[#9CA3AF] text-xs" numberOfLines={2}>{ex}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Divider */}
                        <View className="flex-row items-center mb-5">
                            <View className="flex-1 h-px bg-[#1F2937]" />
                            <Text className="text-[#4B5563] mx-3 text-xs">OR</Text>
                            <View className="flex-1 h-px bg-[#1F2937]" />
                        </View>

                        {/* File Upload */}
                        <TouchableOpacity
                            onPress={pickDocument}
                            className="bg-[#1A2035] border-2 border-dashed border-[#2D3548] rounded-2xl p-6 items-center mb-5"
                        >
                            <Ionicons name="cloud-upload-outline" size={36} color={selectedFile ? '#F59E0B' : '#4B5563'} />
                            <Text className="text-white font-semibold mt-2">
                                {selectedFile ? selectedFile.name : 'Upload Prescription / Token'}
                            </Text>
                            <Text className="text-[#6B7280] text-xs mt-1">PDF, TXT, or Image (max 5MB)</Text>
                        </TouchableOpacity>

                        {/* Analyze Button */}
                        <TouchableOpacity
                            onPress={analyze}
                            className="bg-[#F59E0B] rounded-2xl py-4 items-center flex-row justify-center gap-2"
                            style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles-outline" size={20} color="#000" />
                            <Text className="text-black font-bold text-base">Generate My Route</Text>
                        </TouchableOpacity>

                        {/* Privacy note */}
                        <View className="flex-row items-center justify-center mt-4">
                            <Ionicons name="shield-checkmark-outline" size={12} color="#4B5563" />
                            <Text className="text-[#4B5563] text-xs ml-1">Documents are never stored. Analysis is temporary.</Text>
                        </View>
                    </View>
                )}

                {mode === 'loading' && (
                    <View className="items-center py-20">
                        <View className="w-20 h-20 rounded-full bg-[#F59E0B]/10 items-center justify-center mb-4">
                            <ActivityIndicator size="large" color="#F59E0B" />
                        </View>
                        <Text className="text-white font-bold text-lg">Analyzing Document...</Text>
                        <Text className="text-[#9CA3AF] text-sm mt-1">Extracting intents & building your route</Text>
                    </View>
                )}

                {mode === 'result' && result && (
                    <View>
                        {result.found ? (
                            <>
                                {/* Intents Detected */}
                                {result.intents?.length > 0 && (
                                    <View className="bg-[#1A2035] rounded-2xl p-4 mb-4 border border-[#2D3548]">
                                        <View className="flex-row items-center mb-2">
                                            <Ionicons name="sparkles" size={16} color="#F59E0B" />
                                            <Text className="text-[#F59E0B] font-bold text-sm ml-2 uppercase tracking-wider">Detected Needs</Text>
                                        </View>
                                        <View className="flex-row flex-wrap">
                                            {result.intents.map((intent, i) => (
                                                <View key={i} className="bg-[#F59E0B]/15 px-3 py-1 rounded-full mr-2 mb-2">
                                                    <Text className="text-[#FDE68A] text-xs font-semibold capitalize">{typeof intent === 'string' ? intent : intent.intent}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Visit Order */}
                                {result.steps?.length > 0 && (
                                    <View className="mb-4">
                                        <Text className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-2">Your Visit Order</Text>
                                        <View className="flex-row flex-wrap">
                                            {result.steps.map((step, i) => <StepChip key={i} step={step} index={i} />)}
                                        </View>
                                    </View>
                                )}

                                {/* Route Summary */}
                                <View className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-3xl p-5 mb-4">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-[#F59E0B] text-xs font-bold uppercase tracking-wider mb-1">Auto-Generated Route</Text>
                                            <Text className="text-white text-lg font-bold">{result.route.from?.name} → {result.route.to?.name}</Text>
                                            <Text className="text-[#9CA3AF] text-xs mt-1">{result.steps?.length} stops</Text>
                                        </View>
                                        <View className="items-end">
                                            <View className="bg-[#F59E0B] px-4 py-2 rounded-full">
                                                <Text className="text-black font-bold text-lg">{result.route.totalDistance?.toFixed(0)}m</Text>
                                            </View>
                                            <Text className="text-[#9CA3AF] text-xs mt-1">Total</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Directions */}
                                <Text className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3">Step-by-Step Directions</Text>
                                {result.route.directions.map((step, i) => (
                                    <DirectionStep key={i} step={step} isLast={i === result.route.directions.length - 1} />
                                ))}

                                <View className="bg-[#10B981]/15 border border-[#10B981]/40 rounded-2xl p-4 mb-6 flex-row items-center justify-center">
                                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                    <Text className="text-[#10B981] font-bold text-base ml-2">Route Ready!</Text>
                                </View>
                            </>
                        ) : (
                            /* Failed — show intents only */
                            <View className="items-center py-10">
                                <Ionicons name="warning-outline" size={48} color="#F59E0B" />
                                <Text className="text-white text-xl font-bold mt-4 text-center">Could Not Generate Route</Text>
                                <Text className="text-[#9CA3AF] text-sm mt-2 text-center">{result.message}</Text>
                                {result.intents?.length > 0 && (
                                    <View className="mt-4 w-full bg-[#1A2035] rounded-2xl p-4">
                                        <Text className="text-[#F59E0B] font-bold mb-2">Detected keywords:</Text>
                                        {result.intents.map((i, idx) => (
                                            <Text key={idx} className="text-[#9CA3AF] text-sm">• {typeof i === 'string' ? i : i.intent}</Text>
                                        ))}
                                    </View>
                                )}
                                <TouchableOpacity onPress={reset} className="mt-6 bg-[#1F2937] px-8 py-3 rounded-2xl">
                                    <Text className="text-white font-bold">Try Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Standard nav link */}
                        <TouchableOpacity
                            onPress={() => router.replace(`/indoor/${buildingId}`)}
                            className="flex-row items-center justify-center py-3 mb-4"
                        >
                            <Ionicons name="map-outline" size={14} color="#6B7280" />
                            <Text className="text-[#6B7280] text-xs ml-1">Switch to standard navigation</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
