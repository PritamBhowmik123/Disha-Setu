import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/use-color-scheme';

const PRESET_LOCATIONS = [
    { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, desc: 'East Bangalore Core' },
    { name: 'Koramangala', lat: 12.9279, lng: 77.6271, desc: 'Startup Hub' },
    { name: 'Whitefield', lat: 12.9698, lng: 77.7499, desc: 'IT Corridor' },
    { name: 'Majestic', lat: 12.9766, lng: 77.5713, desc: 'Transit Hub' },
    { name: 'Jayanagar', lat: 12.9299, lng: 77.5826, desc: 'South Bangalore' },
];

export default function LocationPickerModal({ visible, onClose, onSelect }) {
    const [customLat, setCustomLat] = useState('');
    const [customLng, setCustomLng] = useState('');
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    const handleCustomSubmit = () => {
        const lat = parseFloat(customLat);
        const lng = parseFloat(customLng);
        if (!isNaN(lat) && !isNaN(lng)) {
            onSelect(lat, lng, 'Custom Location');
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-main rounded-t-3xl border-t border-cardBorder max-h-[80%] min-h-[50%]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-5 border-b border-cardBorder">
                        <View>
                            <Text className="text-txt font-bold text-lg">Test Location</Text>
                            <Text className="text-txtMuted text-xs">Simulate presence for hackathon testing</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-surface w-8 h-8 rounded-full items-center justify-center border border-cardBorder"
                        >
                            <Ionicons name="close" size={20} color={iconDim} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="p-5 flex-1" showsVerticalScrollIndicator={false}>
                        <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider mb-3">Preset Areas</Text>
                        {PRESET_LOCATIONS.map((loc) => (
                            <TouchableOpacity
                                key={loc.name}
                                onPress={() => onSelect(loc.lat, loc.lng, loc.name)}
                                className="bg-card px-4 py-3 rounded-2xl mb-3 flex-row items-center border border-cardBorder"
                                activeOpacity={0.7}
                            >
                                <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3 border border-cardBorder">
                                    <Ionicons name="business" size={18} color="#6366F1" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-txt font-bold">{loc.name}</Text>
                                    <Text className="text-txtMuted text-xs">{loc.desc}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-txtMuted text-[10px] font-mono">{loc.lat}</Text>
                                    <Text className="text-txtMuted text-[10px] font-mono">{loc.lng}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}

                        <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider mt-5 mb-3">Custom Coordinates</Text>
                        <View className="bg-card p-4 rounded-2xl border border-cardBorder mb-10">
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text className="text-txtMuted text-xs mb-1">Latitude</Text>
                                    <TextInput
                                        className="bg-surface text-txt p-3 rounded-xl border border-cardBorder text-sm"
                                        placeholder="e.g. 12.9716"
                                        placeholderTextColor={iconDim}
                                        keyboardType="numeric"
                                        value={customLat}
                                        onChangeText={setCustomLat}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-txtMuted text-xs mb-1">Longitude</Text>
                                    <TextInput
                                        className="bg-surface text-txt p-3 rounded-xl border border-cardBorder text-sm"
                                        placeholder="e.g. 77.5946"
                                        placeholderTextColor={iconDim}
                                        keyboardType="numeric"
                                        value={customLng}
                                        onChangeText={setCustomLng}
                                    />
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={handleCustomSubmit}
                                className="bg-[#6366F1] py-3 rounded-xl items-center"
                                activeOpacity={0.8}
                                disabled={!customLat || !customLng}
                                style={{ opacity: customLat && customLng ? 1 : 0.5 }}
                            >
                                <Text className="text-white font-bold">Apply Custom Coordinates</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
