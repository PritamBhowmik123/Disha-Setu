/**
 * app/indoor/[buildingId].jsx
 * Indoor navigation and floor map viewer
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { 
    fetchBuildingById, 
    fetchFloorRooms, 
    searchRooms, 
    getRoute 
} from '../../services/indoorNavigationService';

const ROOM_TYPE_ICONS = {
    entrance: 'enter-outline',
    exit: 'exit-outline',
    elevator: 'arrow-up-circle-outline',
    stairs: 'footsteps-outline',
    escalator: 'arrow-up-outline',
    office: 'briefcase-outline',
    department: 'business-outline',
    classroom: 'school-outline',
    lab: 'flask-outline',
    auditorium: 'people-outline',
    restroom: 'man-outline',
    cafeteria: 'restaurant-outline',
    shop: 'cart-outline',
    atm: 'card-outline',
    parking: 'car-outline',
    emergency: 'medical-outline',
    medical: 'fitness-outline',
    reception: 'information-circle-outline',
    waiting: 'hourglass-outline',
    other: 'location-outline',
};

function RoomCard({ room, onPress, isSelected }) {
    const iconName = ROOM_TYPE_ICONS[room.type] || 'location-outline';
    
    return (
        <TouchableOpacity
            onPress={() => onPress(room)}
            className={`p-5 rounded-2xl mb-3 border-2 ${
                isSelected 
                    ? 'bg-[#00D4AA]/20 border-[#00D4AA]' 
                    : 'bg-[#1A2035] border-[#2D3548]'
            }`}
            style={isSelected ? {
                shadowColor: '#00D4AA',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4
            } : {}}
        >
            <View className="flex-row items-center">
                <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isSelected ? 'bg-[#00D4AA]' : 'bg-[#2D3548]'}`}>
                    <Ionicons name={iconName} size={24} color="white" />
                </View>
                <View className="flex-1 ml-4">
                    <Text className="text-white font-bold text-lg mb-1">{room.name}</Text>
                    {room.room_number && (
                        <View className="flex-row items-center mb-1">
                            <MaterialIcons name="door-front" size={12} color="#9CA3AF" />
                            <Text className="text-[#D1D5DB] text-sm ml-1 font-semibold">Room {room.room_number}</Text>
                        </View>
                    )}
                    <View className={`px-2 py-1 rounded-lg self-start ${isSelected ? 'bg-[#00D4AA]/30' : 'bg-[#374151]'}`}>
                        <Text className={`text-xs font-bold uppercase ${isSelected ? 'text-[#00D4AA]' : 'text-[#9CA3AF]'}`}>{room.type}</Text>
                    </View>
                </View>
                {isSelected && (
                    <View className="ml-2">
                        <Ionicons name="checkmark-circle" size={28} color="#00D4AA" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

function DirectionStep({ step, isLast }) {
    const iconMap = {
        entrance: 'enter-outline',
        elevator: 'arrow-up-circle',
        stairs: 'footsteps',
        exit: 'exit-outline',
    };
    
    const icon = iconMap[step.roomType] || 'arrow-forward';
    
    return (
        <View className="mb-5">
            <View className="bg-[#1A2035] rounded-2xl p-4 border-l-4 border-[#00D4AA]">
                <View className="flex-row items-start">
                    <View className="w-12 h-12 rounded-full bg-[#00D4AA] items-center justify-center mr-4">
                        <Text className="text-[#0A0F1E] font-bold text-lg">{step.step}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-bold text-lg mb-2 leading-6">{step.instruction}</Text>
                        <View className="flex-row items-center bg-[#0A0F1E]/50 rounded-lg px-3 py-2">
                            <Ionicons name={icon} size={18} color="#00D4AA" />
                            <Text className="text-[#E5E7EB] text-sm ml-2 font-semibold">{step.roomName}</Text>
                        </View>
                        {step.floorNumber !== undefined && (
                            <View className="flex-row items-center mt-2">
                                <MaterialIcons name="layers" size={14} color="#9CA3AF" />
                                <Text className="text-[#9CA3AF] text-xs ml-1">Floor {step.floorNumber}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            {!isLast && (
                <View className="items-center py-1">
                    <Ionicons name="chevron-down" size={20} color="#00D4AA" />
                </View>
            )}
        </View>
    );
}

export default function IndoorNavigationScreen() {
    const { buildingId } = useLocalSearchParams();
    const router = useRouter();
    const { isDark } = useColorScheme();
    
    const [building, setBuilding] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchMode, setSearchMode] = useState(false);
    
    const [startRoom, setStartRoom] = useState(null);
    const [endRoom, setEndRoom] = useState(null);
    const [route, setRoute] = useState(null);
    const [accessibleOnly, setAccessibleOnly] = useState(false);
    
    // Load building data
    const loadBuilding = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchBuildingById(buildingId);
            setBuilding(data);
            
            if (data.floors && data.floors.length > 0) {
                // Default to ground floor (floor_number = 0) or first floor
                const groundFloor = data.floors.find(f => f.floor_number === 0) || data.floors[0];
                setSelectedFloor(groundFloor);
                await loadFloorRooms(groundFloor.id);
            }
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to load building');
        } finally {
            setLoading(false);
        }
    }, [buildingId]);
    
    // Load rooms for a floor
    const loadFloorRooms = async (floorId) => {
        try {
            const data = await fetchFloorRooms(floorId);
            setRooms(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to load rooms');
        }
    };
    
    // Handle floor change
    const changeFloor = async (floor) => {
        setSelectedFloor(floor);
        setSearchMode(false);
        setSearchQuery('');
        await loadFloorRooms(floor.id);
    };
    
    // Handle search
    const handleSearch = async (query) => {
        setSearchQuery(query);
        
        if (query.trim().length < 2) {
            setSearchResults([]);
            setSearchMode(false);
            return;
        }
        
        try {
            setSearchMode(true);
            const results = await searchRooms(query, buildingId);
            setSearchResults(results);
        } catch (err) {
            console.error('Search error:', err);
        }
    };
    
    // Handle room selection
    const selectRoom = (room) => {
        if (!startRoom) {
            setStartRoom(room);
            Alert.alert('Start Location Set', `Navigate from: ${room.name}`);
        } else if (!endRoom) {
            setEndRoom(room);
            // Automatically find route
            findRouteToDestination(startRoom, room);
        } else {
            // Reset selection
            setStartRoom(room);
            setEndRoom(null);
            setRoute(null);
            Alert.alert('Start Location Set', `Navigate from: ${room.name}`);
        }
    };
    
    // Find route
    const findRouteToDestination = async (from, to) => {
        try {
            const routeData = await getRoute(from.id, to.id, accessibleOnly);
            
            if (!routeData.found) {
                Alert.alert('No Route Found', routeData.message || 'Cannot find a path between these locations');
                setEndRoom(null);
                return;
            }
            
            setRoute(routeData);
            Alert.alert(
                'Route Found',
                `Distance: ${routeData.distance.toFixed(1)} meters\n${routeData.directions.length} steps`
            );
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to calculate route');
            setEndRoom(null);
        }
    };
    
    // Reset navigation
    const resetNavigation = () => {
        setStartRoom(null);
        setEndRoom(null);
        setRoute(null);
        setSearchQuery('');
        setSearchMode(false);
        setSearchResults([]);
    };
    
    useEffect(() => {
        loadBuilding();
    }, [loadBuilding]);
    
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-bg items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-4">Loading building...</Text>
            </SafeAreaView>
        );
    }
    
    if (!building) {
        return (
            <SafeAreaView className="flex-1 bg-bg items-center justify-center p-6">
                <Ionicons name="business-outline" size={64} color="#6B7280" />
                <Text className="text-txt text-xl font-bold mt-4">Building Not Found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-6">
                    <Text className="text-[#00D4AA] font-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView className="flex-1 bg-bg">
            {/* Header */}
            <View className="px-5 py-4 border-b border-cardBorder">
                <View className="flex-row items-center mb-3">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#00D4AA" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-txt text-xl font-bold">{building.name}</Text>
                        {building.campus && (
                            <Text className="text-txtMuted text-sm">{building.campus}</Text>
                        )}
                    </View>
                </View>
                
                {/* Search Bar */}
                <View className="bg-surface rounded-xl px-4 py-3 flex-row items-center border border-cardBorder">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-white"
                        placeholder="Search rooms, departments..."
                        placeholderTextColor="#6B7280"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
                
                {/* Navigation Controls */}
                {(startRoom || endRoom) && (
                    <View className="mt-3 bg-[#00D4AA]/20 rounded-2xl p-4 border-2 border-[#00D4AA]">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full bg-[#00D4AA] mr-2" />
                                <Text className="text-[#00D4AA] font-bold text-base">
                                    {!startRoom ? 'Select Start' : !endRoom ? 'Select Destination' : 'Route Found'}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={resetNavigation}
                                className="bg-[#EF4444] px-3 py-1.5 rounded-lg"
                            >
                                <Text className="text-white font-bold text-xs">Reset</Text>
                            </TouchableOpacity>
                        </View>
                        {startRoom && (
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="location" size={14} color="#FFFFFF" />
                                <Text className="text-white text-sm font-semibold ml-2">From: {startRoom.name}</Text>
                            </View>
                        )}
                        {endRoom && (
                            <View className="flex-row items-center">
                                <Ionicons name="flag" size={14} color="#FFFFFF" />
                                <Text className="text-white text-sm font-semibold ml-2">To: {endRoom.name}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            
            {/* Floor Selector */}
            {!searchMode && building.floors && building.floors.length > 0 && (
                <View className="bg-[#0A0F1E] border-b-2 border-[#2D3548]">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 py-4">
                        {building.floors.map((floor) => (
                            <TouchableOpacity
                                key={floor.id}
                                onPress={() => changeFloor(floor)}
                                className={`px-6 py-3 rounded-2xl mr-3 ${
                                    selectedFloor?.id === floor.id 
                                        ? 'bg-[#00D4AA]' 
                                        : 'bg-[#1A2035] border-2 border-[#2D3548]'
                                }`}
                                style={selectedFloor?.id === floor.id ? {
                                    shadowColor: '#00D4AA',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 8,
                                    elevation: 5
                                } : {}}
                            >
                                <Text className={`font-bold text-base ${
                                    selectedFloor?.id === floor.id ? 'text-[#0A0F1E]' : 'text-white'
                                }`}>
                                    {floor.name || `Floor ${floor.floor_number}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
            
            {/* Content */}
            <ScrollView className="flex-1 px-5 py-4">
                {route ? (
                    // Show Directions
                    <View>
                        <View className="bg-gradient-to-r from-[#00D4AA]/20 to-[#00D4AA]/10 rounded-2xl p-5 mb-5 border-2 border-[#00D4AA]/30">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="text-[#00D4AA] text-sm font-bold uppercase tracking-wider mb-1">Turn-by-Turn</Text>
                                    <Text className="text-white text-2xl font-bold">Directions</Text>
                                </View>
                                <View className="items-end">
                                    <View className="bg-[#00D4AA] px-4 py-2.5 rounded-full">
                                        <Text className="text-[#0A0F1E] font-bold text-lg">
                                            {route.distance.toFixed(0)}m
                                        </Text>
                                    </View>
                                    <Text className="text-[#9CA3AF] text-xs mt-1">Total Distance</Text>
                                </View>
                            </View>
                        </View>
                        
                        {route.directions.map((step, idx) => (
                            <DirectionStep 
                                key={idx} 
                                step={step} 
                                isLast={idx === route.directions.length - 1}
                            />
                        ))}
                        
                        <View className="bg-[#10B981]/20 rounded-2xl p-4 border-2 border-[#10B981] mt-4">
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                <Text className="text-[#10B981] font-bold text-lg ml-2">You have arrived!</Text>
                            </View>
                        </View>
                    </View>
                ) : searchMode && searchResults.length > 0 ? (
                    // Show Search Results
                    <View>
                        <Text className="text-txtMuted text-sm mb-3">
                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                        </Text>
                        {searchResults.map((room) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onPress={selectRoom}
                                isSelected={startRoom?.id === room.id || endRoom?.id === room.id}
                            />
                        ))}
                    </View>
                ) : searchMode ? (
                    <View className="items-center justify-center py-12">
                        <Ionicons name="search-outline" size={48} color="#6B7280" />
                        <Text className="text-txtMuted mt-4">No results found</Text>
                    </View>
                ) : (
                    // Show Current Floor Rooms
                    <View>
                        <Text className="text-txtMuted text-sm mb-3">
                            {rooms.length} room{rooms.length !== 1 ? 's' : ''} on this floor
                        </Text>
                        {rooms.map((room) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onPress={selectRoom}
                                isSelected={startRoom?.id === room.id || endRoom?.id === room.id}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
