import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/use-color-scheme';
import { fetchLocations } from '../services/locationService';

// ── Fallback presets (used if API call fails) ─────────────────────────────────
const FALLBACK_LOCATIONS = [
    { name: 'Indiranagar', district: 'Bangalore Urban', lat: 12.9784, lng: 77.6408, desc: 'East Bangalore Core' },
    { name: 'Koramangala', district: 'Bangalore South', lat: 12.9279, lng: 77.6271, desc: 'Startup Hub' },
    { name: 'Whitefield', district: 'Bangalore East', lat: 12.9698, lng: 77.7499, desc: 'IT Corridor' },
    { name: 'Majestic', district: 'Bangalore Central', lat: 12.9766, lng: 77.5713, desc: 'Transit Hub' },
    { name: 'Jayanagar', district: 'Bangalore South', lat: 12.9299, lng: 77.5826, desc: 'South Bangalore' },
];

export default function LocationPickerModal({ visible, onClose, onSelect }) {
    const [customLat, setCustomLat] = useState('');
    const [customLng, setCustomLng] = useState('');
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    // ── Dynamic location state ────────────────────────────────────
    const [presetLocations, setPresetLocations] = useState(FALLBACK_LOCATIONS);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    // Fetch once when the modal first becomes visible
    useEffect(() => {
        if (!visible) return;

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setFetchError(false);
            try {
                const locations = await fetchLocations();
                if (!cancelled && locations.length > 0) {
                    setPresetLocations(locations);
                }
                // If API returns empty array we keep the fallback already in state
            } catch {
                if (!cancelled) {
                    setFetchError(true);
                    setPresetLocations(FALLBACK_LOCATIONS);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [visible]);

    const handleCustomSubmit = () => {
        const lat = parseFloat(customLat);
        const lng = parseFloat(customLng);
        if (!isNaN(lat) && !isNaN(lng)) {
            onSelect(lat, lng, 'Custom Location');
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'flex-start', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                {/* Content Container */}
                <View className="bg-main rounded-b-[32px] border-b border-cardBorder max-h-[90%] pt-12 pb-6 shadow-2xl">
                    
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 pb-4 border-b border-cardBorder/50">
                        <View>
                            <Text className="text-txt font-bold text-xl">Test Location</Text>
                            <Text className="text-txtMuted text-xs mt-0.5">Simulate presence for hackathon testing</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-card w-10 h-10 rounded-full items-center justify-center border border-cardBorder"
                        >
                            <Ionicons name="close" size={20} color={iconDim} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        className="px-6" 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Custom Input Section */}
                        <View className="mt-6 mb-2">
                            <Text className="text-txtMuted text-[10px] font-bold uppercase tracking-[1px] mb-3">Custom Coordinates</Text>
                            <View className="bg-card p-4 rounded-2xl border border-cardBorder shadow-sm">
                                <View className="flex-row gap-3 mb-4">
                                    <View className="flex-1">
                                        <Text className="text-txtMuted text-[10px] uppercase mb-1.5 ml-1">Latitude</Text>
                                        <TextInput
                                            className="bg-surface text-txt p-3.5 rounded-xl border border-cardBorder text-sm"
                                            placeholder="e.g. 12.97"
                                            placeholderTextColor={iconDim}
                                            keyboardType="numeric"
                                            value={customLat}
                                            onChangeText={setCustomLat}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-txtMuted text-[10px] uppercase mb-1.5 ml-1">Longitude</Text>
                                        <TextInput
                                            className="bg-surface text-txt p-3.5 rounded-xl border border-cardBorder text-sm"
                                            placeholder="e.g. 77.59"
                                            placeholderTextColor={iconDim}
                                            keyboardType="numeric"
                                            value={customLng}
                                            onChangeText={setCustomLng}
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={handleCustomSubmit}
                                    className="bg-[#00D4AA] py-3.5 rounded-xl items-center shadow-lg"
                                    disabled={!customLat || !customLng}
                                    style={{ opacity: customLat && customLng ? 1 : 0.4 }}
                                >
                                    <Text className="text-[#002B24] font-bold text-sm">Simulate Location</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Preset Areas */}
                        <View className="flex-row items-center mt-6 mb-4">
                            <Text className="text-txtMuted text-[10px] font-bold uppercase tracking-[1px] flex-1">
                                Preset Areas
                            </Text>
                            {loading && <ActivityIndicator size="small" color="#00D4AA" />}
                        </View>

                        <View className="pb-8">
                            {presetLocations.map((loc) => (
                                <TouchableOpacity
                                    key={`${loc.name}-${loc.district}`}
                                    onPress={() => onSelect(loc.lat, loc.lng, loc.name)}
                                    className="bg-card px-4 py-3.5 rounded-2xl mb-3 flex-row items-center border border-cardBorder"
                                    activeOpacity={0.7}
                                >
                                    <View className="w-10 h-10 rounded-xl bg-[#00D4AA]/10 items-center justify-center mr-4 border border-[#00D4AA]/20">
                                        <Ionicons name="location" size={18} color="#00D4AA" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-txt font-bold text-sm">{loc.name}</Text>
                                        <Text className="text-txtMuted text-[11px] mt-0.5">{loc.desc || loc.district}</Text>
                                    </View>
                                    <View className="items-end bg-surface/50 px-2.5 py-1 rounded-lg border border-cardBorder/50">
                                        <Text className="text-[#00D4AA] text-[9px] font-mono font-bold">
                                            {typeof loc.lat === 'number' ? loc.lat.toFixed(3) : loc.lat}
                                        </Text>
                                        <Text className="text-[#00D4AA] text-[9px] font-mono font-bold">
                                            {typeof loc.lng === 'number' ? loc.lng.toFixed(3) : loc.lng}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Tap outside to close */}
                <TouchableOpacity 
                    className="flex-1" 
                    activeOpacity={1} 
                    onPress={onClose} 
                />
            </View>
        </Modal>
    );
}
