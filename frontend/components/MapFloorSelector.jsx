/**
 * components/MapFloorSelector.jsx
 * Horizontal scrolling floor tab bar for the Map View.
 */
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';

export default function MapFloorSelector({ floors, activeFloor, onFloorChange }) {
    if (!floors || floors.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {floors.map((floor) => {
                    const isActive = activeFloor?.id === floor.id;
                    return (
                        <TouchableOpacity
                            key={floor.id}
                            onPress={() => onFloorChange(floor)}
                            activeOpacity={0.75}
                            style={[styles.tab, isActive && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {floor.name || `Floor ${floor.floor_number}`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 4,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#2D3548',
        backgroundColor: '#111827',
    },
    tabActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    tabText: {
        color: '#9CA3AF',
        fontWeight: '700',
        fontSize: 13,
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
});
