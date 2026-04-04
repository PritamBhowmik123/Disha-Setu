/**
 * app/indoor/[buildingId].jsx
 * Indoor navigation and floor map viewer — with Smart Assist tab
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useColorScheme } from '../../hooks/use-color-scheme';
import {
    fetchBuildingById,
    fetchFloorRooms,
    searchRooms,
    getRoute,
    getRoomInsights,
    getIncidentRoute,
    getActiveIncidents,
} from '../../services/indoorNavigationService';

import { BASE_URL } from '../../services/api';

// Derive the server root (e.g. http://192.168.x.x:3000) from the auto-detected BASE_URL
const SERVER_ROOT = BASE_URL.replace(/\/api\/?$/, '');

import ZeroReadOverlayUI from '../../components/ZeroReadOverlayUI';
import IndoorMapView from '../../components/IndoorMapView';
import MapFloorSelector from '../../components/MapFloorSelector';
import { fetchFloorConnections } from '../../services/indoorNavigationService';
import { useTranslation } from 'react-i18next';
import { useVoiceNavigation } from '../../hooks/useVoiceNavigation';


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
    const { t } = useTranslation();
    const iconName = ROOM_TYPE_ICONS[room.type] || 'location-outline';

    return (
        <TouchableOpacity
            onPress={() => onPress(room)}
            className={`p-5 rounded-2xl mb-3 border-2 ${isSelected
                ? 'bg-[#00D4AA]/20 border-[#00D4AA]'
                : 'bg-card border-cardBorder'
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
                <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isSelected ? 'bg-[#00D4AA]' : 'bg-surface'}`}>
                    <Ionicons name={iconName} size={24} color={isSelected ? '#0A0F1E' : '#9CA3AF'} />
                </View>
                <View className="flex-1 ml-4">
                    <Text className="text-txt font-bold text-lg mb-1">{room.name}</Text>
                    {room.room_number && (
                        <View className="flex-row items-center mb-1">
                            <MaterialIcons name="door-front" size={12} color="#9CA3AF" />
                            <Text className="text-txtMuted text-sm ml-1 font-semibold">{t('indoor.room', { number: room.room_number })}</Text>
                        </View>
                    )}
                    <View className={`px-2 py-1 rounded-lg self-start ${isSelected ? 'bg-[#00D4AA]/30' : 'bg-surface'}`}>
                        <Text className={`text-xs font-bold uppercase ${isSelected ? 'text-[#00D4AA]' : 'text-txtMuted'}`}>{room.type}</Text>
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
    const { t } = useTranslation();
    const iconMap = {
        entrance: 'enter-outline',
        elevator: 'arrow-up-circle',
        stairs: 'footsteps',
        exit: 'exit-outline',
    };

    const icon = iconMap[step.roomType] || 'arrow-forward';

    return (
        <View className="mb-5">
            <View className="bg-card rounded-2xl p-4 border-l-4 border-[#00D4AA] border border-cardBorder">
                <View className="flex-row items-start">
                    <View className="w-12 h-12 rounded-full bg-[#00D4AA] items-center justify-center mr-4">
                        <Text className="text-[#0A0F1E] font-bold text-lg">{step.step}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-txt font-bold text-lg mb-2 leading-6">{step.instruction}</Text>
                        <View className="flex-row items-center bg-surface rounded-lg px-3 py-2 border border-cardBorder">
                            <Ionicons name={icon} size={18} color="#00D4AA" />
                            <Text className="text-txt text-sm ml-2 font-semibold">{step.roomName}</Text>
                        </View>
                        {step.floorNumber !== undefined && (
                            <View className="flex-row items-center mt-2">
                                <MaterialIcons name="layers" size={14} color="#9CA3AF" />
                                <Text className="text-txtMuted text-xs ml-1">{t('indoor.floor', { number: step.floorNumber })}</Text>
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


function SmartDirectionStep({ step, isLast }) {
    const icon = step.roomType === 'elevator' ? 'arrow-up-circle' : step.roomType === 'stairs' ? 'footsteps' : 'arrow-forward';
    return (
        <View className="mb-4">
            <View className="bg-card rounded-2xl p-4 border-l-4 border-[#F59E0B] border border-cardBorder">
                <View className="flex-row items-start">
                    <View className="w-10 h-10 rounded-full bg-[#F59E0B] items-center justify-center mr-3">
                        <Text className="text-black font-bold">{step.step}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-txt font-bold text-base leading-5 mb-1">{step.instruction}</Text>
                        <View className="flex-row items-center bg-surface rounded-lg px-2 py-1 self-start border border-cardBorder">
                            <Ionicons name={icon} size={14} color="#F59E0B" />
                            <Text className="text-txt text-xs ml-1">{step.roomName}</Text>
                        </View>
                    </View>
                </View>
            </View>
            {!isLast && <View className="items-center py-0.5"><Ionicons name="chevron-down" size={18} color="#F59E0B" /></View>}
        </View>
    );
}

export default function IndoorNavigationScreen() {
    const { buildingId } = useLocalSearchParams();
    const router = useRouter();
    const { isDark } = useColorScheme();
    const { t, i18n } = useTranslation();

    // ── Voice Navigation (ElevenLabs-backed, queue-based) ────────────────────
    const { speak, cancel: cancelVoice, reset: resetVoice } = useVoiceNavigation();

    // ── Tab state (NEW) ──────────────────────────────────────
    const [activeTab, setActiveTab] = useState('navigation'); // 'navigation' | 'smart'

    // ── Smart Assist state (NEW) ─────────────────────────────
    const [smartText, setSmartText] = useState('');
    const [smartFile, setSmartFile] = useState(null);
    const [smartMode, setSmartMode] = useState('input'); // 'input' | 'loading' | 'result'
    const [smartResult, setSmartResult] = useState(null);

    // ── Existing navigation state (UNCHANGED) ────────────────
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

    // ── Context-Aware Notifications state (NEW) ──────────────
    const [buildingInsights, setBuildingInsights] = useState({});
    const [activeInsight, setActiveInsight] = useState(null);
    const [insightHistory, setInsightHistory] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [navigating, setNavigating] = useState(false); // Navigation mode
    const notifAnim = useRef(new Animated.Value(0)).current;

    // ── Incident Routing state (NEW) ──────────────────
    const [showIncidents, setShowIncidents] = useState(false);
    const [activeIncidents, setActiveIncidents] = useState([]);
    const [routeAdjusted, setRouteAdjusted] = useState(false);
    const [routeFallback, setRouteFallback] = useState(false);
    const [routeIncidents, setRouteIncidents] = useState([]); // incidents affecting the current route



    // ── Map View state ─────────────────────────────────────────────────────
    const [mapFloor, setMapFloor] = useState(null);
    const [mapRooms, setMapRooms] = useState([]);
    const [mapConnections, setMapConnections] = useState([]);
    const [mapNavigating, setMapNavigating] = useState(false);
    const [mapStepIndex, setMapStepIndex] = useState(0);
    const mapStepRef = useRef(0);
    const mapTimerRef = useRef(null);
    const mapFloorRef = useRef(null);

    // UI tracking refs
    const navScrollViewRef = useRef(null);
    const smartScrollViewRef = useRef(null);


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
            Alert.alert(t('common.error'), err.message || t('indoor.not_found'));
        } finally {
            setLoading(false);
        }
    }, [buildingId]);

    // Load insights for the building
    const loadInsights = useCallback(async () => {
        try {
            const data = await getRoomInsights(null, buildingId);
            if (data.success) {
                setBuildingInsights(data.data);
            }
        } catch (err) {
            console.error('Failed to load insights:', err);
        }
    }, [buildingId]);

    // Load active incidents for the building
    const loadIncidents = useCallback(async () => {
        try {
            const data = await getActiveIncidents(buildingId);
            if (data.success) {
                setActiveIncidents(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load incidents:', err);
        }
    }, [buildingId]);

    // Load rooms for a floor
    const loadFloorRooms = async (floorId) => {
        try {
            const data = await fetchFloorRooms(floorId);
            setRooms(data);
        } catch (err) {
            Alert.alert(t('common.error'), t('indoor.loading'));
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
            Alert.alert(t('indoor.select_start'), `${t('indoor.from', { name: '' })} ${room.name}`);
        } else if (!endRoom) {
            setEndRoom(room);
            // Automatically find route
            findRouteToDestination(startRoom, room);
        } else {
            // Reset selection
            setStartRoom(room);
            setEndRoom(null);
            setRoute(null);
            Alert.alert(t('indoor.select_start'), `${t('indoor.from', { name: '' })} ${room.name}`);
        }
    };

    // Find route — uses incident-aware API first, falls back to normal routing
    const findRouteToDestination = async (from, to) => {
        try {
            let routeData;
            try {
                routeData = await getIncidentRoute(from.id, to.id, {
                    accessible: accessibleOnly,
                    buildingId,
                });
                setRouteAdjusted(routeData.adjusted || false);
                setRouteFallback(routeData.fallback || false);
                setRouteIncidents(routeData.incidents || []);
            } catch {
                // Fallback to normal routing if incident API unavailable
                routeData = await getRoute(from.id, to.id, accessibleOnly);
                setRouteAdjusted(false);
                setRouteFallback(false);
                setRouteIncidents([]);
            }

            if (!routeData.found) {
                Alert.alert(t('indoor.no_route'), routeData.message || t('indoor.no_route'));
                setEndRoom(null);
                return;
            }

            setRoute(routeData);
            const alertTitle = routeData.adjusted
                ? `⚠️ ${t('indoor.route_found')}`
                : (routeData.fallback ? `⚠️ ${t('indoor.no_route')}` : t('indoor.route_found'));

            const alertMsg = routeData.adjusted
                ? `Alternate route used due to: ${(routeData.incidents || []).map(i => i.type.replace('_', ' ')).join(', ')}\nDistance: ${routeData.distance.toFixed(1)}m`
                : (routeData.fallback
                    ? `Warning: Route includes closed areas because no alternative exists.\n${(routeData.incidents || []).map(i => i.message).join(' | ')}\nDistance: ${routeData.distance.toFixed(1)}m`
                    : `Distance: ${routeData.distance.toFixed(1)} meters\n${routeData.directions.length} steps`);

            Alert.alert(alertTitle, alertMsg);
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to calculate route');
            setEndRoom(null);
        }
    };

    // Handle step arrival (Proximity Trigger)
    const showInsight = (insight) => {
        setActiveInsight(insight);
        notifAnim.setValue(0);
        Animated.spring(notifAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
        setTimeout(() => {
            Animated.timing(notifAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setActiveInsight(current => (current?.title === insight.title ? null : current));
            });
        }, 6000);
    };

    const handleStepArrival = (index) => {
        setCurrentStepIndex(index);
        const step = route?.directions[index];
        if (!step) return;

        const roomInsightList = buildingInsights[step.roomId];
        if (roomInsightList && roomInsightList.length > 0) {
            const insight = roomInsightList[0];
            setInsightHistory(prev => {
                if (prev.find(h => h.title === insight.title)) return prev;
                return [insight, ...prev];
            });
            showInsight(insight);
        }
    };

    // ── Navigation Mode controls (additive, doesn't change routing logic) ──
    const startNavigating = () => {
        setNavigating(true);
        setCurrentStepIndex(0);

        if (route?.directions?.[0]) {
            speak(route.directions[0], i18n.language, true);
        }

        // Auto-trigger insight for first step
        if (route?.directions?.[0]) {
            const insights = buildingInsights[route.directions[0].roomId];
            if (insights?.length) showInsight(insights[0]);
        }
    };

    const goNextStep = () => {
        const nextIdx = currentStepIndex + 1;
        if (!route || nextIdx >= route.directions.length) {
            setNavigating(false);
            return;
        }
        setCurrentStepIndex(nextIdx);

        if (activeTab === 'navigation' && navScrollViewRef.current) {
            const scrollTarget = Math.max(0, nextIdx * 100 - 50);
            navScrollViewRef.current.scrollTo({ y: scrollTarget, animated: true });
        }

        if (route?.directions?.[nextIdx]) {
            speak(route.directions[nextIdx], i18n.language);
        }

        const insights = buildingInsights[route.directions[nextIdx]?.roomId];
        if (insights?.length) {
            const insight = insights[0];
            setInsightHistory(prev => prev.find(h => h.title === insight.title) ? prev : [insight, ...prev]);
            showInsight(insight);
        }
    };

    const stopNavigating = () => {
        setNavigating(false);
        setCurrentStepIndex(-1);
        setActiveInsight(null);
        cancelVoice(); // stop any ongoing audio immediately
    };

    // ── Map View helpers ────────────────────────────────────────────────────
    /** Load rooms + connections for the given floor into map state */
    const loadMapFloorData = async (floor) => {
        if (!floor) return;
        setMapFloor(floor);
        mapFloorRef.current = floor;   // keep ref in sync
        try {
            const [flRooms, flConns] = await Promise.all([
                fetchFloorRooms(floor.id),
                fetchFloorConnections(floor.id),
            ]);
            setMapRooms(flRooms);
            setMapConnections(flConns);
        } catch (err) {
            console.error('Map data load error:', err);
        }
    };

    /** Switch to map tab and load the floor that contains the route's start room */
    const openMapView = async () => {
        setActiveTab('map');
        // Find the floor containing the start room
        const startFloor = building?.floors?.find(
            f => rooms.some(r => r.id === startRoom?.id) || f.id === selectedFloor?.id
        ) || selectedFloor || building?.floors?.[0];
        await loadMapFloorData(startFloor);
    };

    /** Stop map auto-navigation: clears timer and cancels audio */
    const stopMapNavigation = () => {
        if (mapTimerRef.current) {
            clearTimeout(mapTimerRef.current);
            mapTimerRef.current = null;
        }
        setMapNavigating(false);
        cancelVoice(); // synchronous — stops audio immediately
    };

    /**
     * Start map auto-navigation.
     *
     * FIX summary (v2):
     * - cancel() is now synchronous (generation-counter based), so there is
     *   no async race between "stop old audio" and "start new audio".
     * - We do NOT call stopMapNavigation() here to avoid a double-cancel.
     *   Instead we inline the timer clear and call resetVoice() once.
     * - Steps are enqueued ONE AT A TIME as the visual timer ticks, not all
     *   upfront. This prevents stale items if the route is reset mid-play.
     *   The audio queue still ensures each step plays to completion before
     *   the next begins.
     * - The visual timer is kept at 4s — enough for typical TTS sentences.
     *   Audio continues playing even if visual advances early (queue runs
     *   independently).
     */
    const startMapNavigation = () => {
        const dirs = route?.directions || [];
        if (!dirs.length) return;

        // 1. Clear visual timer (don't call stopMapNavigation — avoids double-cancel)
        if (mapTimerRef.current) {
            clearTimeout(mapTimerRef.current);
            mapTimerRef.current = null;
        }
        setMapNavigating(false);

        // 2. Reset audio: synchronous cancel + dedup key clear
        resetVoice();

        // 3. Initialize
        mapStepRef.current = 0;
        setMapStepIndex(0);
        setMapNavigating(true);

        // 4. Speak step 0 immediately after reset (cancel is now sync — no race)
        if (dirs[0]) speak(dirs[0], i18n.language, true /* force: skip dedup */);

        // 5. Visual progression: advance map highlight every 4s
        //    Each tick also enqueues the NEXT audio step.
        //    The queue ensures step N audio waits for step N-1 to finish.
        const scheduleNextVisualStep = () => {
            const currentIdx = mapStepRef.current;
            if (currentIdx >= dirs.length - 1) {
                setMapNavigating(false);
                setMapStepIndex(dirs.length - 1);
                mapTimerRef.current = null;
                return;
            }

            mapTimerRef.current = setTimeout(() => {
                mapStepRef.current += 1;
                const nextIdx = mapStepRef.current;
                setMapStepIndex(nextIdx);

                if (dirs[nextIdx]) {
                    // Enqueue next step — queue plays it after current finishes
                    speak(dirs[nextIdx], i18n.language);

                    // Auto-switch floor if step is on a different floor
                    const stepFloor = building?.floors?.find(
                        f => f.floor_number === dirs[nextIdx].floorNumber
                    );
                    if (stepFloor && stepFloor.id !== mapFloorRef.current?.id) {
                        loadMapFloorData(stepFloor);
                    }
                }

                scheduleNextVisualStep();
            }, 4000); // 4s per visual step — gives typical TTS time to finish
        };

        scheduleNextVisualStep();
    };

    const resetNavigation = () => {
        stopMapNavigation(); // also calls cancelVoice() internally
        resetVoice();        // drain queue + reset dedup key for clean start
        setMapStepIndex(0);
        setStartRoom(null);
        setEndRoom(null);
        setRoute(null);
        setSearchQuery('');
        setSearchMode(false);
        setSearchResults([]);
        setRouteAdjusted(false);
        setRouteFallback(false);
        setRouteIncidents([]);
        setNavigating(false);
        setCurrentStepIndex(-1);
    };


    // ── Smart Assist handlers (NEW) ─────────────────────────
    const pickSmartDocument = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain', 'image/*'],
                copyToCacheDirectory: false,
            });
            if (!res.canceled && res.assets?.length) {
                setSmartFile(res.assets[0]);
                setSmartText('');
            }
        } catch {
            Alert.alert(t('common.error'), t('common.error'));
        }
    };

    const runSmartAnalysis = useCallback(async () => {
        if (!smartText.trim() && !smartFile) {
            Alert.alert(t('common.error'), t('indoor.describe_needs'));
            return;
        }
        setSmartMode('loading');
        try {
            // Use SERVER_ROOT (auto-detected from BASE_URL) so this works on Android without manual IP
            const formData = new FormData();
            formData.append('building_id', buildingId);
            if (smartFile) {
                if (Platform.OS === 'web' && smartFile.file instanceof File) {
                    formData.append('file', smartFile.file, smartFile.name);
                } else if (Platform.OS === 'web' && smartFile.uri?.startsWith('blob:')) {
                    const blobRes = await fetch(smartFile.uri);
                    const blob = await blobRes.blob();
                    formData.append('file', new File([blob], smartFile.name, { type: smartFile.mimeType || blob.type || 'text/plain' }));
                } else {
                    formData.append('file', { uri: smartFile.uri, name: smartFile.name, type: smartFile.mimeType || 'application/pdf' });
                }
            } else {
                formData.append('text', smartText);
            }
            const response = await fetch(`${SERVER_ROOT}/api/navigation/analyze-document`, { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok) { setSmartResult(data); setSmartMode('result'); }
            else throw new Error(data.error || 'Analysis failed');
        } catch (err) {
            Alert.alert(t('common.error'), err.message || t('indoor.analyzing'));
            setSmartMode('input');
        }
    }, [smartText, smartFile, buildingId, t]);

    const resetSmart = () => { setSmartMode('input'); setSmartResult(null); setSmartText(''); setSmartFile(null); };

    useEffect(() => {
        loadBuilding();
        loadInsights();
        loadIncidents();
    }, [loadBuilding, loadInsights, loadIncidents]);

    // Cleanup map timer on unmount
    useEffect(() => () => { if (mapTimerRef.current) clearTimeout(mapTimerRef.current); }, []);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center">
                <ActivityIndicator size="large" color="#00D4AA" />
                <Text className="text-txtMuted mt-4">{t('indoor.loading')}</Text>
            </SafeAreaView>
        );
    }

    if (!building) {
        return (
            <SafeAreaView className="flex-1 bg-main items-center justify-center p-6">
                <Ionicons name="business-outline" size={64} color="#6B7280" />
                <Text className="text-txt text-xl font-bold mt-4">{t('indoor.not_found')}</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-6">
                    <Text className="text-[#00D4AA] font-bold">{t('indoor.go_back')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-main">
            {/* Header */}
            <View className="px-5 pt-4 border-b border-cardBorder">
                <View className="flex-row items-center mb-3">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color={activeTab === 'smart' ? '#F59E0B' : activeTab === 'map' ? '#3B82F6' : '#00D4AA'} />

                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-txt text-xl font-bold">{building.name}</Text>
                        <View className="flex-row items-center mt-1 flex-wrap gap-2">
                            <View className="bg-[#00D4AA]/10 px-2 py-0.5 rounded-md border border-[#00D4AA]/30">
                                <Text className="text-[#00D4AA] text-[10px] font-bold uppercase tracking-wider">{t('indoor.demo_tag')}</Text>
                            </View>
                            {building.campus && (
                                <Text className="text-txtMuted text-sm">{building.campus}</Text>
                            )}
                        </View>
                    </View>
                    {activeTab === 'smart' && smartMode === 'result' && (
                        <TouchableOpacity onPress={resetSmart} className="bg-surface px-3 py-1 rounded-full border border-cardBorder">
                            <Text className="text-txtMuted text-xs font-bold">{t('indoor.reset')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Tab Bar ── */}
                <View className="flex-row mb-1 bg-card rounded-2xl p-1 border border-cardBorder">
                    <TouchableOpacity
                        onPress={() => setActiveTab('navigation')}
                        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1 ${activeTab === 'navigation' ? 'bg-[#00D4AA]' : ''}`}
                    >

                        <Ionicons name="map-outline" size={14} color={activeTab === 'navigation' ? '#0A0F1E' : '#9CA3AF'} />
                        <Text className={`font-bold text-xs ${activeTab === 'navigation' ? 'text-[#0A0F1E]' : 'text-txtMuted'}`}>Navigation</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { setActiveTab('map'); if (!mapFloor) openMapView(); }}
                        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1 ${activeTab === 'map' ? 'bg-[#3B82F6]' : ''}`}
                    >
                        <Ionicons name="navigate-circle-outline" size={14} color={activeTab === 'map' ? '#FFFFFF' : '#9CA3AF'} />
                        <Text className={`font-bold text-xs ${activeTab === 'map' ? 'text-white' : 'text-txtMuted'}`}>Map View</Text>

                    </TouchableOpacity >
                    <TouchableOpacity
                        onPress={() => setActiveTab('smart')}
                        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1 ${activeTab === 'smart' ? 'bg-[#F59E0B]' : ''}`}
                    >

                        <Ionicons name="sparkles-outline" size={14} color={activeTab === 'smart' ? '#0A0F1E' : '#9CA3AF'} />
                        <Text className={`font-bold text-xs ${activeTab === 'smart' ? 'text-[#0A0F1E]' : 'text-txtMuted'}`}>Smart Assist</Text>

                    </TouchableOpacity >
                </View >

                {/* ── Incident Alert Banner (Toggleable) ── */}
                {
                    (activeIncidents.length > 0 || routeAdjusted || routeFallback) && (
                        <View>
                            <TouchableOpacity
                                onPress={() => setShowIncidents(!showIncidents)}
                                activeOpacity={0.8}
                                className="mt-2 mb-1 rounded-2xl px-4 py-3 flex-row items-center"
                                style={{
                                    backgroundColor: (routeAdjusted || routeFallback) ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
                                    borderWidth: 1,
                                    borderColor: (routeAdjusted || routeFallback) ? '#EF4444' : '#F59E0B',
                                }}
                            >
                                <Ionicons
                                    name={(routeAdjusted || routeFallback) ? 'warning' : 'alert-circle-outline'}
                                    size={18}
                                    color={(routeAdjusted || routeFallback) ? '#EF4444' : '#F59E0B'}
                                />
                                <View className="flex-1 ml-3">
                                    {(routeAdjusted || routeFallback) ? (
                                        <>
                                            <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>
                                                {routeFallback ? '⚠️ Route Affected by Incident' : 'Route Adjusted'}
                                            </Text>
                                            <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>
                                                {routeIncidents.map(i => i.message).join(' • ')}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 13 }}>
                                                {activeIncidents.length} Active Incident{activeIncidents.length !== 1 ? 's' : ''}
                                            </Text>
                                            <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>
                                                {activeIncidents[0]?.message}
                                            </Text>
                                        </>
                                    )}
                                </View>
                                <View className="items-center justify-center rounded-full w-8 h-8 ml-2 bg-surface">
                                    <Ionicons name={showIncidents ? 'chevron-up' : 'chevron-down'} size={18} color={(routeAdjusted || routeFallback) ? '#EF4444' : '#F59E0B'} />
                                </View>
                            </TouchableOpacity>

                            {/* Collapsible Incident List */}
                            {showIncidents && activeIncidents.length > 0 && (
                                <View className="mt-2 bg-surface border border-cardBorder rounded-2xl p-3">
                                    {activeIncidents.map((inc, idx) => (
                                        <View
                                            key={idx}
                                            className="rounded-xl p-4 mb-3 flex-row items-start border border-cardBorder"
                                            style={{
                                                backgroundColor: '#1A2035',
                                                borderLeftWidth: 4,
                                                borderLeftColor: inc.severity === 'high' ? '#EF4444' : inc.severity === 'medium' ? '#F59E0B' : '#6B7280',
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 4,
                                                elevation: 3
                                            }}
                                        >
                                            <Ionicons
                                                name={inc.type === 'lift_down' ? 'arrow-up-circle' : inc.type === 'room_closed' ? 'lock-closed' : inc.type === 'blocked_path' ? 'close-circle' : 'construct'}
                                                size={22}
                                                color={inc.severity === 'high' ? '#EF4444' : inc.severity === 'medium' ? '#F59E0B' : '#9CA3AF'}
                                                style={{ marginTop: 1 }}
                                            />
                                            <View className="flex-1 ml-4">
                                                <Text style={{
                                                    color: inc.severity === 'high' ? '#EF4444' : inc.severity === 'medium' ? '#F59E0B' : 'white',
                                                    fontWeight: '800',
                                                    fontSize: 14,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5
                                                }}>
                                                    {inc.type.replace(/_/g, ' ')}
                                                    {inc.room_name ? ` • ${inc.room_name}` : ''}
                                                </Text>
                                                <Text style={{ color: '#E5E7EB', fontSize: 12, marginTop: 4, lineHeight: 18, fontWeight: '500' }}>{inc.message}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )
                }

                {/* ── Navigation tab: Search + Route Controls ── */}
                {
                    activeTab === 'navigation' && (<>

                        {/* Search Bar */}
                        <View className="bg-surface rounded-xl px-4 py-3 flex-row items-center border border-cardBorder mt-2">
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-txt"
                                placeholder={t('indoor.search_placeholder')}
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
                                            {!startRoom ? t('indoor.select_start') : !endRoom ? t('indoor.select_dest') : t('indoor.route_found')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={resetNavigation} className="bg-[#EF4444] px-3 py-1.5 rounded-lg">
                                        <Text className="text-white font-bold text-xs">{t('indoor.reset')}</Text>
                                    </TouchableOpacity>
                                </View>
                                {startRoom && (
                                    <View className="flex-row items-center mb-1">
                                        <Ionicons name="location" size={14} color="#00D4AA" />
                                        <Text className="text-txt text-sm font-semibold ml-2">{t('indoor.from', { name: startRoom.name })}</Text>
                                    </View>
                                )}
                                {endRoom && (
                                    <View className="flex-row items-center">
                                        <Ionicons name="flag" size={14} color="#00D4AA" />
                                        <Text className="text-txt text-sm font-semibold ml-2">{t('indoor.to', { name: endRoom.name })}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </>)
                }
            </View >

            {/* Floor Selector — Navigation tab only */}
            {
                activeTab === 'navigation' && !searchMode && building.floors && building.floors.length > 0 && (
                    <View className="bg-main border-b border-cardBorder">
                        <Text className="text-txtMuted text-xs font-bold uppercase tracking-wider px-5 pt-3">{t('indoor.select_floor')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 py-3">
                            {building.floors.map((floor) => (
                                <TouchableOpacity
                                    key={floor.id}
                                    onPress={() => changeFloor(floor)}
                                    className={`px-6 py-3 rounded-2xl mr-3 border ${selectedFloor?.id === floor.id
                                        ? 'bg-[#00D4AA] border-[#00D4AA]'
                                        : 'bg-card border-cardBorder'
                                        }`}
                                    style={selectedFloor?.id === floor.id ? {
                                        shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.5, shadowRadius: 8, elevation: 5
                                    } : {}}
                                >
                                    <Text className={`font-bold text-base ${selectedFloor?.id === floor.id ? 'text-[#0A0F1E]' : 'text-txt'
                                        }`}>
                                        {floor.name || t('indoor.floor', { number: floor.floor_number })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )
            }

            {/* ════════ TAB CONTENT ════════ */}

            {/* ── NAVIGATION TAB (existing UI, fully intact) ── */}
            {
                activeTab === 'navigation' && (
                    <ScrollView ref={navScrollViewRef} className="flex-1 px-5 py-4">
                        {route ? (
                            <View>
                                <View className="bg-card rounded-2xl p-5 mb-5 border border-cardBorder">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-[#00D4AA] text-sm font-bold uppercase tracking-wider mb-1">{t('indoor.turn_by_turn')}</Text>
                                            <Text className="text-txt text-2xl font-bold">{t('indoor.directions')}</Text>
                                        </View>
                                        <View className="items-end">
                                            <View className="bg-[#00D4AA] px-4 py-2.5 rounded-full">
                                                <Text className="text-[#0A0F1E] font-bold text-lg">{route.distance.toFixed(0)}m</Text>
                                            </View>
                                            <Text className="text-txtMuted text-xs mt-1">{t('indoor.total_distance')}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* ── Navigation Mode Controls ─────────────────── */}
                                {!navigating ? (

                                    <View className="mb-5" style={{ gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={startNavigating}
                                            className="bg-[#00D4AA] rounded-2xl py-3 flex-row items-center justify-center"
                                            style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}
                                        >
                                            <Ionicons name="navigate" size={18} color="#0A0F1E" />
                                            <Text className="text-[#0A0F1E] font-bold text-base ml-2">▶ Start Navigation</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={openMapView}
                                            className="bg-[#1D3461] rounded-2xl py-3 flex-row items-center justify-center"
                                            style={{ borderWidth: 1.5, borderColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 }}
                                        >
                                            <Ionicons name="navigate-circle-outline" size={18} color="#3B82F6" />
                                            <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>🗺️ View on Map</Text>
                                        </TouchableOpacity>
                                    </View>

                                ) : (
                                    <View className="flex-row mb-5" style={{ gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={stopNavigating}
                                            className="flex-1 bg-surface border border-cardBorder rounded-2xl py-3 items-center"
                                        >
                                            <Text className="text-txtMuted font-bold text-sm">✕ {t('indoor.stop_nav')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={goNextStep}
                                            className="flex-[2] bg-[#00D4AA] rounded-2xl py-3 items-center"
                                            style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}
                                        >
                                            <Text className="text-[#0A0F1E] font-bold text-base">
                                                {currentStepIndex >= route.directions.length - 1 ? `✓ ${t('indoor.arrived')}` : `${t('indoor.next_step')} →`}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}


                                {/* Direction steps or Visual Path */}
                                {!navigating ? (
                                    route.directions.map((step, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => handleStepArrival(idx)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={{ opacity: currentStepIndex === -1 ? 1 : currentStepIndex === idx ? 1 : 0.6 }}>
                                                <DirectionStep step={step} isLast={idx === route.directions.length - 1} />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View className="flex-1 py-8">
                                        <ZeroReadOverlayUI
                                            currentStep={route.directions[currentStepIndex] || route.directions[0]}
                                            totalSteps={route.directions.length}
                                            currentIndex={currentStepIndex === -1 ? 0 : currentStepIndex}
                                        />
                                    </View>
                                )}
                                <View className="bg-[#10B981]/10 rounded-2xl p-4 border border-[#10B981]/30 mt-4">
                                    <View className="flex-row items-center justify-center">
                                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                        <Text className="text-[#10B981] font-bold text-lg ml-2">{t('indoor.arrived')}</Text>
                                    </View>
                                </View>
                            </View>
                        ) : searchMode && searchResults.length > 0 ? (
                            <View>
                                <Text className="text-txtMuted text-sm mb-3">
                                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                                </Text>
                                {searchResults.map((room) => (
                                    <RoomCard key={room.id} room={room} onPress={selectRoom}
                                        isSelected={startRoom?.id === room.id || endRoom?.id === room.id} />
                                ))}
                            </View>
                        ) : searchMode ? (
                            <View className="items-center justify-center py-12">
                                <Ionicons name="search-outline" size={48} color="#6B7280" />
                                <Text className="text-txtMuted mt-4">{t('common.no_results')}</Text>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-txtMuted text-sm mb-3">
                                    {rooms.length} room{rooms.length !== 1 ? 's' : ''} on this floor
                                </Text>
                                {rooms.map((room) => (
                                    <RoomCard key={room.id} room={room} onPress={selectRoom}
                                        isSelected={startRoom?.id === room.id || endRoom?.id === room.id} />
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )
            }

            {/* ════════ MAP VIEW TAB ════════ */}
            {
                activeTab === 'map' && (
                    <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>

                        {/* Floor selector */}
                        {building?.floors?.length > 0 && (
                            <MapFloorSelector
                                floors={building.floors}
                                activeFloor={mapFloor}
                                onFloorChange={loadMapFloorData}
                            />
                        )}

                        {/* Route status banner */}
                        {route && (
                            <View
                                style={{
                                    backgroundColor: '#0F2240',
                                    borderRadius: 16,
                                    padding: 14,
                                    marginBottom: 14,
                                    borderWidth: 1,
                                    borderColor: '#3B82F6',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Ionicons name="git-branch-outline" size={20} color="#3B82F6" />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={{ color: '#93C5FD', fontWeight: '800', fontSize: 13 }}>
                                        {startRoom?.name} → {endRoom?.name}
                                    </Text>
                                    <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>
                                        {route.distance?.toFixed(0)}m · {route.directions?.length} steps
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: '#3B82F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>ROUTE</Text>
                                </View>
                            </View>
                        )}

                        {/* Map */}
                        <IndoorMapView
                            rooms={mapRooms}
                            connections={mapConnections}
                            routeRoomIds={(route?.path || []).filter(id => mapRooms.some(r => r.id === id))}
                            startRoomId={startRoom?.id}
                            endRoomId={endRoom?.id}
                            userRoomId={route?.directions?.[mapStepIndex]?.roomId}
                        />

                        {/* Current step card */}
                        {route?.directions?.[mapStepIndex] && (
                            <View
                                style={{
                                    backgroundColor: '#111827',
                                    borderRadius: 20,
                                    padding: 16,
                                    marginTop: 16,
                                    borderLeftWidth: 4,
                                    borderLeftColor: mapNavigating ? '#22C55E' : '#3B82F6',
                                    borderWidth: 1,
                                    borderColor: '#1F2937',
                                }}
                            >
                                <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                                    Step {mapStepIndex + 1} of {route.directions.length}
                                </Text>
                                <Text style={{ color: '#F3F4F6', fontWeight: '700', fontSize: 16, lineHeight: 22 }}>
                                    {route.directions[mapStepIndex].instruction}
                                </Text>
                                {route.directions[mapStepIndex].floorNumber !== undefined && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                        <Ionicons name="layers-outline" size={13} color="#6B7280" />
                                        <Text style={{ color: '#6B7280', fontSize: 12, marginLeft: 4 }}>
                                            Floor {route.directions[mapStepIndex].floorNumber}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* No route placeholder */}
                        {!route && (
                            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                                <Ionicons name="navigate-circle-outline" size={52} color="#374151" />
                                <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 16, marginTop: 12 }}>No route yet</Text>
                                <Text style={{ color: '#4B5563', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 24 }}>
                                    Go to Navigation tab, set start &amp; destination, then tap View on Map.
                                </Text>
                            </View>
                        )}

                        {/* Map navigation controls */}
                        {route && (
                            <View style={{ flexDirection: 'row', marginTop: 16, marginBottom: 24, gap: 10 }}>
                                {!mapNavigating ? (
                                    <TouchableOpacity
                                        onPress={startMapNavigation}
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#22C55E',
                                            borderRadius: 18,
                                            paddingVertical: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#22C55E',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.45,
                                            shadowRadius: 10,
                                            elevation: 6,
                                        }}
                                    >
                                        <Ionicons name="play" size={18} color="#fff" />
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 }}>Start Map Nav</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={stopMapNavigation}
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#374151',
                                            borderRadius: 18,
                                            paddingVertical: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="stop" size={18} color="#fff" />
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 }}>■ Stop</Text>
                                    </TouchableOpacity>
                                )}
                                {/* Manual step controls */}
                                <TouchableOpacity
                                    onPress={() => {
                                        const prev = Math.max(0, mapStepIndex - 1);
                                        setMapStepIndex(prev);
                                        mapStepRef.current = prev;
                                        // cancel() is now sync — cancel then speak immediately
                                        if (route?.directions?.[prev]) {
                                            cancelVoice();
                                            speak(route.directions[prev], i18n.language, true);
                                        }
                                    }}
                                    style={{ backgroundColor: '#1F2937', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, justifyContent: 'center', borderWidth: 1, borderColor: '#374151' }}
                                >
                                    <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        const next = Math.min((route?.directions?.length || 1) - 1, mapStepIndex + 1);
                                        setMapStepIndex(next);
                                        mapStepRef.current = next;
                                        // cancel() is now sync — cancel then speak immediately
                                        if (route?.directions?.[next]) {
                                            cancelVoice();
                                            speak(route.directions[next], i18n.language, true);
                                        }
                                    }}
                                    style={{ backgroundColor: '#1F2937', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, justifyContent: 'center', borderWidth: 1, borderColor: '#374151' }}
                                >
                                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        )}

                    </ScrollView>
                )
            }

            {/* ── SMART ASSIST TAB (NEW) ── */}
            {
                activeTab === 'smart' && (
                    <ScrollView ref={smartScrollViewRef} className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>

                        {/* Incident List — removed to avoid duplication with global dropdown */}

                        {smartMode === 'input' && (
                            <View>
                                {/* Improved Info Banner */}
                                <View className="bg-[#1D2B44] border-l-4 border-[#3B82F6] rounded-xl p-5 mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
                                    <View className="flex-row items-center mb-2">
                                        <View className="bg-[#3B82F6]/20 p-2 rounded-full mr-3">
                                            <Ionicons name="sparkles" size={20} color="#60A5FA" />
                                        </View>
                                        <Text className="text-white font-bold text-base flex-1">{t('indoor.smart_assist_tab')}</Text>
                                    </View>
                                    <Text className="text-[#9CA3AF] text-sm leading-5">
                                        Describe your visit or upload a document — we'll automatically extract your needs and map your exact navigation route.
                                    </Text>
                                </View>

                                {/* Text Input */}
                                <Text className="text-txt font-bold mb-2">{t('indoor.describe_needs')}</Text>
                                <TextInput
                                    className="bg-surface border border-cardBorder rounded-2xl p-4 text-txt mb-4"
                                    style={{ minHeight: 100, textAlignVertical: 'top' }}
                                    placeholder={t('indoor.describe_needs')}
                                    placeholderTextColor="#6B7280"
                                    multiline
                                    value={smartText}
                                    onChangeText={setSmartText}
                                />

                                {/* Divider */}
                                <View className="flex-row items-center mb-5">
                                    <View className="flex-1 h-px bg-cardBorder" />
                                    <Text className="text-txtMuted mx-3 text-xs">OR</Text>
                                    <View className="flex-1 h-px bg-cardBorder" />
                                </View>

                                {/* Upload Area */}
                                <TouchableOpacity
                                    onPress={pickSmartDocument}
                                    className="bg-card border-2 border-dashed border-cardBorder rounded-2xl p-6 items-center mb-5"
                                >
                                    <Ionicons name="cloud-upload-outline" size={36} color={smartFile ? '#F59E0B' : '#6B7280'} />
                                    <Text className="text-txt font-semibold mt-2">
                                        {smartFile ? smartFile.name : t('indoor.another_route')}
                                    </Text>
                                    <Text className="text-txtMuted text-xs mt-1">PDF, TXT, or Image (max 5MB)</Text>
                                </TouchableOpacity>

                                {/* Generate Button */}
                                <TouchableOpacity
                                    onPress={runSmartAnalysis}
                                    className="bg-[#F59E0B] rounded-2xl py-4 items-center flex-row justify-center gap-2"
                                    style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="sparkles-outline" size={20} color="#000" />
                                    <Text className="text-black font-bold text-base">{t('indoor.generate_route')}</Text>
                                </TouchableOpacity>

                                <View className="flex-row items-center justify-center mt-4">
                                    <Ionicons name="shield-checkmark-outline" size={12} color="#4B5563" />
                                    <Text className="text-[#4B5563] text-xs ml-1">Documents are never stored. Analysis is temporary.</Text>
                                </View>
                            </View>
                        )}

                        {smartMode === 'loading' && (
                            <View className="items-center py-20">
                                <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4 border border-cardBorder">
                                    <ActivityIndicator size="large" color="#F59E0B" />
                                </View>
                                <Text className="text-txt font-bold text-lg">{t('indoor.analyzing')}</Text>
                                <Text className="text-txtMuted text-sm mt-1">{t('indoor.loading')}</Text>
                            </View>
                        )}

                        {smartMode === 'result' && smartResult && (
                            <View>
                                {smartResult.found ? (
                                    <>
                                        {/* Intents */}
                                        {smartResult.intents?.length > 0 && (
                                            <View className="bg-card rounded-2xl p-4 mb-4 border border-cardBorder">
                                                <View className="flex-row items-center mb-2">
                                                    <Ionicons name="sparkles" size={16} color="#F59E0B" />
                                                    <Text className="text-[#F59E0B] font-bold text-sm ml-2 uppercase tracking-wider">{t('indoor.detected_needs')}</Text>
                                                </View>
                                                <View className="flex-row flex-wrap">
                                                    {smartResult.intents.map((intent, i) => (
                                                        <View key={i} className="bg-[#F59E0B]/15 px-3 py-1 rounded-full mr-2 mb-2">
                                                            <Text className="text-[#FDE68A] text-xs font-semibold capitalize">{typeof intent === 'string' ? intent : intent.intent}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Visit Order */}
                                        {smartResult.steps?.length > 0 && (
                                            <View className="mb-4">
                                                <Text className="text-txtMuted text-xs font-semibold uppercase tracking-wider mb-2">{t('indoor.visit_order')}</Text>
                                                <View className="flex-row flex-wrap">
                                                    {smartResult.steps.map((step, i) => (
                                                        <View key={i} className="flex-row items-center bg-card rounded-full px-3 py-1.5 mr-2 mb-2 border border-cardBorder">
                                                            <View className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mr-1.5" />
                                                            <Text className="text-txt text-xs font-semibold">{step.name}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Route Summary */}
                                        <View className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-3xl p-5 mb-4">
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1">
                                                    <Text className="text-[#F59E0B] text-xs font-bold uppercase tracking-wider mb-1">{t('indoor.auto_route')}</Text>
                                                    <Text className="text-txt text-lg font-bold">{smartResult.route.from?.name} → {smartResult.route.to?.name}</Text>
                                                    <Text className="text-txtMuted text-xs mt-1">{smartResult.steps?.length} stops</Text>
                                                </View>
                                                <View className="items-end">
                                                    <View className="bg-[#F59E0B] px-4 py-2 rounded-full">
                                                        <Text className="text-black font-bold text-lg">{smartResult.route.totalDistance?.toFixed(0)}m</Text>
                                                    </View>
                                                    <Text className="text-txtMuted text-xs mt-1">{t('indoor.total_distance')}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Directions with Navigation Mode */}
                                        <Text className="text-txtMuted text-xs font-semibold uppercase tracking-wider mb-3">Step-by-Step Directions</Text>

                                        {/* Start Navigation for Smart Assist route */}
                                        {!navigating ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setNavigating(true);
                                                    setCurrentStepIndex(0);

                                                    if (smartResult.route?.directions?.[0]) {
                                                        speak(smartResult.route.directions[0], i18n.language, true);
                                                    }

                                                    // Fire insight for first step if available
                                                    if (smartResult.route?.directions?.[0]?.roomId) {
                                                        const ins = buildingInsights[smartResult.route.directions[0].roomId];
                                                        if (ins?.length) { setInsightHistory(p => p.find(h => h.title === ins[0].title) ? p : [ins[0], ...p]); showInsight(ins[0]); }
                                                    }
                                                }}
                                                className="mb-4 bg-[#F59E0B] rounded-2xl py-3 flex-row items-center justify-center"
                                                style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}
                                            >
                                                <Ionicons name="navigate" size={18} color="#000" />
                                                <Text className="text-black font-bold text-base ml-2">▶ {t('indoor.start_nav')}</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View className="flex-row mb-4" style={{ gap: 10 }}>
                                                <TouchableOpacity onPress={stopNavigating} className="flex-1 bg-surface border border-cardBorder rounded-2xl py-3 items-center">
                                                    <Text className="text-txtMuted font-bold text-sm">✕ {t('indoor.stop_nav')}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const dirs = smartResult.route?.directions || [];
                                                        const nextIdx = currentStepIndex + 1;
                                                        if (nextIdx >= dirs.length) { setNavigating(false); return; }
                                                        setCurrentStepIndex(nextIdx);

                                                        if (smartScrollViewRef.current) {
                                                            const scrollTarget = Math.max(0, nextIdx * 100 - 50);
                                                            smartScrollViewRef.current.scrollTo({ y: scrollTarget, animated: true });
                                                        }

                                                        if (dirs[nextIdx]) {
                                                            speak(dirs[nextIdx], i18n.language);
                                                        }

                                                        if (dirs[nextIdx]?.roomId) {
                                                            const ins = buildingInsights[dirs[nextIdx].roomId];
                                                            if (ins?.length) { setInsightHistory(p => p.find(h => h.title === ins[0].title) ? p : [ins[0], ...p]); showInsight(ins[0]); }
                                                        }
                                                    }}
                                                    className="flex-[2] bg-[#F59E0B] rounded-2xl py-3 items-center"
                                                    style={{ shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}
                                                >
                                                    <Text className="text-black font-bold text-base">
                                                        {currentStepIndex >= (smartResult.route?.directions?.length ?? 0) - 1 ? `✓ ${t('indoor.arrived')}` : `${t('indoor.next_step')} →`}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Smart Direction steps or Visual Path */}
                                        {!navigating ? (
                                            smartResult.route.directions.map((step, i) => (
                                                <View key={i} style={{ opacity: 1 }}>
                                                    <SmartDirectionStep step={step} isLast={i === smartResult.route.directions.length - 1} />
                                                </View>
                                            ))
                                        ) : (
                                            <View className="flex-1 py-4">
                                                <ZeroReadOverlayUI
                                                    currentStep={smartResult.route.directions[currentStepIndex] || smartResult.route.directions[0]}
                                                    totalSteps={smartResult.route.directions.length}
                                                    currentIndex={currentStepIndex === -1 ? 0 : currentStepIndex}
                                                />
                                            </View>
                                        )}

                                        <View className="bg-[#10B981]/15 border border-[#10B981]/40 rounded-2xl p-4 mb-4 flex-row items-center justify-center">
                                            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                            <Text className="text-[#10B981] font-bold text-base ml-2">{t('indoor.route_ready')}</Text>
                                        </View>

                                        {/* Reset Button to generate another route */}
                                        <TouchableOpacity
                                            onPress={resetSmart}
                                            className="mb-8 border border-[#374151] bg-[#1A2035] rounded-2xl py-3 flex-row items-center justify-center"
                                        >
                                            <Ionicons name="refresh-outline" size={18} color="#9CA3AF" />
                                            <Text className="text-[#9CA3AF] font-bold text-base ml-2">{t('indoor.another_route')}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View className="items-center py-10">
                                        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center mb-4 border border-cardBorder">
                                            <Ionicons name="warning-outline" size={32} color="#F59E0B" />
                                        </View>
                                        <Text className="text-txt text-xl font-bold text-center">{t('indoor.no_route')}</Text>
                                        <Text className="text-txtMuted text-sm mt-2 text-center px-6 leading-5">{smartResult.message}</Text>
                                        <TouchableOpacity onPress={resetSmart} className="mt-8 bg-surface border border-cardBorder px-8 py-3 rounded-2xl">
                                            <Text className="text-txt font-bold">{t('common.try_again')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                )
            }

            {/* Smart Assist Tab - History Integration */}
            {
                activeTab === 'smart' && insightHistory.length > 0 && (
                    <View className="px-5 pb-6">
                        <View className="flex-row items-center mb-3 mt-4">
                            <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                            <Text className="text-[#9CA3AF] text-sm font-bold ml-2 uppercase tracking-tight">Recent Discovery Log</Text>
                        </View>
                        {insightHistory.map((item, idx) => (
                            <View key={idx} className="bg-[#1A2035] rounded-2xl p-4 mb-3 border-l-4 border-[#00D4AA]">
                                <Text className="text-white font-bold text-sm">{item.title}</Text>
                                <Text className="text-[#9CA3AF] text-xs mt-1">{item.description}</Text>
                            </View>
                        ))}
                    </View>
                )
            }

            {/* Context Notification Overlay — absolute floating card */}
            {
                activeTab === 'navigation' && activeInsight && (
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                bottom: 24,
                                left: 20,
                                right: 20,
                                zIndex: 999,
                                opacity: notifAnim,
                                transform: [{
                                    translateY: notifAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] })
                                }]
                            }
                        ]}
                    >
                        <View style={{
                            backgroundColor: activeInsight.type === 'impact' ? '#00D4AA' : activeInsight.type === 'alert' ? '#EF4444' : '#F59E0B',
                            borderRadius: 24,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 12 },
                            shadowOpacity: 0.5,
                            shadowRadius: 20,
                            elevation: 15,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons
                                    name={activeInsight.type === 'impact' ? 'rocket' : activeInsight.type === 'alert' ? 'warning' : 'information-circle'}
                                    size={24} color="white"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#0A0F1E', fontWeight: '900', fontSize: 16, lineHeight: 20 }}>{activeInsight.title}</Text>
                                <Text style={{ color: 'rgba(10,15,30,0.8)', fontSize: 13, marginTop: 2, fontWeight: '600' }}>{activeInsight.description}</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setActiveInsight(null); }} style={{ padding: 4 }}>
                                <Ionicons name="close-circle" size={24} color="rgba(10,15,30,0.5)" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )
            }
        </SafeAreaView >
    );
}
