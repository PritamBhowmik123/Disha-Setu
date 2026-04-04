/**
 * app/admin/navigation.jsx
 * Admin Indoor Navigation Management - Full CRUD for rooms and connections
 */
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';
import { getNavigationData, deleteRoom, deleteConnection, addRoom, addConnection, getAllIncidents, createIncident, toggleIncident, deleteIncident, scanBlueprint, syncFromMiro } from '../../services/adminService';
import { getBuildings, fetchBuildingFloors } from '../../services/indoorNavigationService';
import { apiFetch } from '../../services/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Room type options
const ROOM_TYPES = [
    'entrance', 'exit', 'reception', 'emergency', 'pharmacy', 'laboratory',
    'ward', 'icu', 'surgery', 'radiology', 'cafeteria', 'restroom',
    'elevator', 'stairs', 'corridor', 'room', 'office', 'waiting'
];

function RoomCard({ room, onDelete }) {
    const { isDark } = useColorScheme();

    const handleDelete = () => {
        Alert.alert(
            'Delete Room',
            `Are you sure you want to delete "${room.name}"? All connections will be removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRoom(room.id);
                            Alert.alert('Success', 'Room deleted successfully');
                            onDelete();
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to delete room');
                        }
                    }
                }
            ]
        );
    };

    const getTypeIcon = (type) => {
        const icons = {
            'entrance': '🚪', 'exit': '🚪', 'reception': '💁', 'emergency': '🚨',
            'pharmacy': '💊', 'laboratory': '🔬', 'ward': '🛏️', 'icu': '🏥',
            'surgery': '⚕️', 'radiology': '📷', 'cafeteria': '🍽️', 'restroom': '🚻',
            'elevator': '🛗', 'stairs': '🪜', 'corridor': '🚶', 'room': '🚪'
        };
        return icons[type?.toLowerCase()] || '📍';
    };

    return (
        <View className="p-4 rounded-xl bg-card shadow-sm mb-3 border border-cardBorder">
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 flex-row items-start gap-3">
                    <Text className="text-2xl">{getTypeIcon(room.type)}</Text>
                    <View className="flex-1">
                        <Text className="font-bold text-base text-txt mb-1">
                            {room.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mb-1">
                            <View className="px-2 py-0.5 rounded bg-[#00D4AA]/10">
                                <Text className="text-xs font-medium text-[#00D4AA]">
                                    {room.type}
                                </Text>
                            </View>
                            {room.is_landmark && (
                                <View className="px-2 py-0.5 rounded bg-yellow-500/10">
                                    <Text className="text-xs font-medium text-yellow-500">
                                        ⭐ Landmark
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-xs text-txtMuted">
                            📍 Floor {room.floor_number} • {room.building_name}
                        </Text>
                        {room.room_number && (
                            <Text className="text-xs text-txtMuted mt-1">
                                Room #{room.room_number}
                            </Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20"
                >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function ConnectionCard({ connection, onDelete }) {
    const { isDark } = useColorScheme();

    const handleDelete = () => {
        Alert.alert(
            'Delete Connection',
            `Delete connection between "${connection.from_room_name}" and "${connection.to_room_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteConnection(connection.id);
                            Alert.alert('Success', 'Connection deleted successfully');
                            onDelete();
                        } catch (err) {
                            Alert.alert('Error', err.message || 'Failed to delete connection');
                        }
                    }
                }
            ]
        );
    };

    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <View className="p-4 rounded-xl bg-card shadow-sm mb-3 border border-cardBorder">
            <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className="flex-1 bg-surface border border-cardBorder px-3 py-2 rounded-lg">
                            <Text className="font-semibold text-sm text-txt">
                                {connection.from_room_name}
                            </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color={iconDim} />
                        <View className="flex-1 bg-surface border border-cardBorder px-3 py-2 rounded-lg">
                            <Text className="font-semibold text-sm text-txt">
                                {connection.to_room_name}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-3 mt-1">
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="walk" size={14} color={iconDim} />
                            <Text className="text-xs font-medium text-txtMuted">
                                {connection.distance}m
                            </Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded ${connection.is_accessible ? 'bg-[#00D4AA]/10' : 'bg-red-500/10'}`}>
                            <Text className={`text-xs font-medium ${connection.is_accessible ? 'text-[#00D4AA]' : 'text-red-500'}`}>
                                {connection.is_accessible ? '♿ Accessible' : '🚫 Not accessible'}
                            </Text>
                        </View>
                        {connection.is_bidirectional && (
                            <View className="px-2 py-0.5 rounded bg-blue-500/10">
                                <Text className="text-xs font-medium text-blue-500">
                                    ↔ Bidirectional
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20"
                >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Add Room Modal
function AddRoomModal({ visible, onClose, onAdd, buildings }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const [loading, setLoading] = useState(false);
    const [floors, setFloors] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [showBuildingPicker, setShowBuildingPicker] = useState(false);
    const [showFloorPicker, setShowFloorPicker] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        type: 'room',
        room_number: '',
        description: '',
        is_accessible: true,
        is_landmark: false,
    });

    useEffect(() => {
        if (selectedBuilding) {
            loadFloors(selectedBuilding.id);
        }
    }, [selectedBuilding]);

    const loadFloors = async (buildingId) => {
        try {
            const floorsData = await fetchBuildingFloors(buildingId);
            setFloors(Array.isArray(floorsData) ? floorsData : floorsData.floors || []);
        } catch (err) {
            console.error('Failed to load floors:', err);
            Alert.alert('Error', 'Failed to load floors');
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Room name is required');
            return;
        }
        if (!selectedFloor) {
            Alert.alert('Error', 'Please select a floor');
            return;
        }

        setLoading(true);
        try {
            await addRoom({
                floor_id: selectedFloor.id,
                name: formData.name,
                type: formData.type,
                room_number: formData.room_number || null,
                description: formData.description || null,
                is_accessible: formData.is_accessible,
                is_landmark: formData.is_landmark,
            });
            Alert.alert('Success', 'Room added successfully');
            setFormData({ name: '', type: 'room', room_number: '', description: '', is_accessible: true, is_landmark: false });
            setSelectedBuilding(null);
            setSelectedFloor(null);
            setFloors([]);
            onAdd();
            onClose();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to add room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-main rounded-t-3xl p-6 max-h-[90%] border-t border-cardBorder">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-2xl font-bold text-txt">
                            Add New Room
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={iconDim} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Building Selector */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Building *
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowBuildingPicker(!showBuildingPicker)}
                            className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                        >
                            <Text className={selectedBuilding ? 'text-txt' : 'text-txtMuted'}>
                                {selectedBuilding ? selectedBuilding.name : 'Select a building'}
                            </Text>
                        </TouchableOpacity>
                        {showBuildingPicker && (
                            <View className="mb-4" style={{ maxHeight: 200 }}>
                                <ScrollView
                                    className="rounded-xl overflow-hidden bg-surface border border-cardBorder"
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {buildings.map(building => (
                                        <TouchableOpacity
                                            key={building.id}
                                            onPress={() => {
                                                setSelectedBuilding(building);
                                                setSelectedFloor(null);
                                                setShowBuildingPicker(false);
                                            }}
                                            className="p-3 border-b border-cardBorder"
                                        >
                                            <Text className="text-txt">
                                                {building.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Floor Selector */}
                        {selectedBuilding && (
                            <>
                                <Text className="text-sm font-medium mb-2 text-txtMuted">
                                    Floor *
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowFloorPicker(!showFloorPicker)}
                                    className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                                >
                                    <Text className={selectedFloor ? 'text-txt' : 'text-txtMuted'}>
                                        {selectedFloor ? `Floor ${selectedFloor.floor_number} - ${selectedFloor.name}` : 'Select a floor'}
                                    </Text>
                                </TouchableOpacity>
                                {showFloorPicker && (
                                    <View className="mb-4" style={{ maxHeight: 200 }}>
                                        <ScrollView
                                            className="rounded-xl overflow-hidden bg-surface border border-cardBorder"
                                            nestedScrollEnabled={true}
                                            showsVerticalScrollIndicator={true}
                                        >
                                            {floors.map(floor => (
                                                <TouchableOpacity
                                                    key={floor.id}
                                                    onPress={() => {
                                                        setSelectedFloor(floor);
                                                        setShowFloorPicker(false);
                                                    }}
                                                    className="p-3 border-b border-cardBorder"
                                                >
                                                    <Text className="text-txt">
                                                        Floor {floor.floor_number} - {floor.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Room Name */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Room Name *
                        </Text>
                        <TextInput
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="e.g., Emergency Room 101"
                            placeholderTextColor={iconDim}
                            className="p-4 rounded-xl mb-4 bg-card text-txt border border-cardBorder"
                        />

                        {/* Room Type */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Room Type *
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowTypePicker(!showTypePicker)}
                            className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                        >
                            <Text className="text-txt">
                                {formData.type}
                            </Text>
                        </TouchableOpacity>
                        {showTypePicker && (
                            <View className="mb-4" style={{ maxHeight: 200 }}>
                                <ScrollView
                                    className="rounded-xl overflow-hidden bg-surface border border-cardBorder"
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {ROOM_TYPES.map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            onPress={() => {
                                                setFormData({ ...formData, type });
                                                setShowTypePicker(false);
                                            }}
                                            className="p-3 border-b border-cardBorder"
                                        >
                                            <Text className="text-txt">
                                                {type}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Room Number (Optional) */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Room Number (Optional)
                        </Text>
                        <TextInput
                            value={formData.room_number}
                            onChangeText={(text) => setFormData({ ...formData, room_number: text })}
                            placeholder="e.g., 101, A-23"
                            placeholderTextColor={iconDim}
                            className="p-4 rounded-xl mb-4 bg-card text-txt border border-cardBorder"
                        />

                        {/* Description (Optional) */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Description (Optional)
                        </Text>
                        <TextInput
                            value={formData.description}
                            onChangeText={(text) => setFormData({ ...formData, description: text })}
                            placeholder="Brief description"
                            placeholderTextColor={iconDim}
                            multiline
                            numberOfLines={3}
                            className="p-4 rounded-xl mb-4 bg-card text-txt border border-cardBorder"
                            style={{ textAlignVertical: 'top' }}
                        />

                        {/* Switches */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-sm font-medium text-txt">
                                Wheelchair Accessible
                            </Text>
                            <Switch
                                value={formData.is_accessible}
                                onValueChange={(value) => setFormData({ ...formData, is_accessible: value })}
                                trackColor={{ false: '#374151', true: '#00D4AA' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-sm font-medium text-txt">
                                Mark as Landmark
                            </Text>
                            <Switch
                                value={formData.is_landmark}
                                onValueChange={(value) => setFormData({ ...formData, is_landmark: value })}
                                trackColor={{ false: '#374151', true: '#00D4AA' }}
                                thumbColor="#fff"
                            />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            className="bg-[#00D4AA] py-4 rounded-xl items-center mb-4 border border-[#00D4AA]/50"
                            style={{ elevation: 4 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-black font-bold text-base">Add Room</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// Add Connection Modal
function AddConnectionModal({ visible, onClose, onAdd, rooms }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const [loading, setLoading] = useState(false);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [fromRoom, setFromRoom] = useState(null);
    const [toRoom, setToRoom] = useState(null);
    const [distance, setDistance] = useState('');
    const [isAccessible, setIsAccessible] = useState(true);
    const [isBidirectional, setIsBidirectional] = useState(true);

    const handleSubmit = async () => {
        if (!fromRoom || !toRoom) {
            Alert.alert('Error', 'Please select both rooms');
            return;
        }
        if (!distance || isNaN(parseFloat(distance))) {
            Alert.alert('Error', 'Please enter a valid distance');
            return;
        }
        if (fromRoom.id === toRoom.id) {
            Alert.alert('Error', 'Cannot connect a room to itself');
            return;
        }

        setLoading(true);
        try {
            await addConnection({
                from_room: fromRoom.id,
                to_room: toRoom.id,
                distance: parseFloat(distance),
                is_accessible: isAccessible,
                is_bidirectional: isBidirectional,
            });
            Alert.alert('Success', 'Connection added successfully');
            setFromRoom(null);
            setToRoom(null);
            setDistance('');
            setIsAccessible(true);
            setIsBidirectional(true);
            onAdd();
            onClose();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to add connection');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-main rounded-t-3xl p-6 max-h-[90%] border-t border-cardBorder">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-2xl font-bold text-txt">
                            Add New Connection
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={iconDim} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* From Room */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            From Room *
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowFromPicker(!showFromPicker)}
                            className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                        >
                            <Text className={fromRoom ? 'text-txt' : 'text-txtMuted'}>
                                {fromRoom ? `${fromRoom.name} (Floor ${fromRoom.floor_number})` : 'Select starting room'}
                            </Text>
                        </TouchableOpacity>
                        {showFromPicker && (
                            <View className="mb-4" style={{ maxHeight: 250 }}>
                                <ScrollView
                                    className="rounded-xl overflow-hidden bg-surface border border-cardBorder"
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {rooms.map(room => (
                                        <TouchableOpacity
                                            key={room.id}
                                            onPress={() => {
                                                setFromRoom(room);
                                                setShowFromPicker(false);
                                            }}
                                            className="p-3 border-b border-cardBorder"
                                        >
                                            <Text className="text-txt font-medium">
                                                {room.name}
                                            </Text>
                                            <Text className="text-xs text-txtMuted mt-0.5">
                                                Floor {room.floor_number} • {room.building_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* To Room */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            To Room *
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowToPicker(!showToPicker)}
                            className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                        >
                            <Text className={toRoom ? 'text-txt' : 'text-txtMuted'}>
                                {toRoom ? `${toRoom.name} (Floor ${toRoom.floor_number})` : 'Select destination room'}
                            </Text>
                        </TouchableOpacity>
                        {showToPicker && (
                            <View className="mb-4" style={{ maxHeight: 250 }}>
                                <ScrollView
                                    className="rounded-xl overflow-hidden bg-surface border border-cardBorder"
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {rooms.map(room => (
                                        <TouchableOpacity
                                            key={room.id}
                                            onPress={() => {
                                                setToRoom(room);
                                                setShowToPicker(false);
                                            }}
                                            className="p-3 border-b border-cardBorder"
                                        >
                                            <Text className="text-txt font-medium">
                                                {room.name}
                                            </Text>
                                            <Text className="text-xs text-txtMuted mt-0.5">
                                                Floor {room.floor_number} • {room.building_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Distance */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Distance (meters) *
                        </Text>
                        <TextInput
                            value={distance}
                            onChangeText={setDistance}
                            placeholder="e.g., 15"
                            placeholderTextColor={iconDim}
                            keyboardType="decimal-pad"
                            className="p-4 rounded-xl mb-4 bg-card text-txt border border-cardBorder"
                        />

                        {/* Switches */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-sm font-medium text-txt">
                                Wheelchair Accessible
                            </Text>
                            <Switch
                                value={isAccessible}
                                onValueChange={setIsAccessible}
                                trackColor={{ false: '#374151', true: '#00D4AA' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-1 mr-4">
                                <Text className="text-sm font-medium text-txt">
                                    Bidirectional
                                </Text>
                                <Text className="text-xs text-txtMuted">
                                    Can travel in both directions
                                </Text>
                            </View>
                            <Switch
                                value={isBidirectional}
                                onValueChange={setIsBidirectional}
                                trackColor={{ false: '#374151', true: '#00D4AA' }}
                                thumbColor="#fff"
                            />
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            className="bg-[#00D4AA] py-4 rounded-xl items-center mb-4 border border-[#00D4AA]/50"
                            style={{ elevation: 4 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-black font-bold text-base">Add Connection</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// Blueprint Scan Modal
function BlueprintScanModal({ visible, onClose, onScan, buildings }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const [loading, setLoading] = useState(false);
    const [floors, setFloors] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [showBuildingPicker, setShowBuildingPicker] = useState(false);
    const [showFloorPicker, setShowFloorPicker] = useState(false);
    const [image, setImage] = useState(null);
    const [miroUrl, setMiroUrl] = useState(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (selectedBuilding) {
            loadFloors(selectedBuilding.id);
        }
    }, [selectedBuilding]);

    const loadFloors = async (buildingId) => {
        try {
            const floorsData = await fetchBuildingFloors(buildingId);
            setFloors(Array.isArray(floorsData) ? floorsData : floorsData.floors || []);
        } catch (err) {
            console.error('Failed to load floors:', err);
            Alert.alert('Error', 'Failed to load floors');
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take a photo of the blueprint.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    const handleScan = async () => {
        console.log("[Blueprint Scan] Button pressed");
        if (!selectedFloor) {
            Alert.alert('Error', 'Please select a floor');
            return;
        }
        if (!selectedFloor || !image) return;

        setLoading(true);
        setMiroUrl(null);
        try {
            const formData = new FormData();
            formData.append('floor_id', selectedFloor.id);

            if (Platform.OS === 'web') {
                const response = await fetch(image.uri);
                const blob = await response.blob();
                formData.append('blueprint', blob, 'blueprint.jpg');
            } else {
                // @ts-ignore
                formData.append('blueprint', {
                    uri: image.uri,
                    name: 'blueprint.jpg',
                    type: 'image/jpeg',
                });
            }

            const res = await scanBlueprint(formData);
            console.log("[Blueprint Scan] Scan success:", res);
            
            if (res.miroBoardUrl) {
                setMiroUrl(res.miroBoardUrl);
                Alert.alert(
                    'Success', 
                    'AI Analysis complete! Your editable map has been sent to Miro.',
                    [
                        { text: 'Open Miro', onPress: () => {
                            if (Platform.OS === 'web') window.open(res.miroBoardUrl, '_blank');
                        }},
                        { text: 'OK' }
                    ]
                );
            } else {
                Alert.alert('Success', 'Blueprint scanned and processed successfully!');
                onScan();
                onClose();
            }
        } catch (err) {
            console.error("[Blueprint Scan] Scan error:", err);
            Alert.alert('Error', err.message || 'Failed to scan blueprint');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!selectedFloor) return;
        setSyncing(true);
        try {
            const res = await syncFromMiro(selectedFloor.id);
            Alert.alert('Success', `Synchronized ${res.roomsCount} rooms and ${res.connectionsCount} connections from Miro!`);
            onScan(); // Refresh main list
            onClose();
        } catch (err) {
            console.error("[Miro Sync] Sync error:", err);
            Alert.alert('Error', err.message || 'Failed to sync from Miro. Make sure you have scanned this floor first.');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-main rounded-t-3xl p-6 max-h-[90%] border-t border-cardBorder">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-2xl font-bold text-txt">
                            AI Blueprint Scanner
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={iconDim} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="text-sm text-txtMuted mb-6 italic">
                            Upload a floor plan and Gemini will create an editable diagram for you in Miro.
                        </Text>

                        {/* Building Selector */}
                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Building *
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowBuildingPicker(!showBuildingPicker)}
                            className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                        >
                            <Text className={selectedBuilding ? 'text-txt' : 'text-txtMuted'}>
                                {selectedBuilding ? selectedBuilding.name : 'Select a building'}
                            </Text>
                        </TouchableOpacity>
                        {showBuildingPicker && (
                            <View className="mb-4" style={{ maxHeight: 200 }}>
                                <ScrollView className="rounded-xl overflow-hidden bg-surface border border-cardBorder" nestedScrollEnabled={true}>
                                    {buildings.map(building => (
                                        <TouchableOpacity
                                            key={building.id}
                                            onPress={() => {
                                                setSelectedBuilding(building);
                                                setSelectedFloor(null);
                                                setShowBuildingPicker(false);
                                            }}
                                            className="p-3 border-b border-cardBorder"
                                        >
                                            <Text className="text-txt">{building.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Floor Selector */}
                        {selectedBuilding && (
                            <>
                                <Text className="text-sm font-medium mb-2 text-txtMuted">
                                    Floor *
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowFloorPicker(!showFloorPicker)}
                                    className="p-4 rounded-xl mb-4 bg-card border border-cardBorder"
                                >
                                    <Text className={selectedFloor ? 'text-txt' : 'text-txtMuted'}>
                                        {selectedFloor ? `Floor ${selectedFloor.floor_number} - ${selectedFloor.name}` : 'Select a floor'}
                                    </Text>
                                </TouchableOpacity>
                                {showFloorPicker && (
                                    <View className="mb-4" style={{ maxHeight: 200 }}>
                                        <ScrollView className="rounded-xl overflow-hidden bg-surface border border-cardBorder" nestedScrollEnabled={true}>
                                            {floors.map(floor => (
                                                <TouchableOpacity
                                                    key={floor.id}
                                                    onPress={() => {
                                                        setSelectedFloor(floor);
                                                        setShowFloorPicker(false);
                                                    }}
                                                    className="p-3 border-b border-cardBorder"
                                                >
                                                    <Text className="text-txt">Floor {floor.floor_number} - {floor.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}

                        <View className="h-[1px] bg-cardBorder my-4" />

                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="flash" size={16} color="#A855F7" />
                            <Text className="text-sm font-bold text-purple-500 uppercase">
                                Step 1: AI Analysis
                            </Text>
                        </View>

                        <Text className="text-sm font-medium mb-2 text-txtMuted">
                            Blueprint Image *
                        </Text>
                        <View className="flex-row gap-2 mb-4">
                            <TouchableOpacity
                                onPress={pickImage}
                                className="flex-1 bg-card border border-cardBorder p-4 rounded-xl flex-row items-center justify-center gap-2"
                            >
                                <Ionicons name="images-outline" size={20} color="#00D4AA" />
                                <Text className="text-txt font-medium">Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={takePhoto}
                                className="flex-1 bg-card border border-cardBorder p-4 rounded-xl flex-row items-center justify-center gap-2"
                            >
                                <Ionicons name="camera-outline" size={20} color="#00D4AA" />
                                <Text className="text-txt font-medium">Camera</Text>
                            </TouchableOpacity>
                        </View>

                        {image && (
                            <View className="p-4 bg-[#00D4AA]/10 border border-[#00D4AA]/30 rounded-xl mb-6">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3">
                                        <Ionicons name="image" size={24} color="#00D4AA" />
                                        <Text className="text-txt font-medium">Image selected</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setImage(null)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={handleScan}
                            disabled={loading || !image || !selectedFloor}
                            className={`py-4 rounded-xl items-center mb-6 border ${loading || !image || !selectedFloor ? 'bg-card border-cardBorder' : 'bg-purple-600 border-purple-500'}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="cloud-upload-outline" size={20} color="white" />
                                    <Text className="font-bold text-base text-white">
                                        Send to Miro
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {miroUrl && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (Platform.OS === 'web') window.open(miroUrl, '_blank');
                                }}
                                className="py-4 bg-blue-600 rounded-xl items-center mb-6 flex-row justify-center gap-2"
                            >
                                <Ionicons name="open-outline" size={20} color="white" />
                                <Text className="text-white font-bold text-base">Open Miro Board</Text>
                            </TouchableOpacity>
                        )}

                        <View className="h-[1px] bg-cardBorder my-2" />

                        <View className="flex-row items-center gap-2 mb-4 mt-2">
                            <Ionicons name="sync" size={16} color="#00D4AA" />
                            <Text className="text-sm font-bold text-[#00D4AA] uppercase">
                                Step 2: Finalize
                            </Text>
                        </View>

                        <Text className="text-xs text-txtMuted mb-4">
                            Done editing in Miro? Click below to save the changes back to your app database.
                        </Text>

                        <TouchableOpacity
                            onPress={handleSync}
                            disabled={syncing || !selectedFloor}
                            className={`py-4 rounded-xl items-center mb-10 border ${syncing || !selectedFloor ? 'bg-card border-cardBorder' : 'bg-[#00D4AA] border-[#00D4AA]/50'}`}
                        >
                            {syncing ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="download-outline" size={20} color={syncing || !selectedFloor ? '#9CA3AF' : 'black'} />
                                    <Text className="font-bold text-base" style={{ color: syncing || !selectedFloor ? '#9CA3AF' : 'black' }}>
                                        Sync from Miro
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

export default function AdminNavigationManagement() {
    const router = useRouter();
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';
    const { user, loading: authLoading } = useAuth();

    const [rooms, setRooms] = useState([]);
    const [connections, setConnections] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('rooms');
    const [showAddRoomModal, setShowAddRoomModal] = useState(false);
    const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);
    const [showBlueprintScanModal, setShowBlueprintScanModal] = useState(false);

    // --- Missing Incident State Variables & Constants ---
    const INCIDENT_TYPES = ['lift_down', 'room_closed', 'blocked_path', 'maintenance'];
    const INCIDENT_SEVERITIES = ['high', 'medium', 'low'];
    const [incidentForm, setIncidentForm] = useState({ type: 'lift_down', severity: 'medium', message: '', room_id: '' });
    const [showIncidentTypePicker, setShowIncidentTypePicker] = useState(false);
    const [showIncidentSeverityPicker, setShowIncidentSeverityPicker] = useState(false);
    const [incidentSaving, setIncidentSaving] = useState(false);

    const loadIncidents = async () => {
        try {
            const res = await getAllIncidents(selectedBuilding?.id || null);
            if (res && res.data) {
                setIncidents(res.data);
            }
        } catch (e) {
            console.error('Failed to load incidents:', e);
            Alert.alert('Error', 'Failed to fetch layout incidents.');
        }
    };

    const handleCreateIncident = async () => {
        if (!incidentForm.type || !incidentForm.message.trim()) {
            return Alert.alert('Error', 'Type and Message are required fields.');
        }
        
        setIncidentSaving(true);
        try {
            await createIncident({
                type: incidentForm.type,
                severity: incidentForm.severity,
                message: incidentForm.message.trim(),
                room_id: incidentForm.room_id.trim() || null
            });
            Alert.alert('Success', 'Incident placed successfully');
            setIncidentForm({ type: 'lift_down', severity: 'medium', message: '', room_id: '' });
            await loadIncidents();
        } catch (e) {
            console.error('Incident create err:', e);
            Alert.alert('Error', e.message || 'Failed to submit incident');
        } finally {
            setIncidentSaving(false);
        }
    };

    const handleDeleteIncident = async (inc) => {
        Alert.alert('Delete Incident', 'Permanently remove this incident log?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteIncident(inc.id);
                        await loadIncidents();
                    } catch (e) {
                        console.error('Delete incident error:', e);
                        Alert.alert('Error', 'Failed to remove incident');
                    }
                }
            }
        ]);
    };

    const handleToggleIncident = async (inc) => {
        try {
            await toggleIncident(inc.id, !inc.is_active);
            await loadIncidents();
        } catch (e) {
            console.error('Toggle err:', e);
            Alert.alert('Error', 'Failed to change incident activity state.');
        }
    };
    // ----------------------------------------------------

    const loadData = useCallback(async () => {
        try {
            const [navData, buildingsData] = await Promise.all([
                getNavigationData(selectedBuilding),
                getBuildings()
            ]);

            console.log('Navigation data:', navData);
            console.log('Buildings data:', buildingsData);

            setRooms(navData.rooms || []);
            setConnections(navData.connections || []);
            setBuildings(Array.isArray(buildingsData) ? buildingsData : buildingsData.buildings || []);
            await loadIncidents();
        } catch (err) {
            console.error('Failed to load navigation data:', err);
            Alert.alert('Error', 'Failed to load navigation data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedBuilding]);

    useEffect(() => {
        if (authLoading) return;

        if (user?.role !== 'admin') {
            router.replace('/');
            return;
        }

        loadData();
    }, [user, authLoading, selectedBuilding]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return (
            <View className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="mt-4 text-txt">Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="p-6 bg-card border-b border-cardBorder">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mb-4 flex-row items-center gap-2"
                >
                    <Ionicons name="arrow-back" size={20} color="#00D4AA" />
                    <Text className="text-[#00D4AA] text-base font-medium">Back to Dashboard</Text>
                </TouchableOpacity>

                <Text className="text-3xl font-bold text-txt mb-2">
                    Indoor Navigation
                </Text>
                <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="location" size={18} color={iconDim} />
                        <Text className="text-sm font-semibold text-txtMuted">
                            {rooms.length} Rooms
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="git-network" size={18} color={iconDim} />
                        <Text className="text-sm font-semibold text-txtMuted">
                            {connections.length} Connections
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="business" size={18} color={iconDim} />
                        <Text className="text-sm font-semibold text-txtMuted">
                            {buildings.length} Buildings
                        </Text>
                    </View>
                </View>
            </View>

            {/* Building Filter */}
            {buildings.length > 0 && (
                <View className="px-4 py-3">
                    <Text className="text-xs font-semibold uppercase mb-2 text-txtMuted">
                        Filter by Building
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            onPress={() => setSelectedBuilding(null)}
                            className={`mr-2 py-2.5 px-4 rounded-xl ${!selectedBuilding ? 'bg-[#00D4AA]' : 'bg-card border border-cardBorder'}`}
                            style={{ elevation: !selectedBuilding ? 4 : 0 }}
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="apps" size={16} color={!selectedBuilding ? 'black' : iconDim} />
                                <Text className={!selectedBuilding ? 'text-black font-bold' : 'text-txt font-medium'}>
                                    All Buildings
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {buildings.map(building => (
                            <TouchableOpacity
                                key={building.id}
                                onPress={() => setSelectedBuilding(building.id)}
                                className={`mr-2 py-2.5 px-4 rounded-xl ${selectedBuilding === building.id ? 'bg-[#00D4AA]' : 'bg-card border border-cardBorder'}`}
                                style={{ elevation: selectedBuilding === building.id ? 4 : 0 }}
                            >
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="business" size={16} color={selectedBuilding === building.id ? 'black' : iconDim} />
                                    <Text className={selectedBuilding === building.id ? 'text-black font-bold' : 'text-txt font-medium'}>
                                        {building.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Tabs with Add Buttons */}
            <View className="flex-row px-4 gap-2 mb-3 mt-1">
                <TouchableOpacity
                    onPress={() => setActiveTab('rooms')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'rooms' ? 'bg-[#00D4AA]' : 'bg-card border border-cardBorder'}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'rooms' ? 'text-black' : 'text-txtMuted'}`}>
                        Rooms ({rooms.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('connections')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'connections' ? 'bg-[#00D4AA]' : 'bg-card border border-cardBorder'}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'connections' ? 'text-black' : 'text-txtMuted'}`}>
                        Connections ({connections.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('incidents')}
                    className={`flex-1 py-3 rounded-xl ${activeTab === 'incidents' ? 'bg-orange-600' : isDark ? 'bg-gray-800' : 'bg-white'
                        }`}
                >
                    <Text className={`text-center font-semibold ${activeTab === 'incidents' ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        🚨 Incidents
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Add Button in Header */}
            <View className="px-4 mb-3 flex-row gap-2">
                <TouchableOpacity
                    onPress={() => activeTab === 'rooms' ? setShowAddRoomModal(true) : setShowAddConnectionModal(true)}
                    className="flex-1 bg-[#00D4AA]/10 py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 border border-[#00D4AA]/30"
                >
                    <Ionicons name="add-circle" size={20} color="#00D4AA" />
                    <Text className="text-[#00D4AA] font-bold">
                        Add {activeTab === 'rooms' ? 'Room' : 'Connection'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowBlueprintScanModal(true)}
                    className="flex-1 bg-purple-500/10 py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 border border-purple-500/30"
                >
                    <Ionicons name="scan" size={20} color="#A855F7" />
                    <Text className="text-purple-500 font-bold">
                        AI Scan
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1 px-4 mt-2"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D4AA" />
                }
            >
                {activeTab === 'incidents' ? (
                    <View>
                        {/* Create Incident Form */}
                        <View className={`p-4 rounded-2xl mb-4 border ${isDark ? 'bg-gray-800 border-orange-800' : 'bg-orange-50 border-orange-200'
                            }`}>
                            <Text className={`text-base font-bold mb-4 ${isDark ? 'text-orange-300' : 'text-orange-700'
                                }`}>🚨 Create New Incident</Text>

                            {/* Type Picker */}
                            <Text className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type *</Text>
                            <TouchableOpacity
                                onPress={() => setShowIncidentTypePicker(!showIncidentTypePicker)}
                                className={`p-3 rounded-xl mb-3 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                                <Text className={isDark ? 'text-white' : 'text-gray-900'}>{incidentForm.type}</Text>
                            </TouchableOpacity>
                            {showIncidentTypePicker && (
                                <View className={`rounded-xl mb-3 overflow-hidden border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                    {INCIDENT_TYPES.map(t => (
                                        <TouchableOpacity key={t} onPress={() => { setIncidentForm({ ...incidentForm, type: t }); setShowIncidentTypePicker(false); }}
                                            className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                                            <Text className={isDark ? 'text-white' : 'text-gray-900'}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Severity Picker */}
                            <Text className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Severity</Text>
                            <TouchableOpacity
                                onPress={() => setShowIncidentSeverityPicker(!showIncidentSeverityPicker)}
                                className={`p-3 rounded-xl mb-3 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                                <Text className={isDark ? 'text-white' : 'text-gray-900'}>{incidentForm.severity}</Text>
                            </TouchableOpacity>
                            {showIncidentSeverityPicker && (
                                <View className={`rounded-xl mb-3 overflow-hidden border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                    {INCIDENT_SEVERITIES.map(s => (
                                        <TouchableOpacity key={s} onPress={() => { setIncidentForm({ ...incidentForm, severity: s }); setShowIncidentSeverityPicker(false); }}
                                            className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                                            <Text className={isDark ? 'text-white' : 'text-gray-900'}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Message */}
                            <Text className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Message *</Text>
                            <TextInput
                                value={incidentForm.message}
                                onChangeText={t => setIncidentForm({ ...incidentForm, message: t })}
                                placeholder="e.g., Elevator 1 is temporarily out of service"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={2}
                                style={{ textAlignVertical: 'top' }}
                                className={`p-3 rounded-xl mb-3 border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                            />

                            {/* Room ID (optional) */}
                            <Text className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Room ID (optional — affects routing)</Text>
                            <TextInput
                                value={incidentForm.room_id}
                                onChangeText={t => setIncidentForm({ ...incidentForm, room_id: t })}
                                placeholder="Paste room UUID to block that room"
                                placeholderTextColor="#9CA3AF"
                                className={`p-3 rounded-xl mb-4 border ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                            />

                            <TouchableOpacity onPress={handleCreateIncident} disabled={incidentSaving}
                                className="bg-orange-600 py-3 rounded-xl items-center">
                                {incidentSaving
                                    ? <ActivityIndicator color="white" />
                                    : <Text className="text-white font-bold">Create Incident</Text>}
                            </TouchableOpacity>
                        </View>

                        {/* Incident List */}
                        <Text className={`text-xs font-semibold uppercase mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {incidents.length} Incident{incidents.length !== 1 ? 's' : ''}
                        </Text>
                        {incidents.length === 0 ? (
                            <View className="items-center py-10">
                                <Ionicons name="checkmark-circle-outline" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
                                <Text className={`mt-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No incidents. All clear!</Text>
                            </View>
                        ) : incidents.map(inc => (
                            <View key={inc.id} className={`p-4 rounded-2xl mb-3 border ${inc.is_active
                                    ? isDark ? 'bg-red-950 border-red-700' : 'bg-red-50 border-red-300'
                                    : isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                                }`}>
                                <View className="flex-row items-start justify-between mb-2">
                                    <View className="flex-1 mr-3">
                                        <View className="flex-row items-center gap-2 mb-1">
                                            <View className={`px-2 py-0.5 rounded ${inc.is_active ? 'bg-red-600' : (isDark ? 'bg-gray-600' : 'bg-gray-300')
                                                }`}>
                                                <Text className="text-white text-xs font-bold">{inc.is_active ? '● ACTIVE' : '○ INACTIVE'}</Text>
                                            </View>
                                            <View className={`px-2 py-0.5 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                <Text className={`text-xs font-medium capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{inc.severity}</Text>
                                            </View>
                                            <Text className={`text-xs capitalize font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{inc.type?.replace(/_/g, ' ')}</Text>
                                        </View>
                                        <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{inc.message}</Text>
                                        {inc.room_name && (
                                            <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>📍 {inc.room_name}</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteIncident(inc)} className="p-2">
                                        <Ionicons name="trash-outline" size={18} color={isDark ? '#F87171' : '#EF4444'} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleToggleIncident(inc)}
                                    className={`py-2 rounded-xl items-center ${inc.is_active ? 'bg-gray-600' : 'bg-orange-600'
                                        }`}>
                                    <Text className="text-white text-sm font-bold">
                                        {inc.is_active ? '⏸ Deactivate' : '▶ Activate'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : activeTab === 'rooms' ? (
                    rooms.length === 0 ? (
                        <View className="items-center justify-center py-16">
                            <Ionicons name="location-outline" size={64} color={iconDim} />
                            <Text className="text-lg font-semibold mt-4 text-txt">
                                No rooms found
                            </Text>
                            <Text className="text-sm mt-2 text-txtMuted text-center px-8">
                                {selectedBuilding ? 'Try selecting a different building or add a new room' : 'Add your first room to get started'}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text className="text-xs font-semibold uppercase mb-3 text-txtMuted">
                                {rooms.length} Room{rooms.length !== 1 ? 's' : ''} Found
                            </Text>
                            {rooms.map(room => (
                                <RoomCard key={room.id} room={room} onDelete={loadData} />
                            ))}
                        </View>
                    )
                ) : (
                    connections.length === 0 ? (
                        <View className="items-center justify-center py-16">
                            <Ionicons name="git-network-outline" size={64} color={iconDim} />
                            <Text className="text-lg font-semibold mt-4 text-txt">
                                No connections found
                            </Text>
                            <Text className="text-sm mt-2 text-txtMuted text-center px-8">
                                {selectedBuilding ? 'Try selecting a different building or add a new connection' : 'Add your first connection to get started'}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            <Text className="text-xs font-semibold uppercase mb-3 text-txtMuted">
                                {connections.length} Connection{connections.length !== 1 ? 's' : ''} Found
                            </Text>
                            {connections.map(connection => (
                                <ConnectionCard key={connection.id} connection={connection} onDelete={loadData} />
                            ))}
                        </View>
                    )
                )}

                <View className="h-20" />
            </ScrollView>

            {/* Modals */}
            <AddRoomModal
                visible={showAddRoomModal}
                onClose={() => setShowAddRoomModal(false)}
                onAdd={loadData}
                buildings={buildings}
            />

            <AddConnectionModal
                visible={showAddConnectionModal}
                onClose={() => setShowAddConnectionModal(false)}
                onAdd={loadData}
                rooms={rooms}
            />

            <BlueprintScanModal
                visible={showBlueprintScanModal}
                onClose={() => setShowBlueprintScanModal(false)}
                onScan={loadData}
                buildings={buildings}
            />
        </SafeAreaView>
    );
}
